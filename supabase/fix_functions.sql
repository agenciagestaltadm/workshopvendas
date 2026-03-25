-- ============================================================
-- CORREÇÃO DAS FUNÇÕES RPC
-- Corrige o erro "UPDATE requires a WHERE clause"
-- ============================================================

-- 1. Corrigir função update_course_status com proteção contra NULL
CREATE OR REPLACE FUNCTION public.update_course_status(
    p_course_id TEXT,
    p_is_active BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar se course_id não é NULL ou vazio
    IF p_course_id IS NULL OR TRIM(p_course_id) = '' THEN
        RAISE EXCEPTION 'COURSE_ID_REQUIRED: ID do curso é obrigatório';
    END IF;

    -- Verificar se o curso existe
    IF NOT EXISTS(SELECT 1 FROM public.courses WHERE id = p_course_id) THEN
        RAISE EXCEPTION 'COURSE_NOT_FOUND: Curso não encontrado: %', p_course_id;
    END IF;

    -- Atualizar status apenas se o WHERE for válido
    UPDATE public.courses 
    SET is_active = p_is_active 
    WHERE id = p_course_id;
    
    -- Verificar se alguma linha foi atualizada
    IF NOT FOUND THEN
        RAISE EXCEPTION 'COURSE_NOT_UPDATED: Não foi possível atualizar o curso: %', p_course_id;
    END IF;
END;
$$;

-- 2. Corrigir função update_course_capacity com proteção contra NULL
CREATE OR REPLACE FUNCTION public.update_course_capacity(
    p_course_id TEXT,
    p_new_capacity INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_count INTEGER;
BEGIN
    -- Verificar se course_id não é NULL ou vazio
    IF p_course_id IS NULL OR TRIM(p_course_id) = '' THEN
        RAISE EXCEPTION 'COURSE_ID_REQUIRED: ID do curso é obrigatório';
    END IF;

    IF NOT EXISTS(SELECT 1 FROM public.courses WHERE id = p_course_id) THEN
        RAISE EXCEPTION 'COURSE_NOT_FOUND: Curso não encontrado';
    END IF;

    IF p_new_capacity < 1 THEN
        RAISE EXCEPTION 'INVALID_CAPACITY: A capacidade deve ser pelo menos 1';
    END IF;

    SELECT COUNT(*) INTO v_current_count 
    FROM public.registration_courses 
    WHERE course_id = p_course_id;

    IF p_new_capacity < v_current_count THEN
        RAISE EXCEPTION 'CAPACITY_TOO_LOW: Nova capacidade (%) é menor que o número de inscritos (%)', 
            p_new_capacity, v_current_count;
    END IF;

    UPDATE public.courses 
    SET capacity = p_new_capacity 
    WHERE id = p_course_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'COURSE_NOT_UPDATED: Não foi possível atualizar o curso';
    END IF;
END;
$$;

-- 3. Corrigir função update_all_courses_status
CREATE OR REPLACE FUNCTION public.update_all_courses_status(
    p_is_active BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.courses 
    SET is_active = p_is_active;
END;
$$;

-- 4. Recriar função de registro com proteções adicionais
CREATE OR REPLACE FUNCTION public.register_participant_with_courses(
    p_name TEXT,
    p_email TEXT,
    p_phone TEXT,
    p_document TEXT,
    p_course_ids TEXT[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_registration_id UUID;
    v_course_id TEXT;
    v_course_exists BOOLEAN;
    v_is_active BOOLEAN;
    v_already_registered BOOLEAN;
    v_course_name TEXT;
    v_current_filled BIGINT;
    v_course_capacity INTEGER;
BEGIN
    -- Validações iniciais
    IF p_name IS NULL OR LENGTH(TRIM(p_name)) < 2 THEN
        RAISE EXCEPTION 'INVALID_NAME: Nome deve ter pelo menos 2 caracteres';
    END IF;
    
    IF p_email IS NULL OR LENGTH(TRIM(p_email)) < 5 THEN
        RAISE EXCEPTION 'INVALID_EMAIL: E-mail inválido';
    END IF;

    IF p_course_ids IS NULL OR array_length(p_course_ids, 1) IS NULL THEN
        RAISE EXCEPTION 'NO_COURSES_SELECTED: Selecione pelo menos um curso';
    END IF;

    -- Verificar se todos os course_ids são válidos
    FOREACH v_course_id IN ARRAY p_course_ids
    LOOP
        IF v_course_id IS NULL OR TRIM(v_course_id) = '' THEN
            RAISE EXCEPTION 'INVALID_COURSE_ID: ID do curso não pode ser vazio';
        END IF;
    END LOOP;

    FOREACH v_course_id IN ARRAY p_course_ids
    LOOP
        SELECT EXISTS(SELECT 1 FROM public.courses WHERE id = v_course_id)
        INTO v_course_exists;

        IF NOT v_course_exists THEN
            RAISE EXCEPTION 'COURSE_NOT_FOUND: Curso não encontrado: %', v_course_id;
        END IF;

        SELECT name, is_active, capacity
        INTO v_course_name, v_is_active, v_course_capacity
        FROM public.courses 
        WHERE id = v_course_id;

        IF NOT v_is_active THEN
            RAISE EXCEPTION 'COURSE_INACTIVE: As inscrições para o curso "%" estão pausadas', v_course_name;
        END IF;

        SELECT COUNT(*) INTO v_current_filled
        FROM public.registration_courses 
        WHERE course_id = v_course_id;

        IF v_current_filled >= v_course_capacity THEN
            RAISE EXCEPTION 'NO_VACANCIES: O curso "%" está com vagas esgotadas', v_course_name;
        END IF;

        SELECT EXISTS(
            SELECT 1 FROM public.registrations r
            JOIN public.registration_courses rc ON r.id = rc.registration_id
            WHERE r.email = LOWER(TRIM(p_email)) AND rc.course_id = v_course_id
        )
        INTO v_already_registered;

        IF v_already_registered THEN
            RAISE EXCEPTION 'DUPLICATE_REGISTRATION: Você já está inscrito no curso: %', v_course_name;
        END IF;
    END LOOP;

    INSERT INTO public.registrations (name, email, phone, document)
    VALUES (TRIM(p_name), LOWER(TRIM(p_email)), TRIM(p_phone), REPLACE(REPLACE(REPLACE(p_document, '.', ''), '-', ''), '/', ''))
    RETURNING id INTO v_registration_id;

    FOREACH v_course_id IN ARRAY p_course_ids
    LOOP
        INSERT INTO public.registration_courses (registration_id, course_id)
        VALUES (v_registration_id, v_course_id);
    END LOOP;

    RETURN v_registration_id;
END;
$$;

-- 5. Recriar funções de consulta
CREATE OR REPLACE FUNCTION public.get_course_availability()
RETURNS TABLE (
    course_id TEXT,
    name TEXT,
    category TEXT,
    starts_at TIMESTAMPTZ,
    capacity INTEGER,
    filled BIGINT,
    remaining BIGINT,
    is_active BOOLEAN
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
        COUNT(rc.id) as filled,
        GREATEST(0, c.capacity - COUNT(rc.id)) as remaining,
        c.is_active
    FROM public.courses c
    LEFT JOIN public.registration_courses rc ON c.id = rc.course_id
    GROUP BY c.id, c.name, c.category, c.starts_at, c.capacity, c.is_active
    ORDER BY c.starts_at;
$$;

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
    SELECT 
        c.id as course_id,
        c.name,
        c.category,
        c.starts_at,
        c.capacity,
        c.is_active,
        COUNT(rc.id) as filled,
        GREATEST(0, c.capacity - COUNT(rc.id)) as remaining
    FROM public.courses c
    LEFT JOIN public.registration_courses rc ON c.id = rc.course_id
    GROUP BY c.id, c.name, c.category, c.starts_at, c.capacity, c.is_active
    ORDER BY c.starts_at;
$$;

SELECT '=== FUNÇÕES CORRIGIDAS COM SUCESSO ===' AS info;
