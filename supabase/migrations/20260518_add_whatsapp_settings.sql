-- Adicionar campos para integração com WhatsApp Baileys

-- 1. Adicionar campos em site_settings
ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS enable_whatsapp_messages BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS enable_whatsapp_certificates BOOLEAN DEFAULT false;

-- Atualizar registros existentes
UPDATE public.site_settings
SET enable_whatsapp_messages = false, enable_whatsapp_certificates = false
WHERE enable_whatsapp_messages IS NULL OR enable_whatsapp_certificates IS NULL;

-- 2. Adicionar campo certificate_sent em registration_courses
ALTER TABLE public.registration_courses
ADD COLUMN IF NOT EXISTS certificate_sent BOOLEAN DEFAULT false;

-- 3. Atualizar a função update_site_settings
CREATE OR REPLACE FUNCTION public.update_site_settings(p_payload JSONB)
RETURNS public.site_settings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result public.site_settings;
BEGIN
  IF auth.email() IS DISTINCT FROM 'admgestalt@gmail.com' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  UPDATE public.site_settings
  SET
    favicon_path = COALESCE(p_payload->>'favicon_path', favicon_path),
    logo_main_path = COALESCE(p_payload->>'logo_main_path', logo_main_path),
    logo_nav_path = COALESCE(p_payload->>'logo_nav_path', logo_nav_path),
    headline = COALESCE(p_payload->>'headline', headline),
    subheadline = COALESCE(p_payload->>'subheadline', subheadline),
    cta_primary_label = COALESCE(p_payload->>'cta_primary_label', cta_primary_label),
    cta_primary_url = COALESCE(p_payload->>'cta_primary_url', cta_primary_url),
    hours_label = COALESCE(p_payload->>'hours_label', hours_label),
    seo_title = COALESCE(p_payload->>'seo_title', seo_title),
    seo_description = COALESCE(p_payload->>'seo_description', seo_description),
    theme_primary = COALESCE(p_payload->>'theme_primary', theme_primary),
    theme_secondary = COALESCE(p_payload->>'theme_secondary', theme_secondary),
    theme_accent = COALESCE(p_payload->>'theme_accent', theme_accent),
    theme_background = COALESCE(p_payload->>'theme_background', theme_background),
    theme_foreground = COALESCE(p_payload->>'theme_foreground', theme_foreground),
    enable_qr_code = COALESCE((p_payload->>'enable_qr_code')::boolean, enable_qr_code),
    enable_hero_banner = COALESCE((p_payload->>'enable_hero_banner')::boolean, enable_hero_banner),
    signature_path = COALESCE(p_payload->>'signature_path', signature_path),
    enable_documents_section = COALESCE((p_payload->>'enable_documents_section')::boolean, enable_documents_section),
    documents_button_label = COALESCE(p_payload->>'documents_button_label', documents_button_label),
    documents_page_title = COALESCE(p_payload->>'documents_page_title', documents_page_title),
    documents_page_subtitle = COALESCE(p_payload->>'documents_page_subtitle', documents_page_subtitle),
    -- NOVOS CAMPOS WHATSAPP
    enable_whatsapp_messages = COALESCE((p_payload->>'enable_whatsapp_messages')::boolean, enable_whatsapp_messages),
    enable_whatsapp_certificates = COALESCE((p_payload->>'enable_whatsapp_certificates')::boolean, enable_whatsapp_certificates),
    updated_at = NOW()
  WHERE id = 'default'
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;
