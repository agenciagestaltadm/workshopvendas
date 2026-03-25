-- Migração para adicionar controle de status dos cursos
-- Permite pausar/ativar inscrições individualmente

-- 1. Adicionar coluna is_active na tabela courses
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 2. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_courses_is_active ON public.courses(is_active);

-- 3. Atualizar função get_course_availability para considerar is_active
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
    SELECT 
        c.id as course_id,
        c.name,
        c.category,
        c.starts_at,
        c.capacity,
        COUNT(rc.id) as filled,
        GREATEST(0, c.capacity - COUNT(rc.id)) as remaining
    FROM public.courses c
    LEFT JOIN public.registration_courses rc ON c.id = rc.course_id
    WHERE c.is_active = TRUE
    GROUP BY c.id, c.name, c.category, c.starts_at, c.capacity
    ORDER BY c.starts_at;
$$;

-- 4. Criar função para obter todos os cursos (inclusive inativos) - para admin
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

-- 5. Criar função para atualizar capacity de um curso
CREATE OR REPLACE FUNCTION public.update_course_capacity(
    p_course_id TEXT,
    p_new_capacity INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar se o curso existe
    IF NOT EXISTS(SELECT 1 FROM public.courses WHERE id = p_course_id) THEN
        RAISE EXCEPTION 'COURSE_NOT_FOUND: Curso não encontrado';
    END IF;

    -- Verificar se a nova capacidade é válida
    IF p_new_capacity < 1 THEN
        RAISE EXCEPTION 'INVALID_CAPACITY: A capacidade deve ser pelo menos 1';
    END IF;

    -- Verificar se há mais inscritos que a nova capacidade
    DECLARE
        v_current_count INTEGER;
    BEGIN
        SELECT COUNT(*) INTO v_current_count 
        FROM public.registration_courses 
        WHERE course_id = p_course_id;

        IF p_new_capacity < v_current_count THEN
            RAISE EXCEPTION 'CAPACITY_TOO_LOW: Nova capacidade (%) é menor que o número de inscritos (%)', p_new_capacity, v_current_count;
        END IF;
    END;

    -- Atualizar capacidade
    UPDATE public.courses 
    SET capacity = p_new_capacity 
    WHERE id = p_course_id;
END;
$$;

-- 6. Criar função para atualizar status (is_active) de um curso
CREATE OR REPLACE FUNCTION public.update_course_status(
    p_course_id TEXT,
    p_is_active BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar se o curso existe
    IF NOT EXISTS(SELECT 1 FROM public.courses WHERE id = p_course_id) THEN
        RAISE EXCEPTION 'COURSE_NOT_FOUND: Curso não encontrado';
    END IF;

    -- Atualizar status
    UPDATE public.courses 
    SET is_active = p_is_active 
    WHERE id = p_course_id;
END;
$$;

-- 7. Criar função para atualizar status de todos os cursos
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

-- 8. Atualizar função register_participant_with_courses para bloquear cursos inativos
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
    v_has_vacancy BOOLEAN;
    v_already_registered BOOLEAN;
    v_course_name TEXT;
BEGIN
    -- Verificar se há cursos selecionados
    IF p_course_ids IS NULL OR array_length(p_course_ids, 1) IS NULL THEN
        RAISE EXCEPTION 'NO_COURSES_SELECTED: Selecione pelo menos um curso';
    END IF;

    -- Para cada curso, verificar existência, status, vagas e duplicidade
    FOREACH v_course_id IN ARRAY p_course_ids
    LOOP
        -- Verificar se o curso existe e está ativo
        SELECT EXISTS(SELECT 1 FROM public.courses WHERE id = v_course_id),
               is_active,
               name
        INTO v_course_exists, v_is_active, v_course_name
        FROM public.courses 
        WHERE id = v_course_id;

        IF NOT v_course_exists THEN
            RAISE EXCEPTION 'COURSE_NOT_FOUND: Curso não encontrado: %', v_course_id;
        END IF;

        -- Verificar se o curso está ativo
        IF NOT v_is_active THEN
            RAISE EXCEPTION 'COURSE_INACTIVE: As inscrições para o curso "%" estão pausadas', v_course_name;
        END IF;

        -- Verificar se já existe inscrição com este email no mesmo curso
        SELECT EXISTS(
            SELECT 1 FROM public.registrations r
            JOIN public.registration_courses rc ON r.id = rc.registration_id
            WHERE r.email = p_email AND rc.course_id = v_course_id
        )
        INTO v_already_registered;

        IF v_already_registered THEN
            RAISE EXCEPTION 'DUPLICATE_REGISTRATION: Você já está inscrito no curso: %', v_course_name;
        END IF;

        -- Verificar se há vagas disponíveis
        SELECT (
            (SELECT capacity FROM public.courses WHERE id = v_course_id) >
            COALESCE((SELECT COUNT(*) FROM public.registration_courses WHERE course_id = v_course_id), 0)
        )
        INTO v_has_vacancy;

        IF NOT v_has_vacancy THEN
            RAISE EXCEPTION 'NO_VACANCIES: O curso "%" está com vagas esgotadas', v_course_name;
        END IF;
    END LOOP;

    -- Criar a inscrição principal
    INSERT INTO public.registrations (name, email, phone, document)
    VALUES (p_name, p_email, p_phone, p_document)
    RETURNING id INTO v_registration_id;

    -- Criar registros na tabela de relacionamento
    FOREACH v_course_id IN ARRAY p_course_ids
    LOOP
        INSERT INTO public.registration_courses (registration_id, course_id)
        VALUES (v_registration_id, v_course_id);
    END LOOP;

    RETURN v_registration_id;
END;
$$;

-- Comentários
COMMENT ON COLUMN public.courses.is_active IS 'Indica se o curso está aceitando inscrições (TRUE) ou pausado (FALSE)';
COMMENT ON FUNCTION public.update_course_capacity IS 'Atualiza a capacidade (vagas) de um curso específico';
COMMENT ON FUNCTION public.update_course_status IS 'Ativa ou pausa inscrições para um curso específico';
COMMENT ON FUNCTION public.update_all_courses_status IS 'Ativa ou pausa inscrições para todos os cursos';
COMMENT ON FUNCTION public.get_all_courses_admin IS 'Retorna todos os cursos (ativos e inativos) com estatísticas - para uso no admin';
