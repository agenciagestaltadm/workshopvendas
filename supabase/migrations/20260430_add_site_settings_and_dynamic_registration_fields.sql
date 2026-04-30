-- Configuracoes globais do site e campos dinamicos de inscricao

-- Site settings (single row: id = 'default')
CREATE TABLE IF NOT EXISTS public.site_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  favicon_path TEXT,
  logo_main_path TEXT,
  logo_nav_path TEXT,
  headline TEXT,
  subheadline TEXT,
  cta_primary_label TEXT,
  cta_primary_url TEXT,
  hours_label TEXT,
  theme_primary TEXT DEFAULT '#3b82f6',
  theme_secondary TEXT DEFAULT '#eff6ff',
  theme_accent TEXT DEFAULT '#2563eb',
  theme_background TEXT DEFAULT '#ffffff',
  theme_foreground TEXT DEFAULT '#334155',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.site_settings (
  id,
  headline,
  subheadline,
  cta_primary_label,
  cta_primary_url,
  hours_label
)
VALUES (
  'default',
  'Inscreva-se Agora',
  'Uma experiencia unica de aprendizado em gastronomia.',
  'Inscreva-se Agora',
  '/registro',
  '8h por curso'
)
ON CONFLICT (id) DO NOTHING;

-- Dynamic registration fields
CREATE TABLE IF NOT EXISTS public.registration_form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  is_required BOOLEAN NOT NULL DEFAULT false,
  placeholder TEXT,
  options_json JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.registration_field_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL REFERENCES public.registration_form_fields(field_key) ON DELETE CASCADE,
  value_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (registration_id, field_key)
);

CREATE INDEX IF NOT EXISTS idx_registration_form_fields_active_order
  ON public.registration_form_fields(is_active, sort_order, created_at);

CREATE INDEX IF NOT EXISTS idx_registration_field_answers_registration_id
  ON public.registration_field_answers(registration_id);

-- Storage bucket for logos/favicon
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-assets', 'site-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Site assets are publicly readable" ON storage.objects;
CREATE POLICY "Site assets are publicly readable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'site-assets');

DROP POLICY IF EXISTS "Admin can upload site assets" ON storage.objects;
CREATE POLICY "Admin can upload site assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'site-assets' AND auth.email() = 'admgestalt@gmail.com');

DROP POLICY IF EXISTS "Admin can update site assets" ON storage.objects;
CREATE POLICY "Admin can update site assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'site-assets' AND auth.email() = 'admgestalt@gmail.com')
WITH CHECK (bucket_id = 'site-assets' AND auth.email() = 'admgestalt@gmail.com');

DROP POLICY IF EXISTS "Admin can delete site assets" ON storage.objects;
CREATE POLICY "Admin can delete site assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'site-assets' AND auth.email() = 'admgestalt@gmail.com');

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_field_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read site settings" ON public.site_settings;
CREATE POLICY "Public can read site settings"
ON public.site_settings
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admin can write site settings" ON public.site_settings;
CREATE POLICY "Admin can write site settings"
ON public.site_settings
FOR ALL
TO authenticated
USING (auth.email() = 'admgestalt@gmail.com')
WITH CHECK (auth.email() = 'admgestalt@gmail.com');

DROP POLICY IF EXISTS "Public can read active registration form fields" ON public.registration_form_fields;
CREATE POLICY "Public can read active registration form fields"
ON public.registration_form_fields
FOR SELECT
USING (is_active = true OR auth.email() = 'admgestalt@gmail.com');

DROP POLICY IF EXISTS "Admin can manage registration form fields" ON public.registration_form_fields;
CREATE POLICY "Admin can manage registration form fields"
ON public.registration_form_fields
FOR ALL
TO authenticated
USING (auth.email() = 'admgestalt@gmail.com')
WITH CHECK (auth.email() = 'admgestalt@gmail.com');

DROP POLICY IF EXISTS "Admin can read registration field answers" ON public.registration_field_answers;
CREATE POLICY "Admin can read registration field answers"
ON public.registration_field_answers
FOR SELECT
TO authenticated
USING (auth.email() = 'admgestalt@gmail.com');

DROP POLICY IF EXISTS "Register RPC can insert field answers" ON public.registration_field_answers;
CREATE POLICY "Register RPC can insert field answers"
ON public.registration_field_answers
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

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

