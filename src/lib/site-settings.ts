import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { isSupabaseConfigured, requireSupabase } from '@/lib/supabase';

export type SiteSettings = {
  id: string;
  favicon_path: string | null;
  logo_main_path: string | null;
  logo_nav_path: string | null;
  headline: string | null;
  subheadline: string | null;
  cta_primary_label: string | null;
  cta_primary_url: string | null;
  hours_label: string | null;
  seo_title: string | null;
  seo_description: string | null;
  theme_primary: string | null;
  theme_secondary: string | null;
  theme_accent: string | null;
  theme_background: string | null;
  theme_foreground: string | null;
  enable_qr_code: boolean | null;
  enable_hero_banner: boolean | null;
  signature_path: string | null;
  enable_documents_section: boolean | null;
  documents_button_label: string | null;
  documents_page_title: string | null;
  documents_page_subtitle: string | null;
  updated_at: string;
};

export type RegistrationFormField = {
  id: string;
  field_key: string;
  label: string;
  field_type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox';
  is_required: boolean;
  placeholder: string | null;
  options_json: string[] | null;
  sort_order: number;
  is_active: boolean;
};

export const defaultSiteSettings: SiteSettings = {
  id: 'default',
  favicon_path: null,
  logo_main_path: null,
  logo_nav_path: null,
  headline: '',
  subheadline: '',
  cta_primary_label: 'Inscreva-se',
  cta_primary_url: '/registro',
  hours_label: '',
  seo_title: 'Evento de Capacitação',
  seo_description: 'Evento com inscrições e programação configuráveis.',
  theme_primary: null,
  theme_secondary: null,
  theme_accent: null,
  theme_background: null,
  theme_foreground: null,
  enable_qr_code: false,
  enable_hero_banner: false,
  signature_path: null,
  enable_documents_section: false,
  documents_button_label: 'Documentos',
  documents_page_title: 'Documentos para Download',
  documents_page_subtitle: 'Baixe os documentos disponíveis',
  updated_at: '',
};

const hexToHsl = (hex: string): string | null => {
  const clean = hex.replace('#', '').trim();
  const normalized = clean.length === 3 ? clean.split('').map((c) => `${c}${c}`).join('') : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;

  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;

  let h = 0;
  let s = 0;

  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
  }

  const hue = Math.round((h * 60 + 360) % 360);
  const sat = Math.round(s * 100);
  const light = Math.round(l * 100);
  return `${hue} ${sat}% ${light}%`;
};

export const getSiteAssetUrl = (assetPath: string | null | undefined) => {
  if (!assetPath) return null;
  if (assetPath.startsWith('http://') || assetPath.startsWith('https://') || assetPath.startsWith('/')) {
    return assetPath;
  }
  if (!isSupabaseConfigured) return null;
  const supabase = requireSupabase();
  return supabase.storage.from('site-assets').getPublicUrl(assetPath).data.publicUrl;
};

export const useSiteSettings = () =>
  useQuery({
    queryKey: ['site_settings'],
    staleTime: 60000,
    refetchOnWindowFocus: false,
    refetchInterval: 300000,
    queryFn: async () => {
      if (!isSupabaseConfigured) return defaultSiteSettings;
      const supabase = requireSupabase();
      const { data, error } = await supabase.rpc('get_site_settings');
      if (error || !data) return defaultSiteSettings;
      return { ...defaultSiteSettings, ...(data as SiteSettings) };
    },
  });

export type HeroBanner = {
  id: string;
  path: string;
  device_type: 'desktop' | 'mobile' | 'all';
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return isMobile;
};

export const useHeroBanners = () =>
  useQuery({
    queryKey: ['hero_banners'],
    staleTime: 60000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!isSupabaseConfigured) return [] as HeroBanner[];
      const supabase = requireSupabase();
      const { data, error } = await supabase.rpc('get_hero_banners');
      if (error) return [] as HeroBanner[];
      return (data ?? []) as HeroBanner[];
    },
  });

export const useRegistrationFormFields = () =>
  useQuery({
    queryKey: ['registration_form_fields'],
    staleTime: 60000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!isSupabaseConfigured) return [] as RegistrationFormField[];
      const supabase = requireSupabase();
      const { data, error } = await supabase.rpc('get_registration_form_fields');
      if (error) return [] as RegistrationFormField[];
      return (data ?? []) as RegistrationFormField[];
    },
  });

export const useApplySiteTheme = (settings: SiteSettings | undefined) => {
  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;
    const pairs: Array<[string, string | null]> = [
      ['--primary', settings.theme_primary],
      ['--secondary', settings.theme_secondary],
      ['--accent', settings.theme_accent],
      ['--background', settings.theme_background],
      ['--foreground', settings.theme_foreground],
    ];

    pairs.forEach(([variable, color]) => {
      if (!color) return;
      const hsl = hexToHsl(color);
      if (hsl) root.style.setProperty(variable, hsl);
    });

    const faviconUrl = getSiteAssetUrl(settings.favicon_path);
    if (faviconUrl) {
      let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = faviconUrl;
    }

    if (settings.seo_title?.trim()) {
      document.title = settings.seo_title.trim();
    }

    if (settings.seo_description?.trim()) {
      upsertMetaByName('description', settings.seo_description.trim());
    }

    const pageUrl = window.location.href;
    const socialImage =
      getSiteAssetUrl(settings.logo_main_path) ??
      getSiteAssetUrl(settings.logo_nav_path) ??
      getSiteAssetUrl(settings.favicon_path);

    if (settings.seo_title?.trim()) {
      upsertMetaByProperty('og:title', settings.seo_title.trim());
      upsertMetaByName('twitter:title', settings.seo_title.trim());
    }

    if (settings.seo_description?.trim()) {
      upsertMetaByProperty('og:description', settings.seo_description.trim());
      upsertMetaByName('twitter:description', settings.seo_description.trim());
    }

    upsertMetaByProperty('og:type', 'website');
    upsertMetaByProperty('og:url', pageUrl);
    upsertMetaByName('twitter:card', 'summary_large_image');

    if (socialImage) {
      upsertMetaByProperty('og:image', socialImage);
      upsertMetaByName('twitter:image', socialImage);
    }
  }, [settings]);
};

const upsertMetaByName = (name: string, content: string) => {
  let meta = document.querySelector(`meta[name='${name}']`) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = name;
    document.head.appendChild(meta);
  }
  meta.content = content;
};

const upsertMetaByProperty = (property: string, content: string) => {
  let meta = document.querySelector(`meta[property='${property}']`) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('property', property);
    document.head.appendChild(meta);
  }
  meta.content = content;
};
