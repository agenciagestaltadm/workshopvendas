-- Migração para adicionar suporte a múltiplos cursos por inscrição
-- Cria tabela de relacionamento N:M registration_courses

-- 1. Criar tabela de relacionamento entre registrations e courses
CREATE TABLE IF NOT EXISTS public.registration_courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(registration_id, course_id)
);

-- 2. Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_registration_courses_registration_id 
    ON public.registration_courses(registration_id);
    
CREATE INDEX IF NOT EXISTS idx_registration_courses_course_id 
    ON public.registration_courses(course_id);

-- 3. Migrar dados existentes (inscrições atuais com course_id na tabela registrations)
-- Para cada inscrição existente, criar registro na nova tabela
INSERT INTO public.registration_courses (registration_id, course_id)
SELECT id, course_id 
FROM public.registrations 
WHERE course_id IS NOT NULL
ON CONFLICT (registration_id, course_id) DO NOTHING;

-- 4. Criar função para registrar participante com múltiplos cursos
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
    v_has_vacancy BOOLEAN;
    v_already_registered BOOLEAN;
    v_course_name TEXT;
BEGIN
    -- Verificar se há cursos selecionados
    IF p_course_ids IS NULL OR array_length(p_course_ids, 1) IS NULL THEN
        RAISE EXCEPTION 'NO_COURSES_SELECTED: Selecione pelo menos um curso';
    END IF;

    -- Para cada curso, verificar existência, vagas e duplicidade
    FOREACH v_course_id IN ARRAY p_course_ids
    LOOP
        -- Verificar se o curso existe
        SELECT EXISTS(SELECT 1 FROM public.courses WHERE id = v_course_id)
        INTO v_course_exists;

        IF NOT v_course_exists THEN
            RAISE EXCEPTION 'COURSE_NOT_FOUND: Curso não encontrado: %', v_course_id;
        END IF;

        -- Pegar nome do curso para mensagem de erro
        SELECT name INTO v_course_name FROM public.courses WHERE id = v_course_id;

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

    -- Criar a inscrição principal (sem course_id, pois agora é N:M)
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

-- 5. Manter função antiga para compatibilidade (deprecated)
-- Será removida em migração futura

-- 6. Comentários
COMMENT ON TABLE public.registration_courses IS 'Relacionamento N:M entre inscrições e cursos - permite múltiplos cursos por participante';
COMMENT ON FUNCTION public.register_participant_with_courses IS 'Registra participante em múltiplos cursos simultaneamente';
