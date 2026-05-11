-- Sistema de QR Code e Certificado

-- 1. Adicionar flag enable_qr_code nas site_settings
ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS enable_qr_code BOOLEAN DEFAULT false;

UPDATE public.site_settings
SET enable_qr_code = false
WHERE enable_qr_code IS NULL;

-- 2. Adicionar coluna hours_label na tabela courses (necessária para certificado)
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS hours_label TEXT;

-- 3. Adicionar colunas de QR Code na tabela registration_courses
ALTER TABLE public.registration_courses
ADD COLUMN IF NOT EXISTS qr_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS is_scanned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS scanned_at TIMESTAMPTZ;

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_registration_courses_qr_code
  ON public.registration_courses(qr_code);

CREATE INDEX IF NOT EXISTS idx_registration_courses_scanned
  ON public.registration_courses(is_scanned)
  WHERE is_scanned = true;

-- 5. RPC para gerar QR codes únicos para uma inscrição
DROP FUNCTION IF EXISTS public.generate_qr_codes_for_registration(p_registration_id UUID);
CREATE OR REPLACE FUNCTION public.generate_qr_codes_for_registration(p_registration_id UUID)
RETURNS TABLE (
  result_course_id TEXT,
  result_qr_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_course_id TEXT;
  v_qr_code TEXT;
BEGIN
  -- Verificar se QR Code está ativado nas configurações
  IF NOT EXISTS (
    SELECT 1 FROM public.site_settings 
    WHERE id = 'default' AND COALESCE(enable_qr_code, false) = true
  ) THEN
    -- Retornar QR codes existentes mesmo se desativado
    RETURN QUERY
    SELECT rc.course_id::TEXT, rc.qr_code
    FROM public.registration_courses rc
    WHERE rc.registration_id = p_registration_id
      AND rc.qr_code IS NOT NULL;
    RETURN;
  END IF;

  -- Gerar novos QR codes para cursos que ainda não têm
  FOR v_course_id IN
    SELECT rc.course_id
    FROM public.registration_courses rc
    WHERE rc.registration_id = p_registration_id
      AND rc.qr_code IS NULL
  LOOP
    v_qr_code := 'QR-' || encode(gen_random_bytes(12), 'hex');
    
    UPDATE public.registration_courses
    SET qr_code = v_qr_code
    WHERE registration_id = p_registration_id
      AND course_id = v_course_id;
    
    result_course_id := v_course_id;
    result_qr_code := v_qr_code;
    RETURN NEXT;
  END LOOP;
  
  -- Retornar todos os QR codes existentes para esta inscrição
  RETURN QUERY
  SELECT rc.course_id::TEXT, rc.qr_code
  FROM public.registration_courses rc
  WHERE rc.registration_id = p_registration_id
    AND rc.qr_code IS NOT NULL;
END;
$$;

-- 6. RPC para validar e escanear QR code (uso único)
DROP FUNCTION IF EXISTS public.validate_and_scan_qr_code(p_qr_code TEXT);
CREATE OR REPLACE FUNCTION public.validate_and_scan_qr_code(p_qr_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rc RECORD;
  v_registration RECORD;
  v_course RECORD;
BEGIN
  -- Buscar o registration_courses pelo QR code
  SELECT rc.*
  INTO v_rc
  FROM public.registration_courses rc
  WHERE rc.qr_code = p_qr_code
  LIMIT 1;
  
  IF v_rc IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'NOT_FOUND',
      'message', 'QR Code não encontrado. Verifique se o código está correto.'
    );
  END IF;
  
  IF v_rc.scanned = true THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'ALREADY_SCANNED',
      'message', 'Este QR Code já foi utilizado em ' || COALESCE(v_rc.scanned_at::TEXT, 'data desconhecida') || '.',
      'scanned_at', v_rc.scanned_at
    );
  END IF;
  
  -- Buscar dados da inscrição e curso
  SELECT r.id, r.name, r.email, r.phone, r.document
  INTO v_registration
  FROM public.registrations r
  WHERE r.id = v_rc.registration_id;
  
  SELECT c.name, c.starts_at, c.time_label
  INTO v_course
  FROM public.courses c
  WHERE c.id = v_rc.course_id;
  
  -- Marcar como escaneado
  UPDATE public.registration_courses
  SET scanned = true, scanned_at = NOW()
  WHERE id = v_rc.id;
  
  RETURN jsonb_build_object(
    'valid', true,
    'message', 'Acesso liberado!',
    'registration_id', v_registration.id,
    'course_id', v_rc.course_id,
    'name', v_registration.name,
    'email', v_registration.email,
    'phone', v_registration.phone,
    'document', v_registration.document,
    'course_name', v_course.name,
    'course_starts_at', v_course.starts_at,
    'course_time_label', v_course.time_label
  );
