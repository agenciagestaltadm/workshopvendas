-- Execute no Supabase SQL Editor (uma vez)
-- https://supabase.com/dashboard/project/aqrcvrjdezunnrhlzegd/sql/new

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.admin_mark_registration_course_scanned(
  p_registration_id UUID,
  p_course_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_rc RECORD;
  v_qr_enabled BOOLEAN;
  v_qr_code TEXT;
BEGIN
  IF auth.email() IS DISTINCT FROM 'admgestalt@gmail.com' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_registration_id IS NULL OR p_course_id IS NULL OR trim(p_course_id) = '' THEN
    RAISE EXCEPTION 'INVALID_PARAMS: registration_id e course_id são obrigatórios';
  END IF;

  SELECT rc.*
  INTO v_rc
  FROM public.registration_courses rc
  WHERE rc.registration_id = p_registration_id
    AND rc.course_id = p_course_id
  LIMIT 1;

  IF v_rc IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: Inscrição não encontrada neste curso';
  END IF;

  IF COALESCE(v_rc.scanned, false) OR COALESCE(v_rc.is_scanned, false) THEN
    RAISE EXCEPTION 'ALREADY_SCANNED: Este QR Code já foi marcado como escaneado';
  END IF;

  SELECT COALESCE(enable_qr_code, false)
  INTO v_qr_enabled
  FROM public.site_settings
  WHERE id = 'default';

  IF NOT v_qr_enabled THEN
    RAISE EXCEPTION 'QR_DISABLED: QR Code não está ativo nas configurações';
  END IF;

  v_qr_code := v_rc.qr_code;

  IF v_qr_code IS NULL THEN
    v_qr_code := 'QR-' || encode(gen_random_bytes(12), 'hex');
  END IF;

  UPDATE public.registration_courses
  SET
    qr_code = v_qr_code,
    scanned = true,
    is_scanned = true,
    scanned_at = NOW()
  WHERE registration_id = p_registration_id
    AND course_id = p_course_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_mark_registration_course_scanned(UUID, TEXT) TO authenticated;
