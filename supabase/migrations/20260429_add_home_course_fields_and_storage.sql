-- Campos extras para exibir cursos dinâmicos na Home
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS facilitator TEXT,
ADD COLUMN IF NOT EXISTS time_label TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS image_path TEXT;

-- Backfill para evitar campos nulos na UI
UPDATE public.courses
SET
  description = COALESCE(description, ''),
  facilitator = COALESCE(facilitator, ''),
  time_label = COALESCE(time_label, to_char(starts_at AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI')),
  location = COALESCE(location, 'Sebrae - Parauapebas')
WHERE
  description IS NULL
  OR facilitator IS NULL
  OR time_label IS NULL
  OR location IS NULL;

-- Atualiza função do admin para retornar metadados completos do card
DROP FUNCTION IF EXISTS public.get_all_courses_admin();

CREATE OR REPLACE FUNCTION public.get_all_courses_admin()
RETURNS TABLE (
    course_id TEXT,
    name TEXT,
    category TEXT,
    starts_at TIMESTAMPTZ,
    capacity INTEGER,
    is_active BOOLEAN,
    filled BIGINT,
    remaining BIGINT,
    description TEXT,
    facilitator TEXT,
    time_label TEXT,
    location TEXT,
    image_path TEXT
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
        c.capacity,
        c.is_active,
        COUNT(rc.id) as filled,
        GREATEST(0, c.capacity - COUNT(rc.id)) as remaining,
        COALESCE(c.description, '') as description,
        COALESCE(c.facilitator, '') as facilitator,
        COALESCE(c.time_label, to_char(c.starts_at AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI')) as time_label,
        COALESCE(c.location, 'Sebrae - Parauapebas') as location,
        c.image_path
    FROM public.courses c
    LEFT JOIN public.registration_courses rc ON c.id = rc.course_id
    GROUP BY
      c.id,
      c.name,
      c.category,
      c.starts_at,
      c.capacity,
      c.is_active,
      c.description,
      c.facilitator,
      c.time_label,
      c.location,
      c.image_path
    ORDER BY c.starts_at;
$$;

-- Bucket de imagens dos cursos (público para renderizar na Home)
INSERT INTO storage.buckets (id, name, public)
VALUES ('courses-images', 'courses-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policies de leitura pública e escrita para autenticados
DROP POLICY IF EXISTS "Courses images are publicly readable" ON storage.objects;
CREATE POLICY "Courses images are publicly readable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'courses-images');

DROP POLICY IF EXISTS "Authenticated users can upload course images" ON storage.objects;
CREATE POLICY "Authenticated users can upload course images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'courses-images');

DROP POLICY IF EXISTS "Authenticated users can update course images" ON storage.objects;
CREATE POLICY "Authenticated users can update course images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'courses-images')
WITH CHECK (bucket_id = 'courses-images');

DROP POLICY IF EXISTS "Authenticated users can delete course images" ON storage.objects;
CREATE POLICY "Authenticated users can delete course images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'courses-images');
