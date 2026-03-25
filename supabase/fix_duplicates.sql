-- Script para corrigir duplicatas e garantir integridade dos dados

-- 1. Verificar se há duplicatas na tabela courses
SELECT id, COUNT(*) as count
FROM public.courses
GROUP BY id
HAVING COUNT(*) > 1;

-- 2. Remover duplicatas mantendo apenas o registro mais recente
DELETE FROM public.courses
WHERE ctid NOT IN (
    SELECT MIN(ctid)
    FROM public.courses
    GROUP BY id
);

-- 3. Verificar cursos existentes
SELECT id, name, starts_at, capacity, is_active 
FROM public.courses 
ORDER BY starts_at;

-- 4. Se necessário, limpar todos os cursos e recriar
-- DESCOMENTE AS LINHAS ABAIXO SE QUISER LIMPAR TUDO E COMEÇAR DO ZERO
-- DELETE FROM public.registration_courses;
-- DELETE FROM public.registrations;
-- DELETE FROM public.courses;

-- 5. Recriar cursos padrão (se necessário)
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

-- 6. Recriar funções RPC essenciais
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

-- 7. Verificar resultado final
SELECT 'Cursos únicos após correção:' AS status;
SELECT id, name FROM public.courses ORDER BY starts_at;
