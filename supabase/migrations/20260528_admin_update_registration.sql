-- RPC administrativa para editar inscrição existente (dados, cursos e campos personalizados)

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.admin_update_registration(
  p_registration_id UUID,
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_document TEXT,
  p_course_ids TEXT[],
  p_custom_answers JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_course_id TEXT;
  v_course_exists BOOLEAN;
  v_course_active BOOLEAN;
  v_has_vacancy BOOLEAN;
  v_already_registered BOOLEAN;
  v_course_name TEXT;
  v_pair RECORD;
  v_qr_enabled BOOLEAN;
  v_qr_code TEXT;
  v_email_normalized TEXT;
  v_is_new_link BOOLEAN;
BEGIN
  IF auth.email() IS DISTINCT FROM 'admgestalt@gmail.com' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_registration_id IS NULL THEN
    RAISE EXCEPTION 'REGISTRATION_NOT_FOUND: Inscricao nao encontrada';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.registrations WHERE id = p_registration_id) THEN
    RAISE EXCEPTION 'REGISTRATION_NOT_FOUND: Inscricao nao encontrada';
  END IF;

  IF p_name IS NULL OR length(trim(p_name)) < 2 THEN
    RAISE EXCEPTION 'INVALID_NAME: Nome invalido';
  END IF;

  IF p_email IS NULL OR position('@' in p_email) = 0 THEN
    RAISE EXCEPTION 'INVALID_EMAIL: Email invalido';
  END IF;

  IF p_course_ids IS NULL OR array_length(p_course_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'NO_COURSES_SELECTED: Selecione pelo menos um curso';
  END IF;

  v_email_normalized := lower(trim(p_email));

  FOREACH v_course_id IN ARRAY p_course_ids
  LOOP
    SELECT EXISTS(SELECT 1 FROM public.courses WHERE id = v_course_id) INTO v_course_exists;
    IF NOT v_course_exists THEN
      RAISE EXCEPTION 'COURSE_NOT_FOUND: Curso nao encontrado: %', v_course_id;
    END IF;

    SELECT EXISTS(
      SELECT 1
      FROM public.registration_courses
      WHERE registration_id = p_registration_id
        AND course_id = v_course_id
    ) INTO v_is_new_link;

    IF NOT v_is_new_link THEN
      SELECT is_active, name
      INTO v_course_active, v_course_name
      FROM public.courses
      WHERE id = v_course_id;

      IF NOT COALESCE(v_course_active, false) THEN
        RAISE EXCEPTION 'COURSE_INACTIVE: As inscricoes para o curso "%" estao pausadas', v_course_name;
      END IF;

      SELECT (
        (SELECT capacity FROM public.courses WHERE id = v_course_id) >
        COALESCE((SELECT COUNT(*) FROM public.registration_courses WHERE course_id = v_course_id), 0)
      ) INTO v_has_vacancy;

      IF NOT v_has_vacancy THEN
        RAISE EXCEPTION 'NO_VACANCIES: O curso "%" esta com vagas esgotadas', v_course_name;
      END IF;
    END IF;

    SELECT EXISTS(
      SELECT 1
      FROM public.registrations r
      JOIN public.registration_courses rc ON r.id = rc.registration_id
      WHERE r.email = v_email_normalized
        AND rc.course_id = v_course_id
        AND r.id <> p_registration_id
    ) INTO v_already_registered;

    IF v_already_registered THEN
      SELECT name INTO v_course_name FROM public.courses WHERE id = v_course_id;
      RAISE EXCEPTION 'DUPLICATE_REGISTRATION: Ja existe inscricao neste curso para: %', v_course_name;
    END IF;
  END LOOP;

  UPDATE public.registrations
  SET
    name = trim(p_name),
    email = v_email_normalized,
    phone = trim(p_phone),
    document = p_document
  WHERE id = p_registration_id;

  DELETE FROM public.registration_courses
  WHERE registration_id = p_registration_id
    AND NOT (course_id = ANY(p_course_ids));

  SELECT COALESCE(enable_qr_code, false)
  INTO v_qr_enabled
  FROM public.site_settings
  WHERE id = 'default';

  FOREACH v_course_id IN ARRAY p_course_ids
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.registration_courses
      WHERE registration_id = p_registration_id
        AND course_id = v_course_id
    ) THEN
      INSERT INTO public.registration_courses (registration_id, course_id)
      VALUES (p_registration_id, v_course_id);

      IF v_qr_enabled THEN
        v_qr_code := 'QR-' || encode(gen_random_bytes(12), 'hex');

        UPDATE public.registration_courses
        SET
          qr_code = v_qr_code,
          scanned = false,
          is_scanned = false,
          scanned_at = NULL
        WHERE registration_id = p_registration_id
          AND course_id = v_course_id;
      END IF;
    END IF;
  END LOOP;

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
      VALUES (p_registration_id, v_pair.key, v_pair.value)
      ON CONFLICT (registration_id, field_key)
      DO UPDATE SET value_json = EXCLUDED.value_json;
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_registration(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT[], JSONB
) TO authenticated;

COMMENT ON FUNCTION public.admin_update_registration IS
  'Atualiza inscricao existente pelo admin: dados do participante, diff de cursos e respostas dinamicas';
