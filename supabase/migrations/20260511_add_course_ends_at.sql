-- Adicionar horário de término do curso para controle de liberação de certificado

-- 1. Adicionar coluna ends_at na tabela courses
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;

-- 1b. Garantir que hours_label existe na tabela courses
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS hours_label TEXT;

-- 2. Atualizar função get_course_availability para retornar ends_at
DROP FUNCTION IF EXISTS public.get_course_availability();
CREATE OR REPLACE FUNCTION public.get_course_availability()
RETURNS TABLE (
    course_id TEXT,
    name TEXT,
    category TEXT,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    capacity INTEGER,
    filled BIGINT,
    remaining BIGINT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        c.id as course_id,
        c.name,
        c.category,
        c.starts_at,
        c.ends_at,
        c.capacity,
        COUNT(rc.id) as filled,
        GREATEST(0, c.capacity - COUNT(rc.id)) as remaining
    FROM public.courses c
    LEFT JOIN public.registration_courses rc ON c.id = rc.course_id
    WHERE c.is_active = TRUE
    GROUP BY c.id, c.name, c.category, c.starts_at, c.ends_at, c.capacity
    ORDER BY c.starts_at;
$$;

-- 3. Atualizar função get_all_courses_admin para retornar ends_at
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
        c.id as course_id,
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

-- 4. Atualizar função get_certificates_by_document para retornar ends_at
DROP FUNCTION IF EXISTS public.get_certificates_by_document(p_document TEXT);
CREATE OR REPLACE FUNCTION public.get_certificates_by_document(p_document TEXT)
RETURNS TABLE (
  registration_id UUID,
  name TEXT,
  email TEXT,
  course_id TEXT,
  course_name TEXT,
  course_starts_at TIMESTAMPTZ,
  course_ends_at TIMESTAMPTZ,
  course_time_label TEXT,
  course_hours_label TEXT,
  is_scanned BOOLEAN,
  scanned_at TIMESTAMPTZ,
  qr_code TEXT
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
    rc.course_id,
    c.name AS course_name,
    c.starts_at AS course_starts_at,
    c.ends_at AS course_ends_at,
    c.time_label AS course_time_label,
    COALESCE(c.hours_label, '8h') AS course_hours_label,
    rc.is_scanned,
    rc.scanned_at,
    rc.qr_code
  FROM public.registrations r
  JOIN public.registration_courses rc ON r.id = rc.registration_id
  JOIN public.courses c ON rc.course_id = c.id
  WHERE r.document = p_document
    AND rc.is_scanned = true
  ORDER BY c.starts_at ASC;
END;
$$;