END;
$$;

-- 7. RPC para buscar certificados por documento (CPF/CNPJ)
DROP FUNCTION IF EXISTS public.get_certificates_by_document(p_document TEXT);
CREATE OR REPLACE FUNCTION public.get_certificates_by_document(p_document TEXT)
RETURNS TABLE (
  result_registration_id TEXT,
  result_participant_name TEXT,
  result_course_id TEXT,
  result_course_name TEXT,
  result_course_starts_at TIMESTAMPTZ,
  result_course_ends_at TIMESTAMPTZ,
  result_hours_label TEXT,
  result_qr_code TEXT,
  result_scanned BOOLEAN,
  result_certificate_enabled BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cert_enabled BOOLEAN;
BEGIN
  SELECT COALESCE(enable_qr_code, false) INTO v_cert_enabled
  FROM public.site_settings WHERE id = 'default';

  IF NOT v_cert_enabled THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    r.id::TEXT AS registration_id,
    r.name AS participant_name,
    c.id::TEXT AS course_id,
    c.name AS course_name,
    c.starts_at AS course_starts_at,
    c.ends_at AS course_ends_at,
    COALESCE(c.hours_label, (SELECT ss.hours_label FROM public.site_settings ss WHERE ss.id = 'default'), '8h') AS hours_label,
    rc.qr_code AS qr_code,
    COALESCE(rc.scanned, false) AS scanned,
    v_cert_enabled AS certificate_enabled
  FROM public.registrations r
  JOIN public.registration_courses rc ON rc.registration_id = r.id
  JOIN public.courses c ON c.id = rc.course_id
  WHERE r.document = p_document
  ORDER BY c.starts_at;
END;
$$;

-- 8. RPC para buscar dados da inscrição por documento (para certificado)
DROP FUNCTION IF EXISTS public.get_registration_by_document(p_document TEXT);
CREATE OR REPLACE FUNCTION public.get_registration_by_document(p_document TEXT)
RETURNS TABLE (
  registration_id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  document TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id AS registration_id,
    r.name,
    r.email,
    r.phone,
    r.document,
    r.created_at
  FROM public.registrations r
  WHERE r.document = p_document
  LIMIT 1;
END;
$$;

-- 9. Atualizar get_site_settings para incluir enable_qr_code
CREATE OR REPLACE FUNCTION public.get_site_settings()
RETURNS public.site_settings
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT *
  FROM public.site_settings
  WHERE id = 'default'
  LIMIT 1;
$$;

-- 10. Atualizar update_site_settings para aceitar enable_qr_code
CREATE OR REPLACE FUNCTION public.update_site_settings(p_payload JSONB)
RETURNS public.site_settings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result public.site_settings;
BEGIN
  IF auth.email() IS DISTINCT FROM 'admgestalt@gmail.com' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  UPDATE public.site_settings
  SET
    favicon_path = COALESCE(p_payload->>'favicon_path', favicon_path),
    logo_main_path = COALESCE(p_payload->>'logo_main_path', logo_main_path),
    logo_nav_path = COALESCE(p_payload->>'logo_nav_path', logo_nav_path),
    headline = COALESCE(p_payload->>'headline', headline),
    subheadline = COALESCE(p_payload->>'subheadline', subheadline),
    cta_primary_label = COALESCE(p_payload->>'cta_primary_label', cta_primary_label),
    cta_primary_url = COALESCE(p_payload->>'cta_primary_url', cta_primary_url),
    hours_label = COALESCE(p_payload->>'hours_label', hours_label),
    seo_title = COALESCE(p_payload->>'seo_title', seo_title),
    seo_description = COALESCE(p_payload->>'seo_description', seo_description),
    theme_primary = COALESCE(p_payload->>'theme_primary', theme_primary),
    theme_secondary = COALESCE(p_payload->>'theme_secondary', theme_secondary),
    theme_accent = COALESCE(p_payload->>'theme_accent', theme_accent),
    theme_background = COALESCE(p_payload->>'theme_background', theme_background),
    theme_foreground = COALESCE(p_payload->>'theme_foreground', theme_foreground),
    enable_qr_code = COALESCE((p_payload->>'enable_qr_code')::BOOLEAN, enable_qr_code),
    updated_at = NOW()
  WHERE id = 'default'
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

-- 11. Comentários
COMMENT ON FUNCTION public.generate_qr_codes_for_registration IS 'Gera QR codes únicos para cada curso de uma inscrição';
COMMENT ON FUNCTION public.validate_and_scan_qr_code IS 'Valida um QR code e marca como escaneado (uso único)';
COMMENT ON FUNCTION public.get_certificates_by_document IS 'Busca cursos concluídos por documento para emissão de certificado';
