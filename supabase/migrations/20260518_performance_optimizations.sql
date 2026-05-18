-- Otimização de Performance para Inscrições e Carregamento

-- Índice para a tabela courses
CREATE INDEX IF NOT EXISTS idx_courses_is_active_starts_at ON public.courses(is_active, starts_at);
CREATE INDEX IF NOT EXISTS idx_courses_id_is_active ON public.courses(id, is_active);

-- Índice para a tabela registrations
CREATE INDEX IF NOT EXISTS idx_registrations_email ON public.registrations(email);

-- Índices compostos para a tabela registration_courses
CREATE INDEX IF NOT EXISTS idx_registration_courses_course_id_registration_id ON public.registration_courses(course_id, registration_id);
CREATE INDEX IF NOT EXISTS idx_registration_courses_registration_id_course_id ON public.registration_courses(registration_id, course_id);

-- Melhorando a query do get_course_availability
DROP FUNCTION IF EXISTS public.get_course_availability();
CREATE OR REPLACE FUNCTION public.get_course_availability()
RETURNS TABLE (
    course_id TEXT,
    name TEXT,
    category TEXT,
    starts_at TIMESTAMPTZ,
    capacity INTEGER,
    filled BIGINT,
    remaining BIGINT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    WITH course_counts AS (
        SELECT course_id, COUNT(id) as filled
        FROM public.registration_courses
        GROUP BY course_id
    )
    SELECT 
        c.id as course_id,
        c.name,
        c.category,
        c.starts_at,
        c.capacity,
        COALESCE(cc.filled, 0) as filled,
        GREATEST(0, c.capacity - COALESCE(cc.filled, 0)) as remaining
    FROM public.courses c
    LEFT JOIN course_counts cc ON c.id = cc.course_id
    WHERE c.is_active = TRUE
    ORDER BY c.starts_at;
$$;

GRANT EXECUTE ON FUNCTION public.get_course_availability() TO anon, authenticated;
