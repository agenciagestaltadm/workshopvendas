-- DIAGNÓSTICO: Verificar estado do sistema de QR Code
-- Rode este script no SQL Editor do Supabase para identificar problemas

-- 1. Verificar se enable_qr_code existe e está ativado
SELECT 
  id, 
  enable_qr_code,
  CASE 
    WHEN enable_qr_code IS NULL THEN '❌ COLUNA NÃO EXISTE (NULL)'
    WHEN enable_qr_code = false THEN '⚠️ DESATIVADO (false)'
    WHEN enable_qr_code = true THEN '✅ ATIVADO (true)'
  END as status
FROM public.site_settings 
WHERE id = 'default';

-- 2. Verificar se as colunas de QR Code existem na tabela registration_courses
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'registration_courses'
  AND column_name IN ('qr_code', 'is_scanned', 'scanned_at')
ORDER BY column_name;

-- 3. Verificar se a coluna hours_label existe na tabela courses
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'courses'
  AND column_name = 'hours_label';

-- 4. Verificar se as funções RPC existem
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'generate_qr_codes_for_registration',
    'validate_and_scan_qr_code',
    'get_certificates_by_document',
    'get_site_settings'
  )
ORDER BY routine_name;

-- 5. Contar QR codes gerados
SELECT 
  COUNT(*) as total_registrations,
  COUNT(qr_code) as com_qr_code,
  COUNT(*) - COUNT(qr_code) as sem_qr_code,
  COUNT(CASE WHEN is_scanned THEN 1 END) as escaneados
FROM public.registration_courses;

-- 6. Se enable_qr_code está false, ATIVAR:
-- DESCOMENTE A LINHA ABAIXO para ativar o QR Code:
-- UPDATE public.site_settings SET enable_qr_code = true WHERE id = 'default';
