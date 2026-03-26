-- ============================================================
-- SCRIPT PARA ATUALIZAR HORÁRIOS DOS CURSOS
-- Altera de 13:00 para 14:00
-- ============================================================

-- Atualizar horários dos cursos
UPDATE public.courses 
SET starts_at = CASE id
    WHEN 'workshop-1' THEN '2026-04-06 14:00:00+00'::TIMESTAMPTZ
    WHEN 'workshop-2' THEN '2026-04-07 14:00:00+00'::TIMESTAMPTZ
    WHEN 'workshop-3' THEN '2026-04-08 14:00:00+00'::TIMESTAMPTZ
    WHEN 'workshop-4' THEN '2026-04-09 14:00:00+00'::TIMESTAMPTZ
    WHEN 'workshop-5' THEN '2026-04-10 14:00:00+00'::TIMESTAMPTZ
END
WHERE id IN ('workshop-1', 'workshop-2', 'workshop-3', 'workshop-4', 'workshop-5');

-- Verificar os horários atualizados
SELECT 'Horários atualizados com sucesso!' AS status;
SELECT id, name, starts_at FROM public.courses ORDER BY starts_at;
