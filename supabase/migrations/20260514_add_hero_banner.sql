-- Sistema de Banner Rotativo na Hero Section

-- 1. Adicionar flag enable_hero_banner nas site_settings
ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS enable_hero_banner BOOLEAN DEFAULT false;

UPDATE public.site_settings
SET enable_hero_banner = false
WHERE enable_hero_banner IS NULL;

-- 2. Criar tabela de banners do hero
CREATE TABLE IF NOT EXISTS public.hero_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'all' CHECK (device_type IN ('desktop', 'mobile', 'all')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Criar index para performance
CREATE INDEX IF NOT EXISTS idx_hero_banners_active_order
  ON public.hero_banners(is_active, sort_order, created_at);

-- 4. RLS policies para hero_banners
ALTER TABLE public.hero_banners ENABLE ROW LEVEL SECURITY;

-- Adicionar device_type em banners existentes (migration incremental)
ALTER TABLE public.hero_banners
ADD COLUMN IF NOT EXISTS device_type TEXT NOT NULL DEFAULT 'all' CHECK (device_type IN ('desktop', 'mobile', 'all'));

DROP POLICY IF EXISTS "Public can read active hero banners" ON public.hero_banners;
CREATE POLICY "Public can read active hero banners"
ON public.hero_banners
FOR SELECT
USING (is_active = true OR auth.email() = 'admgestalt@gmail.com');

DROP POLICY IF EXISTS "Admin can manage hero banners" ON public.hero_banners;
CREATE POLICY "Admin can manage hero banners"
ON public.hero_banners
FOR ALL
TO authenticated
USING (auth.email() = 'admgestalt@gmail.com')
WITH CHECK (auth.email() = 'admgestalt@gmail.com');

-- 5. RPC para buscar banners ativos (publico)
DROP FUNCTION IF EXISTS public.get_hero_banners();
CREATE OR REPLACE FUNCTION public.get_hero_banners()
RETURNS TABLE (
  id UUID,
  path TEXT,
  device_type TEXT,
  sort_order INTEGER,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT
    hb.id,
    hb.path,
    hb.device_type,
    hb.sort_order,
    hb.is_active,
    hb.created_at
  FROM public.hero_banners hb
  WHERE hb.is_active = true
  ORDER BY hb.sort_order ASC, hb.created_at ASC;
$$;

-- 6. RPC para upsert banner (admin)
DROP FUNCTION IF EXISTS public.admin_upsert_hero_banner(
  p_id UUID,
  p_path TEXT,
  p_sort_order INTEGER,
  p_is_active BOOLEAN
);
DROP FUNCTION IF EXISTS public.admin_upsert_hero_banner(
  p_id UUID,
  p_path TEXT,
  p_device_type TEXT,
  p_sort_order INTEGER,
  p_is_active BOOLEAN
);
CREATE OR REPLACE FUNCTION public.admin_upsert_hero_banner(
  p_id UUID,
  p_path TEXT,
  p_device_type TEXT,
  p_sort_order INTEGER,
  p_is_active BOOLEAN
)
RETURNS public.hero_banners
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result public.hero_banners;
BEGIN
  IF auth.email() IS DISTINCT FROM 'admgestalt@gmail.com' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.hero_banners (path, device_type, sort_order, is_active)
    VALUES (p_path, COALESCE(p_device_type, 'all'), COALESCE(p_sort_order, 0), COALESCE(p_is_active, true))
    RETURNING * INTO v_result;
  ELSE
    UPDATE public.hero_banners
    SET
      path = COALESCE(p_path, path),
      device_type = COALESCE(p_device_type, device_type),
      sort_order = COALESCE(p_sort_order, sort_order),
      is_active = COALESCE(p_is_active, is_active)
    WHERE id = p_id
    RETURNING * INTO v_result;
  END IF;

  RETURN v_result;
END;
$$;

-- 7. RPC para deletar banner (admin)
DROP FUNCTION IF EXISTS public.admin_delete_hero_banner(p_id UUID);
CREATE OR REPLACE FUNCTION public.admin_delete_hero_banner(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.email() IS DISTINCT FROM 'admgestalt@gmail.com' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  DELETE FROM public.hero_banners WHERE id = p_id;
END;
$$;

-- 8. Atualizar update_site_settings para aceitar enable_hero_banner
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
    signature_path = COALESCE(p_payload->>'signature_path', signature_path),
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
    enable_qr_code = COALESCE((p_payload->>'enable_qr_code')::BOOLEAN, enable_qr_code),
    enable_hero_banner = COALESCE((p_payload->>'enable_hero_banner')::BOOLEAN, enable_hero_banner),
    updated_at = NOW()
  WHERE id = 'default'
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

-- 9. Comentarios
COMMENT ON FUNCTION public.get_hero_banners IS 'Retorna banners ativos do hero ordenados';
COMMENT ON FUNCTION public.admin_upsert_hero_banner IS 'Cria ou atualiza um banner do hero (admin)';
COMMENT ON FUNCTION public.admin_delete_hero_banner IS 'Remove um banner do hero (admin)';
