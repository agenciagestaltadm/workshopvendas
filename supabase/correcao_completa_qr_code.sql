-- ============================================================
-- CORREÇÃO COMPLETA: QR Code + Certificado
-- Rode este SQL INTEIRO no SQL Editor do Supabase
-- ============================================================

-- 0. Garantir que as colunas existem
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS hours_label TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;

-- 1. Garantir que enable_qr_code existe em site_settings
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS enable_qr_code BOOLEAN DEFAULT false;
UPDATE public.site_settings SET enable_qr_code = false WHERE enable_qr_code IS NULL;

-- 2. Garantir colunas de QR code em registration_courses
ALTER TABLE public.registration_courses ADD COLUMN IF NOT EXISTS qr_code TEXT;
ALTER TABLE public.registration_courses ADD COLUMN IF NOT EXISTS scanned BOOLEAN DEFAULT false;
ALTER TABLE public.registration_courses ADD COLUMN IF NOT EXISTS scanned_at TIMESTAMPTZ;

-- 3. ATIVAR QR Code (esta é a linha mais importante!)
UPDATE public.site_settings SET enable_qr_code = true WHERE id = 'default';

-- 4. Recriar a função generate_qr_codes_for_registration (com verificação de enable_qr_code)
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

-- 5. Recriar a função validate_and_scan_qr_code
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

-- 6. Recriar a função get_certificates_by_document
DROP FUNCTION IF EXISTS public.get_certificates_by_document(p_document TEXT);
CREATE OR REPLACE FUNCTION public.get_certificates_by_document(p_document TEXT)
RETURNS TABLE (
  registration_id UUID,
  participant_name TEXT,
  course_id UUID,
  course_name TEXT,
  course_starts_at TIMESTAMPTZ,
  course_ends_at TIMESTAMPTZ,
  hours_label TEXT,
  qr_code TEXT,
  scanned BOOLEAN,
  certificate_enabled BOOLEAN
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
    r.id AS registration_id,
    r.name AS participant_name,
    c.id AS course_id,
    c.name AS course_name,
    c.starts_at AS course_starts_at,
    c.ends_at AS course_ends_at,
    COALESCE(c.hours_label, (SELECT hours_label FROM public.site_settings WHERE id = 'default'), '8h') AS hours_label,
    rc.qr_code,
    COALESCE(rc.scanned, false) AS scanned,
    v_cert_enabled AS certificate_enabled
  FROM public.registrations r
  JOIN public.registration_courses rc ON rc.registration_id = r.id
  JOIN public.courses c ON c.id = rc.course_id
  WHERE r.document = p_document
  ORDER BY c.starts_at;
END;
$$;

-- 7. Recriar update_site_settings (com enable_qr_code)
DROP FUNCTION IF EXISTS public.update_site_settings(p_payload JSONB);
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

-- 8. Recriar get_all_courses_admin (com hours_label e ends_at)
DROP FUNCTION IF EXISTS public.get_all_courses_admin();
CREATE OR REPLACE FUNCTION public.get_all_courses_admin()
RETURNS TABLE (
    course_id TEXT,
    name TEXT,
    category TEXT,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    capacity INTEGER,
    is_active BOOLEAN,
    filled BIGINT,
    remaining BIGINT,
    description TEXT,
    facilitator TEXT,
    time_label TEXT,
    location TEXT,
    image_path TEXT,
    hours_label TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT
        c.id::TEXT as course_id,
        c.name,
        c.category,
        c.starts_at,
        c.ends_at,
        c.capacity,
        c.is_active,
        COUNT(rc.id) as filled,
        GREATEST(0, c.capacity - COUNT(rc.id)) as remaining,
        COALESCE(c.description, '') as description,
        COALESCE(c.facilitator, '') as facilitator,
        COALESCE(c.time_label, to_char(c.starts_at AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI')) as time_label,
        COALESCE(c.location, 'Sebrae - Parauapebas') as location,
        c.image_path,
        c.hours_label
    FROM public.courses c
    LEFT JOIN public.registration_courses rc ON c.id = rc.course_id
    GROUP BY
      c.id,
      c.name,
      c.category,
      c.starts_at,
      c.ends_at,
      c.capacity,
      c.is_active,
      c.description,
      c.facilitator,
      c.time_label,
      c.location,
      c.image_path,
      c.hours_label
    ORDER BY c.starts_at;
$$;

-- 9. Gerar QR codes retroativamente para inscrições que já existem sem QR code
UPDATE public.registration_courses
SET qr_code = 'QR-' || encode(gen_random_bytes(12), 'hex')
WHERE qr_code IS NULL;

-- 10. Verificação final
SELECT 
  'enable_qr_code' AS campo,
  enable_qr_code::TEXT AS valor
FROM public.site_settings WHERE id = 'default'
UNION ALL
SELECT 
  'qr_codes_gerados' AS campo,
  (SELECT COUNT(*)::TEXT FROM public.registration_courses WHERE qr_code IS NOT NULL) AS valor
UNION ALL
SELECT 
  'total_inscricoes' AS campo,
  (SELECT COUNT(*)::TEXT FROM public.registration_courses) AS valor;
