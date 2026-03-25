-- Script de seed para garantir que os cursos existam na base de dados
-- Execute este script no SQL Editor do Supabase se os cursos não estiverem aparecendo

-- 1. Verificar e criar extensão UUID se necessário
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Garantir que a tabela courses existe com todas as colunas necessárias
CREATE TABLE IF NOT EXISTS public.courses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'Curso',
    starts_at TIMESTAMPTZ NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 40,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Garantir que a coluna is_active existe
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 4. Inserir ou atualizar cursos (usando UPSERT)
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

-- 5. Verificar se os cursos foram inseridos corretamente
SELECT 'Cursos inseridos/atualizados:' AS status;
SELECT id, name, starts_at, capacity, is_active FROM public.courses ORDER BY starts_at;

-- 6. Criar função get_course_availability se não existir
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

-- 7. Criar função get_all_courses_admin se não existir
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

-- 8. Verificar se as funções existem
SELECT 'Funções criadas/atualizadas com sucesso!' AS status;