-- ============================================================
-- SCRIPT CORREÇÃO COMPLETA - DUPLICATAS E INSCRIÇÕES
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- ============================================================
-- PARTE 1: CORREÇÃO DE DUPLICATAS DE CURSOS
-- ============================================================

-- 1.1 Verificar todos os cursos existentes
SELECT '=== CURSOS EXISTENTES ===' AS info;
SELECT id, name, starts_at, capacity, is_active 
FROM public.courses 
ORDER BY name, starts_at;

-- 1.2 Identificar cursos duplicados por nome
SELECT '=== DUPLICATAS POR NOME ===' AS info;
SELECT name, COUNT(*) as count, array_agg(id) as ids
FROM public.courses
GROUP BY name
HAVING COUNT(*) > 1;

-- 1.3 Criar tabela temporária para armazenar IDs a manter
CREATE TEMP TABLE IF NOT EXISTS courses_to_keep AS
SELECT DISTINCT ON (name) 
    id,
    name,
    starts_at,
    capacity,
    is_active,
    created_at
FROM public.courses
ORDER BY name, created_at ASC; -- Manter o mais antigo

-- 1.4 Verificar quais serão mantidos
SELECT '=== CURSOS QUE SERÃO MANTIDOS ===' AS info;
SELECT * FROM courses_to_keep;

-- 1.5 Remover inscrições dos cursos que serão excluídos (evitar constraint errors)
DELETE FROM public.registration_courses
WHERE course_id IN (
    SELECT id FROM public.courses 
    WHERE id NOT IN (SELECT id FROM courses_to_keep)
);

-- 1.6 Remover cursos duplicados (manter apenas os da tabela temporária)
DELETE FROM public.courses
WHERE id NOT IN (SELECT id FROM courses_to_keep);

-- 1.7 Limpar tabela temporária
DROP TABLE IF EXISTS courses_to_keep;

-- 1.8 Verificar resultado
SELECT '=== CURSOS APÓS LIMPEZA ===' AS info;
SELECT id, name, starts_at, capacity, is_active 
FROM public.courses 
ORDER BY starts_at;

-- ============================================================
-- PARTE 2: GARANTIR CURSOS PADRÃO (SE NECESSÁRIO)
-- ============================================================

