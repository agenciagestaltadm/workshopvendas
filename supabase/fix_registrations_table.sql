-- ============================================================
-- CORREÇÃO DA TABELA REGISTRATIONS
-- Remove a coluna course_id que não é mais necessária
-- ============================================================

-- 1. Verificar estrutura atual da tabela registrations
SELECT '=== ESTRUTURA ATUAL ===' AS info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'registrations' 
ORDER BY ordinal_position;

-- 2. Remover a coluna course_id (não é mais necessária com registration_courses)
ALTER TABLE public.registrations 
DROP COLUMN IF EXISTS course_id;

-- 3. Verificar se a tabela registration_courses existe
SELECT '=== TABELA DE RELACIONAMENTO ===' AS info;
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'registration_courses'
) AS tabela_existe;

-- 4. Criar tabela registration_courses se não existir
CREATE TABLE IF NOT EXISTS public.registration_courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(registration_id, course_id)
);

-- 5. Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_registration_courses_registration_id 
    ON public.registration_courses(registration_id);
    
CREATE INDEX IF NOT EXISTS idx_registration_courses_course_id 
    ON public.registration_courses(course_id);

-- 6. Verificar estrutura final
SELECT '=== ESTRUTURA FINAL ===' AS info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'registrations' 
ORDER BY ordinal_position;

-- 7. Recriar a função de registro para garantir que funcione
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

    -- Criar a inscrição principal (sem course_id)
    INSERT INTO public.registrations (name, email, phone, document)
    VALUES (TRIM(p_name), LOWER(TRIM(p_email)), TRIM(p_phone), REPLACE(REPLACE(REPLACE(p_document, '.', ''), '-', ''), '/', ''))
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

SELECT '=== CORREÇÃO CONCLUÍDA ===' AS info;
SELECT 'A tabela registrations foi atualizada e a função de registro recriada.' AS mensagem;
