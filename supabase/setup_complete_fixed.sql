-- ============================================================
-- SCRIPT COMPLETO DE CONFIGURAÇÃO DO SUPABASE
-- Corrige o erro: "cannot change return type of existing function"
-- ============================================================

-- 1. PRIMEIRO: Dropar funções existentes (para evitar conflito de tipos)
DROP FUNCTION IF EXISTS public.get_course_availability();
DROP FUNCTION IF EXISTS public.get_all_courses_admin();
DROP FUNCTION IF EXISTS public.register_participant_with_courses(TEXT, TEXT, TEXT, TEXT, TEXT[]);
DROP FUNCTION IF EXISTS public.update_course_status(TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS public.update_course_capacity(TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.update_all_courses_status(BOOLEAN);

-- 2. Criar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. Criar tabela de cursos
CREATE TABLE IF NOT EXISTS public.courses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'Curso',
    starts_at TIMESTAMPTZ NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 20,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Garantir que a coluna is_active existe
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 5. Criar tabela de inscrições
CREATE TABLE IF NOT EXISTS public.registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    document TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Criar tabela de relacionamento
CREATE TABLE IF NOT EXISTS public.registration_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_id UUID REFERENCES public.registrations(id) ON DELETE CASCADE,
    course_id TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(registration_id, course_id)
);

-- 7. Inserir cursos
INSERT INTO public.courses (id, name, category, starts_at, capacity, is_active)
VALUES 
    ('workshop-1', 'Produtos Digitais e Seus Fornecedores', 'Curso', '2026-04-06 14:00:00+00', 20, TRUE),
    ('workshop-2', 'Páginas de Vendas', 'Curso', '2026-04-07 14:00:00+00', 20, TRUE),
    ('workshop-3', 'Produção de Criativos', 'Curso', '2026-04-08 14:00:00+00', 20, TRUE),
    ('workshop-4', 'Gestão de Tráfego Pago', 'Curso', '2026-04-09 14:00:00+00', 20, TRUE),
    ('workshop-5', 'Técnicas de Vendas', 'Curso', '2026-04-10 14:00:00+00', 20, TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    starts_at = EXCLUDED.starts_at,
    capacity = EXCLUDED.capacity,
    is_active = EXCLUDED.is_active;

-- 8. Criar função get_course_availability
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

-- 9. Criar função get_all_courses_admin
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

-- 10. Criar função register_participant_with_courses
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
    v_count BIGINT;
    v_capacity INTEGER;
BEGIN
    -- Verificar se há cursos selecionados
    IF array_length(p_course_ids, 1) IS NULL OR array_length(p_course_ids, 1) = 0 THEN
        RAISE EXCEPTION 'NO_COURSES_SELECTED: Selecione pelo menos um curso';
    END IF;

    -- Verificar se o email já está registrado
    SELECT id INTO v_registration_id 
    FROM public.registrations 
    WHERE email = p_email;

    IF v_registration_id IS NOT NULL THEN
        -- Verificar se já está inscrito em algum dos cursos selecionados
        SELECT COUNT(*) INTO v_count
        FROM public.registration_courses
        WHERE registration_id = v_registration_id 
        AND course_id = ANY(p_course_ids);

        IF v_count > 0 THEN
            RAISE EXCEPTION 'DUPLICATE_REGISTRATION: Você já está inscrito em um dos cursos selecionados';
        END IF;
    ELSE
        -- Criar nova inscrição
        INSERT INTO public.registrations (name, email, phone, document)
        VALUES (p_name, p_email, p_phone, p_document)
        RETURNING id INTO v_registration_id;
    END IF;

    -- Verificar disponibilidade e inscrever em cada curso
    FOREACH v_course_id IN ARRAY p_course_ids
    LOOP
        -- Verificar se o curso existe e está ativo
        SELECT capacity INTO v_capacity
        FROM public.courses
        WHERE id = v_course_id AND is_active = TRUE;

        IF v_capacity IS NULL THEN
            RAISE EXCEPTION 'COURSE_NOT_FOUND: Curso não encontrado ou inativo: %', v_course_id;
        END IF;

        -- Contar inscritos no curso
        SELECT COUNT(*) INTO v_count
        FROM public.registration_courses
        WHERE course_id = v_course_id;

        -- Verificar se há vagas
        IF v_count >= v_capacity THEN
            RAISE EXCEPTION 'NO_VACANCIES: Curso lotado: %', v_course_id;
        END IF;

        -- Inserir relacionamento
        INSERT INTO public.registration_courses (registration_id, course_id)
        VALUES (v_registration_id, v_course_id);
    END LOOP;

    RETURN v_registration_id;
END;
$$;

-- 11. Criar função update_course_status
CREATE OR REPLACE FUNCTION public.update_course_status(
    p_course_id TEXT,
    p_is_active BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_course_id IS NULL OR TRIM(p_course_id) = '' THEN
        RAISE EXCEPTION 'COURSE_ID_REQUIRED: ID do curso é obrigatório';
    END IF;

    IF NOT EXISTS(SELECT 1 FROM public.courses WHERE id = p_course_id) THEN
        RAISE EXCEPTION 'COURSE_NOT_FOUND: Curso não encontrado: %', p_course_id;
    END IF;

    UPDATE public.courses 
    SET is_active = p_is_active 
    WHERE id = p_course_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'COURSE_NOT_UPDATED: Não foi possível atualizar o curso: %', p_course_id;
    END IF;
END;
$$;

-- 12. Criar função update_course_capacity
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

-- 13. Criar função update_all_courses_status
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

-- 14. Configurar RLS (Row Level Security)
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_courses ENABLE ROW LEVEL SECURITY;

-- 15. Criar políticas
DROP POLICY IF EXISTS "Cursos visíveis para todos" ON public.courses;
CREATE POLICY "Cursos visíveis para todos" ON public.courses
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Inscrições podem ser criadas" ON public.registrations;
CREATE POLICY "Inscrições podem ser criadas" ON public.registrations
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Relacionamentos podem ser criados" ON public.registration_courses;
CREATE POLICY "Relacionamentos podem ser criados" ON public.registration_courses
    FOR INSERT WITH CHECK (true);

-- 16. Conceder permissões para funções
GRANT EXECUTE ON FUNCTION public.get_course_availability() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_courses_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_participant_with_courses(TEXT, TEXT, TEXT, TEXT, TEXT[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_course_status(TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_course_capacity(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_all_courses_status(BOOLEAN) TO authenticated;

-- 17. Verificar resultado
SELECT 'Configuração concluída!' AS status;
SELECT 'Cursos cadastrados:' AS info;
SELECT * FROM public.get_course_availability();
