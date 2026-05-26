-- RPC administrativa para criar inscrição manual com validações do formulário público

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.registration_courses
  ADD COLUMN IF NOT EXISTS scanned BOOLEAN DEFAULT false;

CREATE OR REPLACE FUNCTION public.admin_create_manual_registration(
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_document TEXT,
  p_course_id TEXT,
  p_custom_answers JSONB DEFAULT '{}'::jsonb,
  p_qr_already_scanned BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_registration_id UUID;
  v_course_exists BOOLEAN;
  v_course_active BOOLEAN;
  v_has_vacancy BOOLEAN;
  v_already_registered BOOLEAN;
  v_course_name TEXT;
  v_pair RECORD;
  v_qr_enabled BOOLEAN;
  v_qr_code TEXT;
BEGIN
  IF auth.email() IS DISTINCT FROM 'admgestalt@gmail.com' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_name IS NULL OR length(trim(p_name)) < 2 THEN
    RAISE EXCEPTION 'INVALID_NAME: Nome invalido';
  END IF;

  IF p_email IS NULL OR position('@' in p_email) = 0 THEN
    RAISE EXCEPTION 'INVALID_EMAIL: Email invalido';
  END IF;

  IF p_course_id IS NULL OR trim(p_course_id) = '' THEN
    RAISE EXCEPTION 'NO_COURSES_SELECTED: Selecione um curso';
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.courses WHERE id = p_course_id) INTO v_course_exists;
  IF NOT v_course_exists THEN
    RAISE EXCEPTION 'COURSE_NOT_FOUND: Curso nao encontrado: %', p_course_id;
  END IF;

  SELECT is_active, name
  INTO v_course_active, v_course_name
  FROM public.courses
  WHERE id = p_course_id;

  IF NOT COALESCE(v_course_active, false) THEN
    RAISE EXCEPTION 'COURSE_INACTIVE: As inscricoes para o curso "%" estao pausadas', v_course_name;
  END IF;

  SELECT EXISTS(
    SELECT 1
    FROM public.registrations r
    JOIN public.registration_courses rc ON r.id = rc.registration_id
    WHERE r.email = lower(trim(p_email))
      AND rc.course_id = p_course_id
  ) INTO v_already_registered;

  IF v_already_registered THEN
    RAISE EXCEPTION 'DUPLICATE_REGISTRATION: Ja existe inscricao neste curso para: %', v_course_name;
  END IF;

  SELECT (
    (SELECT capacity FROM public.courses WHERE id = p_course_id) >
    COALESCE((SELECT COUNT(*) FROM public.registration_courses WHERE course_id = p_course_id), 0)
  ) INTO v_has_vacancy;

  IF NOT v_has_vacancy THEN
    RAISE EXCEPTION 'NO_VACANCIES: O curso "%" esta com vagas esgotadas', v_course_name;
  END IF;

  INSERT INTO public.registrations (name, email, phone, document)
  VALUES (trim(p_name), lower(trim(p_email)), trim(p_phone), p_document)
  RETURNING id INTO v_registration_id;

  INSERT INTO public.registration_courses (registration_id, course_id)
  VALUES (v_registration_id, p_course_id);

  FOR v_pair IN
    SELECT key, value
    FROM jsonb_each(COALESCE(p_custom_answers, '{}'::jsonb))
  LOOP
    IF EXISTS (
      SELECT 1
      FROM public.registration_form_fields rf
      WHERE rf.field_key = v_pair.key
        AND rf.is_active = true
    ) THEN
      INSERT INTO public.registration_field_answers (registration_id, field_key, value_json)
      VALUES (v_registration_id, v_pair.key, v_pair.value)
      ON CONFLICT (registration_id, field_key)
      DO UPDATE SET value_json = EXCLUDED.value_json;
    END IF;
  END LOOP;

  SELECT COALESCE(enable_qr_code, false)
  INTO v_qr_enabled
  FROM public.site_settings
  WHERE id = 'default';

  IF v_qr_enabled THEN
    v_qr_code := 'QR-' || encode(gen_random_bytes(12), 'hex');

    UPDATE public.registration_courses
    SET
      qr_code = v_qr_code,
      scanned = COALESCE(p_qr_already_scanned, false),
      is_scanned = COALESCE(p_qr_already_scanned, false),
      scanned_at = CASE WHEN COALESCE(p_qr_already_scanned, false) THEN NOW() ELSE NULL END
    WHERE registration_id = v_registration_id
      AND course_id = p_course_id;
  END IF;

  RETURN v_registration_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_manual_registration(
  TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, BOOLEAN
) TO authenticated;

COMMENT ON FUNCTION public.admin_create_manual_registration IS
  'Cria inscricao manual pelo admin com validacao de vaga, curso ativo e opcao de QR ja escaneado';