CREATE OR REPLACE FUNCTION public.get_registration_form_fields()
RETURNS TABLE (
  id UUID,
  field_key TEXT,
  label TEXT,
  field_type TEXT,
  is_required BOOLEAN,
  placeholder TEXT,
  options_json JSONB,
  sort_order INTEGER,
  is_active BOOLEAN
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT
    rf.id,
    rf.field_key,
    rf.label,
    rf.field_type,
    rf.is_required,
    rf.placeholder,
    rf.options_json,
    rf.sort_order,
    rf.is_active
  FROM public.registration_form_fields rf
  WHERE rf.is_active = true
  ORDER BY rf.sort_order ASC, rf.created_at ASC;
$$;

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
    theme_primary = COALESCE(p_payload->>'theme_primary', theme_primary),
    theme_secondary = COALESCE(p_payload->>'theme_secondary', theme_secondary),
    theme_accent = COALESCE(p_payload->>'theme_accent', theme_accent),
    theme_background = COALESCE(p_payload->>'theme_background', theme_background),
    theme_foreground = COALESCE(p_payload->>'theme_foreground', theme_foreground),
    updated_at = NOW()
  WHERE id = 'default'
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_registration_form_field(
  p_id UUID,
  p_field_key TEXT,
  p_label TEXT,
  p_field_type TEXT,
  p_is_required BOOLEAN,
  p_placeholder TEXT,
  p_options_json JSONB,
  p_sort_order INTEGER,
  p_is_active BOOLEAN
)
RETURNS public.registration_form_fields
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result public.registration_form_fields;
BEGIN
  IF auth.email() IS DISTINCT FROM 'admgestalt@gmail.com' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.registration_form_fields (
      field_key, label, field_type, is_required, placeholder, options_json, sort_order, is_active
    )
    VALUES (
      p_field_key, p_label, p_field_type, p_is_required, p_placeholder, p_options_json, p_sort_order, p_is_active
    )
    RETURNING * INTO v_result;
  ELSE
    UPDATE public.registration_form_fields
    SET
      field_key = p_field_key,
      label = p_label,
      field_type = p_field_type,
      is_required = p_is_required,
      placeholder = p_placeholder,
      options_json = p_options_json,
      sort_order = p_sort_order,
      is_active = p_is_active,
      updated_at = NOW()
    WHERE id = p_id
    RETURNING * INTO v_result;
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_registration_form_field(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.email() IS DISTINCT FROM 'admgestalt@gmail.com' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  DELETE FROM public.registration_form_fields WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_participant_with_courses_v2(
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_document TEXT,
  p_course_ids TEXT[],
  p_custom_answers JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_registration_id UUID;
  v_course_id TEXT;
  v_course_exists BOOLEAN;
  v_has_vacancy BOOLEAN;
  v_already_registered BOOLEAN;
  v_course_name TEXT;
  v_pair RECORD;
BEGIN
  IF p_name IS NULL OR length(trim(p_name)) < 2 THEN
    RAISE EXCEPTION 'INVALID_NAME: Nome invalido';
  END IF;

  IF p_email IS NULL OR position('@' in p_email) = 0 THEN
    RAISE EXCEPTION 'INVALID_EMAIL: Email invalido';
  END IF;

  IF p_course_ids IS NULL OR array_length(p_course_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'NO_COURSES_SELECTED: Selecione pelo menos um curso';
  END IF;

  FOREACH v_course_id IN ARRAY p_course_ids LOOP
    SELECT EXISTS(SELECT 1 FROM public.courses WHERE id = v_course_id) INTO v_course_exists;
    IF NOT v_course_exists THEN
      RAISE EXCEPTION 'COURSE_NOT_FOUND: Curso nao encontrado: %', v_course_id;
    END IF;

    SELECT name INTO v_course_name FROM public.courses WHERE id = v_course_id;

    SELECT EXISTS(
      SELECT 1
      FROM public.registrations r
      JOIN public.registration_courses rc ON r.id = rc.registration_id
      WHERE r.email = lower(trim(p_email))
        AND rc.course_id = v_course_id
    ) INTO v_already_registered;

    IF v_already_registered THEN
      RAISE EXCEPTION 'DUPLICATE_REGISTRATION: Voce ja esta inscrito no curso: %', v_course_name;
    END IF;

    SELECT (
      (SELECT capacity FROM public.courses WHERE id = v_course_id) >
      COALESCE((SELECT COUNT(*) FROM public.registration_courses WHERE course_id = v_course_id), 0)
    ) INTO v_has_vacancy;

    IF NOT v_has_vacancy THEN
      RAISE EXCEPTION 'NO_VACANCIES: O curso "%" esta com vagas esgotadas', v_course_name;
    END IF;
  END LOOP;

  INSERT INTO public.registrations (name, email, phone, document)
  VALUES (trim(p_name), lower(trim(p_email)), trim(p_phone), p_document)
  RETURNING id INTO v_registration_id;

  FOREACH v_course_id IN ARRAY p_course_ids LOOP
    INSERT INTO public.registration_courses (registration_id, course_id)
    VALUES (v_registration_id, v_course_id);
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
      VALUES (v_registration_id, v_pair.key, v_pair.value)
      ON CONFLICT (registration_id, field_key)
      DO UPDATE SET value_json = EXCLUDED.value_json;
    END IF;
  END LOOP;

  RETURN v_registration_id;
END;
$$;
