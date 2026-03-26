-- ============================================================
-- VERIFICAR E CORRIGIR IDs DOS CURSOS
-- ============================================================

-- 1. Verificar cursos atuais no banco
SELECT '=== CURSOS ATUAIS NO BANCO ===' AS info;
SELECT id, name, starts_at, capacity, is_active 
FROM public.courses 
ORDER BY starts_at;

-- 2. Verificar se os IDs esperados existem
SELECT '=== VERIFICAÇÃO DE IDs ESPERADOS ===' AS info;
SELECT 
    'workshop-1' as expected_id, 
    EXISTS(SELECT 1 FROM public.courses WHERE id = 'workshop-1') as exists
UNION ALL
SELECT 
    'workshop-2' as expected_id, 
    EXISTS(SELECT 1 FROM public.courses WHERE id = 'workshop-2') as exists
UNION ALL
SELECT 
    'workshop-3' as expected_id, 
    EXISTS(SELECT 1 FROM public.courses WHERE id = 'workshop-3') as exists
UNION ALL
SELECT 
    'workshop-4' as expected_id, 
    EXISTS(SELECT 1 FROM public.courses WHERE id = 'workshop-4') as exists
UNION ALL
SELECT 
    'workshop-5' as expected_id, 
    EXISTS(SELECT 1 FROM public.courses WHERE id = 'workshop-5') as exists;

-- 3. Atualizar IDs para os valores esperados pelo frontend
-- Se os cursos existem com IDs diferentes, atualizamos para os IDs corretos

-- Primeiro, remover inscrições temporariamente para evitar conflitos de FK
CREATE TEMP TABLE temp_registration_courses_backup AS 
SELECT * FROM public.registration_courses;

DELETE FROM public.registration_courses;

-- 4. Atualizar IDs dos cursos para os valores esperados
UPDATE public.courses 
SET id = 'workshop-1' 
WHERE name = 'Produtos Digitais e Seus Fornecedores';

UPDATE public.courses 
SET id = 'workshop-2' 
WHERE name = 'Páginas de Vendas';

UPDATE public.courses 
SET id = 'workshop-3' 
WHERE name = 'Produção de Criativos';

UPDATE public.courses 
SET id = 'workshop-4' 
WHERE name = 'Gestão de Tráfego Pago';

UPDATE public.courses 
SET id = 'workshop-5' 
WHERE name = 'Técnicas de Vendas';

-- 5. Se algum curso não existe, inserir com o ID correto
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

-- 6. Verificar resultado
SELECT '=== CURSOS APÓS CORREÇÃO ===' AS info;
SELECT id, name, starts_at, capacity, is_active 
FROM public.courses 
ORDER BY starts_at;

-- 7. Restaurar inscrições se os IDs antigos existiam (opcional - descomente se necessário)
-- INSERT INTO public.registration_courses (registration_id, course_id)
-- SELECT registration_id, 
--        CASE course_id 
--            WHEN 'id_antigo_1' THEN 'workshop-1'
--            WHEN 'id_antigo_2' THEN 'workshop-2'
--            -- adicione mais mapeamentos conforme necessário
--            ELSE course_id
--        END
-- FROM temp_registration_courses_backup;

-- 8. Limpar tabela temporária
DROP TABLE IF EXISTS temp_registration_courses_backup;

-- 9. Recriar funções para garantir que estão atualizadas
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

SELECT '=== CORREÇÃO CONCLUÍDA ===' AS info;
SELECT 'Os IDs dos cursos foram atualizados para: workshop-1, workshop-2, workshop-3, workshop-4, workshop-5' AS mensagem;
