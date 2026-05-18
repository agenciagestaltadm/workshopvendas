-- Continuação de Otimização de Performance

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
        c.is_active,
        COALESCE(cc.filled, 0) as filled,
        GREATEST(0, c.capacity - COALESCE(cc.filled, 0)) as remaining
    FROM public.courses c
    LEFT JOIN course_counts cc ON c.id = cc.course_id
    ORDER BY c.starts_at;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_courses_admin() TO anon, authenticated;
