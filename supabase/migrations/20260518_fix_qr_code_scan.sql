-- Correção da RPC validate_and_scan_qr_code para atualizar ambas as colunas (is_scanned e scanned)

DROP FUNCTION IF EXISTS public.validate_and_scan_qr_code(p_qr_code TEXT);
CREATE OR REPLACE FUNCTION public.validate_and_scan_qr_code(p_qr_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rc RECORD;
  v_registration RECORD;
  v_course RECORD;
BEGIN
  -- Buscar o registration_courses pelo QR code
  SELECT rc.*
  INTO v_rc
  FROM public.registration_courses rc
  WHERE rc.qr_code = p_qr_code
  LIMIT 1;

  IF v_rc IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'NOT_FOUND',
      'message', 'QR Code não encontrado. Verifique se o código está correto.'
    );
  END IF;

  IF v_rc.scanned = true OR v_rc.is_scanned = true THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'ALREADY_SCANNED',
      'message', 'Este QR Code já foi utilizado em ' || COALESCE(v_rc.scanned_at::TEXT, 'data desconhecida') || '.',
      'scanned_at', v_rc.scanned_at
    );
  END IF;

  -- Buscar dados da inscrição e curso
  SELECT r.id, r.name, r.email, r.phone, r.document
  INTO v_registration
  FROM public.registrations r
  WHERE r.id = v_rc.registration_id;

  SELECT c.name, c.starts_at, c.time_label
  INTO v_course
  FROM public.courses c
  WHERE c.id = v_rc.course_id;

  -- Marcar como escaneado em AMBAS as colunas
  UPDATE public.registration_courses
  SET scanned = true, is_scanned = true, scanned_at = NOW()
  WHERE id = v_rc.id;

  RETURN jsonb_build_object(
    'valid', true,
    'message', 'Acesso liberado!',
    'registration_id', v_registration.id,
    'course_id', v_rc.course_id,
    'name', v_registration.name,
    'email', v_registration.email,
    'phone', v_registration.phone,
    'document', v_registration.document,
    'course_name', v_course.name,
    'course_starts_at', v_course.starts_at,
    'course_time_label', v_course.time_label
  );
END;
$$;