-- Inserir cursos padrão se a tabela estiver vazia ou incompleta
INSERT INTO public.courses (id, name, category, starts_at, capacity, is_active)
VALUES 
    ('workshop-1', 'Produtos Digitais e Seus Fornecedores', 'Curso', '2026-04-06 15:00:00+00', 40, TRUE),
    ('workshop-2', 'Páginas de Vendas', 'Curso', '2026-04-07 15:00:00+00', 40, TRUE),
    ('workshop-3', 'Produção de Criativos', 'Curso', '2026-04-08 15:00:00+00', 40, TRUE),
    ('workshop-4', 'Gestão de Tráfego Pago', 'Curso', '2026-04-09 15:00:00+00', 40, TRUE),
    ('workshop-5', 'Técnicas de Vendas', 'Curso', '2026-04-10 15:00:00+00', 40, TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    starts_at = EXCLUDED.starts_at,
    capacity = EXCLUDED.capacity,
    is_active = EXCLUDED.is_active;

-- ============================================================
-- PARTE 3: RECRIAR FUNÇÕES RPC CORRETAMENTE
-- ============================================================

-- 3.1 Função para obter disponibilidade de cursos (pública)
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

-- 3.2 Função para admin obter todos os cursos
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

-- 3.3 Função de registro com tratamento de erro melhorado
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
    
    IF p_document IS NULL OR LENGTH(REPLACE(p_document, '.', '')) < 11 THEN
        RAISE EXCEPTION 'INVALID_DOCUMENT: CPF/CNPJ inválido';
    END IF;

    -- Verificar se há cursos selecionados
    IF p_course_ids IS NULL OR array_length(p_course_ids, 1) IS NULL THEN
        RAISE EXCEPTION 'NO_COURSES_SELECTED: Selecione pelo menos um curso';
    END IF;

    -- Para cada curso, verificar existência, status, vagas e duplicidade
    FOREACH v_course_id IN ARRAY p_course_ids
    LOOP
        -- Verificar se o curso existe
        SELECT EXISTS(SELECT 1 FROM public.courses WHERE id = v_course_id)
        INTO v_course_exists;

        IF NOT v_course_exists THEN
            RAISE EXCEPTION 'COURSE_NOT_FOUND: Curso não encontrado: %', v_course_id;
        END IF;

        -- Pegar informações do curso
        SELECT name, is_active, capacity
        INTO v_course_name, v_is_active, v_course_capacity
        FROM public.courses 
        WHERE id = v_course_id;

        -- Verificar se o curso está ativo
        IF NOT v_is_active THEN
            RAISE EXCEPTION 'COURSE_INACTIVE: As inscrições para o curso "%" estão pausadas', v_course_name;
        END IF;

        -- Contar inscrições atuais
        SELECT COUNT(*) INTO v_current_filled
        FROM public.registration_courses 
        WHERE course_id = v_course_id;

        -- Verificar se há vagas
        IF v_current_filled >= v_course_capacity THEN
            RAISE EXCEPTION 'NO_VACANCIES: O curso "%" está com vagas esgotadas (%/% inscritos)', 
                v_course_name, v_current_filled, v_course_capacity;
        END IF;

        -- Verificar se já existe inscrição com este email no mesmo curso
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

    -- Criar a inscrição principal
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

-- 3.4 Função para atualizar capacidade
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
END;
$$;

-- 3.5 Função para atualizar status
CREATE OR REPLACE FUNCTION public.update_course_status(
    p_course_id TEXT,
    p_is_active BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM public.courses WHERE id = p_course_id) THEN
        RAISE EXCEPTION 'COURSE_NOT_FOUND: Curso não encontrado';
    END IF;

    UPDATE public.courses 
    SET is_active = p_is_active 
    WHERE id = p_course_id;
END;
$$;

-- ============================================================
-- PARTE 4: CONFIGURAR PERMISSÕES (RLS)
-- ============================================================

-- 4.1 Habilitar RLS nas tabelas
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_courses ENABLE ROW LEVEL SECURITY;

-- 4.2 Políticas para cursos (todos podem ler, apenas autenticados podem modificar)
DROP POLICY IF EXISTS "Allow public read" ON public.courses;
DROP POLICY IF EXISTS "Allow admin write" ON public.courses;

CREATE POLICY "Allow public read" ON public.courses
    FOR SELECT TO PUBLIC USING (true);

CREATE POLICY "Allow admin write" ON public.courses
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4.3 Políticas para registrations
DROP POLICY IF EXISTS "Allow public insert" ON public.registrations;
DROP POLICY IF EXISTS "Allow admin read" ON public.registrations;
DROP POLICY IF EXISTS "Allow admin modify" ON public.registrations;

CREATE POLICY "Allow public insert" ON public.registrations
    FOR INSERT TO PUBLIC WITH CHECK (true);

CREATE POLICY "Allow admin read" ON public.registrations
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admin modify" ON public.registrations
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4.4 Políticas para registration_courses
DROP POLICY IF EXISTS "Allow public insert" ON public.registration_courses;
DROP POLICY IF EXISTS "Allow admin read" ON public.registration_courses;
DROP POLICY IF EXISTS "Allow admin modify" ON public.registration_courses;

CREATE POLICY "Allow public insert" ON public.registration_courses
    FOR INSERT TO PUBLIC WITH CHECK (true);

CREATE POLICY "Allow admin read" ON public.registration_courses
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admin modify" ON public.registration_courses
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- PARTE 5: VERIFICAÇÃO FINAL
-- ============================================================

-- 5.1 Verificar cursos finais
SELECT '=== CURSOS FINAIS ===' AS info;
SELECT id, name, starts_at, capacity, is_active 
FROM public.courses 
ORDER BY starts_at;

-- 5.2 Verificar funções criadas
SELECT '=== FUNÇÕES CRIADAS ===' AS info;
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_course_availability', 'get_all_courses_admin', 'register_participant_with_courses');

-- 5.3 Verificar políticas
SELECT '=== POLÍTICAS RLS ===' AS info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';

-- 5.4 Teste: Contar inscrições atuais
SELECT '=== INSCRIÇÕES ATUAIS ===' AS info;
SELECT COUNT(*) as total_inscricoes FROM public.registrations;
SELECT COUNT(*) as total_vinculos FROM public.registration_courses;

SELECT '=== CORREÇÃO CONCLUÍDA ===' AS info;
