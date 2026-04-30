-- RPCs administrativas para exclusão de cursos/inscrições com RLS habilitado

CREATE OR REPLACE FUNCTION public.admin_bulk_delete_registrations(
    p_scope TEXT,
    p_course_id TEXT DEFAULT NULL
)
RETURNS TABLE (
    deleted_links BIGINT,
    deleted_registrations BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted_links BIGINT := 0;
    v_deleted_registrations BIGINT := 0;
BEGIN
    IF p_scope NOT IN ('all', 'course') THEN
        RAISE EXCEPTION 'INVALID_SCOPE: p_scope deve ser ''all'' ou ''course''';
    END IF;

    IF p_scope = 'all' THEN
        DELETE FROM public.registration_courses;
        GET DIAGNOSTICS v_deleted_links = ROW_COUNT;

        DELETE FROM public.registrations;
        GET DIAGNOSTICS v_deleted_registrations = ROW_COUNT;

        RETURN QUERY SELECT v_deleted_links, v_deleted_registrations;
        RETURN;
    END IF;

    IF p_course_id IS NULL OR TRIM(p_course_id) = '' THEN
        RAISE EXCEPTION 'COURSE_REQUIRED: p_course_id é obrigatório quando p_scope = ''course''';
    END IF;

    WITH linked AS (
        SELECT DISTINCT rc.registration_id
        FROM public.registration_courses rc
        WHERE rc.course_id = p_course_id
    )
    DELETE FROM public.registration_courses rc
    USING linked
    WHERE rc.course_id = p_course_id
      AND rc.registration_id = linked.registration_id;
    GET DIAGNOSTICS v_deleted_links = ROW_COUNT;

    DELETE FROM public.registrations r
    WHERE NOT EXISTS (
        SELECT 1
        FROM public.registration_courses rc
        WHERE rc.registration_id = r.id
    );
    GET DIAGNOSTICS v_deleted_registrations = ROW_COUNT;

    RETURN QUERY SELECT v_deleted_links, v_deleted_registrations;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_course_with_registrations(
    p_course_id TEXT
)
RETURNS TABLE (
    deleted_course BOOLEAN,
    deleted_links BIGINT,
    deleted_registrations BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted_links BIGINT := 0;
    v_deleted_registrations BIGINT := 0;
    v_deleted_course_count BIGINT := 0;
BEGIN
    IF p_course_id IS NULL OR TRIM(p_course_id) = '' THEN
        RAISE EXCEPTION 'COURSE_REQUIRED: p_course_id é obrigatório';
    END IF;

    WITH linked AS (
        SELECT DISTINCT rc.registration_id
        FROM public.registration_courses rc
        WHERE rc.course_id = p_course_id
    )
    DELETE FROM public.registration_courses rc
    USING linked
    WHERE rc.course_id = p_course_id
      AND rc.registration_id = linked.registration_id;
    GET DIAGNOSTICS v_deleted_links = ROW_COUNT;

    DELETE FROM public.registrations r
    WHERE NOT EXISTS (
        SELECT 1
        FROM public.registration_courses rc
        WHERE rc.registration_id = r.id
    );
    GET DIAGNOSTICS v_deleted_registrations = ROW_COUNT;

    DELETE FROM public.courses c
    WHERE c.id = p_course_id;
    GET DIAGNOSTICS v_deleted_course_count = ROW_COUNT;

    RETURN QUERY SELECT (v_deleted_course_count > 0), v_deleted_links, v_deleted_registrations;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_bulk_delete_registrations(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_course_with_registrations(TEXT) TO authenticated;
