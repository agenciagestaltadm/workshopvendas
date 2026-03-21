-- Migração para adicionar o campo document (CPF/CNPJ) à tabela registrations
-- e atualizar a função register_participant para aceitar o novo parâmetro

-- 1. Adicionar a coluna document na tabela registrations
ALTER TABLE public.registrations
ADD COLUMN IF NOT EXISTS document TEXT;

-- 2. Criar índice para melhorar a performance de buscas por documento
CREATE INDEX IF NOT EXISTS idx_registrations_document ON public.registrations(document);

-- 3. Atualizar a função register_participant para aceitar o parâmetro p_document
CREATE OR REPLACE FUNCTION public.register_participant(
    p_name TEXT,
    p_email TEXT,
    p_phone TEXT,
    p_document TEXT,
    p_course_id TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_registration_id TEXT;
    v_course_exists BOOLEAN;
    v_has_vacancy BOOLEAN;
    v_already_registered BOOLEAN;
BEGIN
    -- Verificar se o curso existe
    SELECT EXISTS(SELECT 1 FROM public.courses WHERE id = p_course_id)
    INTO v_course_exists;

    IF NOT v_course_exists THEN
        RAISE EXCEPTION 'COURSE_NOT_FOUND: Curso não encontrado';
    END IF;

    -- Verificar se já existe inscrição com este email no mesmo curso
    SELECT EXISTS(
        SELECT 1 FROM public.registrations
        WHERE email = p_email AND course_id = p_course_id
    )
    INTO v_already_registered;

    IF v_already_registered THEN
        RAISE EXCEPTION 'DUPLICATE_REGISTRATION: Você já está inscrito neste curso';
    END IF;

    -- Verificar se há vagas disponíveis
    SELECT (
        (SELECT capacity FROM public.courses WHERE id = p_course_id) >
        (SELECT COUNT(*) FROM public.registrations WHERE course_id = p_course_id)
    )
    INTO v_has_vacancy;

    IF NOT v_has_vacancy THEN
        RAISE EXCEPTION 'NO_VACANCIES: Este curso está com vagas esgotadas';
    END IF;

    -- Inserir a inscrição
    INSERT INTO public.registrations (name, email, phone, document, course_id)
    VALUES (p_name, p_email, p_phone, p_document, p_course_id)
    RETURNING id::TEXT INTO v_registration_id;

    RETURN v_registration_id;
END;
$$;

-- 4. Comentário sobre a migração
COMMENT ON COLUMN public.registrations.document IS 'CPF ou CNPJ do participante (somente números)';
