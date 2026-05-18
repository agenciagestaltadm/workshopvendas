import { useMemo, useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Smartphone, QrCode, PowerOff } from 'lucide-react';
import QRCode from 'react-qr-code';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { getSiteAssetUrl, SiteSettings, useRegistrationFormFields, useSiteSettings, useHeroBanners, type HeroBanner } from '@/lib/site-settings';
import { requireSupabase } from '@/lib/supabase';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type EditableField = {
  id?: string;
  field_key: string;
  label: string;
  field_type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox';
  is_required: boolean;
  placeholder: string;
  options_csv: string;
  sort_order: number;
  is_active: boolean;
};

const emptyField: EditableField = {
  field_key: '',
  label: '',
  field_type: 'text',
  is_required: false,
  placeholder: '',
  options_csv: '',
  sort_order: 0,
  is_active: true,
};

export const SiteSettingsDialog = ({ open, onOpenChange }: Props) => {
  const queryClient = useQueryClient();
  const settingsQuery = useSiteSettings();
  const fieldsQuery = useRegistrationFormFields();
  const bannersQuery = useHeroBanners();
  const [draft, setDraft] = useState<SiteSettings | null>(null);
  const [fieldDraft, setFieldDraft] = useState<EditableField>(emptyField);
  const [uploadingAsset, setUploadingAsset] = useState<null | 'favicon' | 'logoMain' | 'logoNav' | 'signature'>(null);
  const [uploadingBanners, setUploadingBanners] = useState(false);
  const [bannerDeviceType, setBannerDeviceType] = useState<'desktop' | 'mobile' | 'all'>('all');

  const [whatsappStatus, setWhatsappStatus] = useState<{ status: string; qr: string | null }>({ status: 'disconnected', qr: null });
  const [whatsappLoading, setWhatsappLoading] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (open) {
      const checkStatus = async () => {
        try {
          const res = await fetch('/api/whatsapp/status');
          if (res.ok) {
            const data = await res.json();
            setWhatsappStatus(data);
          }
        } catch (e) {
          // Ignore
        }
      };
      checkStatus();
      interval = setInterval(checkStatus, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [open]);

  const toggleWhatsAppConnection = async () => {
    setWhatsappLoading(true);
    try {
      if (whatsappStatus.status === 'connected' || whatsappStatus.status === 'qr') {
        await fetch('/api/whatsapp/stop', { method: 'POST' });
        setWhatsappStatus({ status: 'disconnected', qr: null });
      } else {
        await fetch('/api/whatsapp/start', { method: 'POST' });
        setWhatsappStatus({ status: 'connecting', qr: null });
      }
    } catch (e) {
      toast({ title: 'Erro', description: 'Falha ao comunicar com o serviço do WhatsApp.', variant: 'destructive' });
    } finally {
      setWhatsappLoading(false);
    }
  };

  const current = draft ?? settingsQuery.data ?? null;

  const syncDraft = () => {
    if (settingsQuery.data) {
      setDraft(settingsQuery.data);
    }
  };

  const persistSiteSettingsPartial = async (partial: Partial<SiteSettings>) => {
    const supabase = requireSupabase();
    const { error } = await supabase.rpc('update_site_settings', { p_payload: partial });
    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey: ['site_settings'] });
    await queryClient.refetchQueries({ queryKey: ['site_settings'], exact: false });
  };

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      if (!current) return;
      const supabase = requireSupabase();
      const payload = {
        favicon_path: current.favicon_path,
        logo_main_path: current.logo_main_path,
        logo_nav_path: current.logo_nav_path,
        headline: current.headline,
        subheadline: current.subheadline,
        cta_primary_label: current.cta_primary_label,
        cta_primary_url: current.cta_primary_url,
        hours_label: current.hours_label,
        seo_title: current.seo_title,
        seo_description: current.seo_description,
        theme_primary: current.theme_primary,
        theme_secondary: current.theme_secondary,
        theme_accent: current.theme_accent,
        theme_background: current.theme_background,
        theme_foreground: current.theme_foreground,
        enable_qr_code: current.enable_qr_code,
        enable_hero_banner: current.enable_hero_banner,
        signature_path: current.signature_path,
        enable_documents_section: current.enable_documents_section,
        documents_button_label: current.documents_button_label,
        documents_page_title: current.documents_page_title,
        documents_page_subtitle: current.documents_page_subtitle,
        enable_whatsapp_messages: current.enable_whatsapp_messages,
        enable_whatsapp_certificates: current.enable_whatsapp_certificates,
      };
      const { error } = await supabase.rpc('update_site_settings', { p_payload: payload });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['site_settings'] });
      toast({ title: 'Configurações salvas', description: 'As mudanças foram aplicadas na Home.' });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Erro inesperado';
      toast({ title: 'Erro ao salvar configurações', description: message, variant: 'destructive' });
    },
  });

  const upsertFieldMutation = useMutation({
    mutationFn: async (value: EditableField) => {
      const supabase = requireSupabase();
      const options = value.options_csv
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

      const { error } = await supabase.rpc('admin_upsert_registration_form_field', {
        p_id: value.id ?? null,
        p_field_key: value.field_key.trim(),
        p_label: value.label.trim(),
        p_field_type: value.field_type,
        p_is_required: value.is_required,
        p_placeholder: value.placeholder.trim() || null,
        p_options_json: value.field_type === 'select' ? options : null,
        p_sort_order: value.sort_order || 0,
        p_is_active: value.is_active,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['registration_form_fields'] });
      setFieldDraft(emptyField);
      toast({ title: 'Campo salvo', description: 'Campo de inscrição atualizado.' });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Erro inesperado';
      toast({ title: 'Erro ao salvar campo', description: message, variant: 'destructive' });
    },
  });

  const deleteFieldMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = requireSupabase();
      const { error } = await supabase.rpc('admin_delete_registration_form_field', { p_id: id });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['registration_form_fields'] });
      toast({ title: 'Campo removido' });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Erro inesperado';
      toast({ title: 'Erro ao remover campo', description: message, variant: 'destructive' });
    },
  });

  const upsertBannerMutation = useMutation({
    mutationFn: async (value: { id?: string; path: string; device_type: 'desktop' | 'mobile' | 'all'; sort_order: number; is_active: boolean }) => {
      const supabase = requireSupabase();
      const { error } = await supabase.rpc('admin_upsert_hero_banner', {
        p_id: value.id ?? null,
        p_path: value.path,
        p_device_type: value.device_type,
        p_sort_order: value.sort_order,
        p_is_active: value.is_active,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['hero_banners'] });
      toast({ title: 'Banner salvo' });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Erro inesperado';
      toast({ title: 'Erro ao salvar banner', description: message, variant: 'destructive' });
    },
  });

  const deleteBannerMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = requireSupabase();
      const { error } = await supabase.rpc('admin_delete_hero_banner', { p_id: id });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['hero_banners'] });
      toast({ title: 'Banner removido' });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Erro inesperado';
      toast({ title: 'Erro ao remover banner', description: message, variant: 'destructive' });
    },
  });

  const uploadBanners = async (files: FileList) => {
    const supabase = requireSupabase();
    setUploadingBanners(true);
    try {
      const uploads = Array.from(files).map(async (file) => {
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: 'Arquivo muito grande',
            description: `${file.name} excede o limite de 5MB.`,
            variant: 'destructive',
          });
          return null;
        }
        const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
        const path = `hero-banner/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from('site-assets').upload(path, file, {
          upsert: true,
          contentType: file.type || 'image/png',
        });
        if (error) throw error;
        return path;
      });

      const paths = (await Promise.all(uploads)).filter((p): p is string => p !== null);
      const currentBanners = bannersQuery.data ?? [];
      const startOrder = currentBanners.length;

      const saves = paths.map((path, index) =>
        upsertBannerMutation.mutateAsync({
          path,
          device_type: bannerDeviceType,
          sort_order: startOrder + index,
          is_active: true,
        })
      );
      await Promise.all(saves);

      if (paths.length > 0) {
        toast({ title: 'Banners enviados', description: `${paths.length} banner(s) adicionado(s).` });
      }
    } finally {
      setUploadingBanners(false);
    }
  };

  const uploadAsset = async (asset: 'favicon' | 'logoMain' | 'logoNav' | 'signature', file: File) => {
    const supabase = requireSupabase();
    if (!current) return;
    setUploadingAsset(asset);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `${asset}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('site-assets').upload(path, file, {
        upsert: true,
        contentType: file.type || 'image/png',
      });
      if (error) throw error;

      const nextDraft: SiteSettings = {
        ...current,
        favicon_path: asset === 'favicon' ? path : current?.favicon_path ?? null,
        logo_main_path: asset === 'logoMain' ? path : current?.logo_main_path ?? null,
        logo_nav_path: asset === 'logoNav' ? path : current?.logo_nav_path ?? null,
        signature_path: asset === 'signature' ? path : current?.signature_path ?? null,
      };
      setDraft(nextDraft);

      await persistSiteSettingsPartial({
        favicon_path: nextDraft.favicon_path,
        logo_main_path: nextDraft.logo_main_path,
        logo_nav_path: nextDraft.logo_nav_path,
        signature_path: nextDraft.signature_path,
      });
      toast({ title: 'Imagem atualizada', description: 'Upload concluído e salvo nas configurações.' });
    } finally {
      setUploadingAsset(null);
    }
  };

  const sortedFields = useMemo(() => [...(fieldsQuery.data ?? [])].sort((a, b) => a.sort_order - b.sort_order), [fieldsQuery.data]);
  const selectedTypeDescription =
    fieldDraft.field_type === 'text'
      ? 'Texto curto (ex: Empresa, Instagram).'
      : fieldDraft.field_type === 'textarea'
      ? 'Texto longo com várias linhas (ex: Observações).'
      : fieldDraft.field_type === 'number'
      ? 'Somente números (ex: Idade).'
      : fieldDraft.field_type === 'date'
      ? 'Data no calendário (ex: Data de nascimento).'
      : fieldDraft.field_type === 'select'
      ? 'Lista de opções (ex: Tamanho da camiseta).'
      : 'Caixa de marcação (sim/não).';

  const normalizeFieldKey = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) {
          syncDraft();
        }
      }}
    >
      <DialogContent className="w-[95vw] max-w-6xl p-0 sm:max-h-[90vh] sm:overflow-hidden">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>Configurações globais do site</DialogTitle>
          <DialogDescription>Altere branding, textos, tema e formulário sem precisar de deploy.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[72vh] overflow-y-auto px-5 py-4">
          {!current ? (
            <p className="text-sm text-muted-foreground">Carregando configurações...</p>
          ) : (
            <Tabs defaultValue="branding" className="w-full">
              <TabsList className="mb-4 w-full justify-start overflow-x-auto">
                <TabsTrigger value="branding">Branding</TabsTrigger>
                <TabsTrigger value="content">Home Content</TabsTrigger>
                <TabsTrigger value="banners">Banners</TabsTrigger>
                <TabsTrigger value="documents">Documentos</TabsTrigger>
                <TabsTrigger value="seo">SEO</TabsTrigger>
                <TabsTrigger value="theme">Theme Tokens</TabsTrigger>
                <TabsTrigger value="fields">Campos de Inscrição</TabsTrigger>
                <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
              </TabsList>

              <TabsContent value="branding" className="space-y-5">
                <div className="grid gap-4 md:grid-cols-3">
                  {[ 
                    { key: 'favicon', label: 'Favicon', value: current.favicon_path },
                    { key: 'logoMain', label: 'Logo principal (Hero)', value: current.logo_main_path },
                    { key: 'logoNav', label: 'Logo da navbar', value: current.logo_nav_path },
                    { key: 'signature', label: 'Assinatura do certificado', value: current.signature_path },
                  ].map((asset) => (
                    <div key={asset.key} className="rounded-xl border p-4">
                      <Label>{asset.label}</Label>
                      <Input
                        className="mt-2"
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/x-icon,image/vnd.microsoft.icon"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          if (file.size > 5 * 1024 * 1024) {
                            toast({
                              title: 'Arquivo muito grande',
                              description: 'O limite de upload é 5MB.',
                              variant: 'destructive',
                            });
                            return;
                          }
                          try {
                            await uploadAsset(asset.key as 'favicon' | 'logoMain' | 'logoNav' | 'signature', file);
                          } catch (err) {
                            const message = err instanceof Error ? err.message : 'Erro inesperado';
                            toast({ title: 'Erro no upload', description: message, variant: 'destructive' });
                          }
                        }}
                        disabled={uploadingAsset !== null}
                      />
                      {uploadingAsset === asset.key && (
                        <p className="mt-2 text-xs text-muted-foreground">Enviando imagem...</p>
                      )}
                      {getSiteAssetUrl(asset.value) ? (
                        <img
                          src={`${getSiteAssetUrl(asset.value) ?? ''}?v=${current.updated_at ?? Date.now()}`}
                          alt={asset.label}
                          className="mt-3 h-20 w-full rounded-md border object-contain"
                        />
                      ) : (
                        <div className="mt-3 h-20 w-full rounded-md border bg-muted/30" />
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        className="mt-2 text-destructive"
                        onClick={async () => {
                          if (!current) return;
                          const nextDraft = {
                            ...current,
                            favicon_path: asset.key === 'favicon' ? null : current.favicon_path,
                            logo_main_path: asset.key === 'logoMain' ? null : current.logo_main_path,
                            logo_nav_path: asset.key === 'logoNav' ? null : current.logo_nav_path,
                            signature_path: asset.key === 'signature' ? null : current.signature_path,
                          };
                          setDraft(nextDraft);
                          try {
                            await persistSiteSettingsPartial({
                              favicon_path: nextDraft.favicon_path,
                              logo_main_path: nextDraft.logo_main_path,
                              logo_nav_path: nextDraft.logo_nav_path,
                              signature_path: nextDraft.signature_path,
                            });
                            toast({ title: 'Imagem removida', description: 'Alteração salva em tempo real.' });
                          } catch (err) {
                            const message = err instanceof Error ? err.message : 'Erro inesperado';
                            toast({ title: 'Erro ao remover imagem', description: message, variant: 'destructive' });
                          }
                        }}
                        disabled={uploadingAsset !== null}
                      >
                        Remover
                      </Button>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="content" className="space-y-4">
                <div>
                  <Label>Headline principal</Label>
                  <Input value={current.headline ?? ''} onChange={(e) => setDraft({ ...current, headline: e.target.value })} />
                </div>
                <div>
                  <Label>Subheadline</Label>
                  <Textarea
                    value={current.subheadline ?? ''}
                    onChange={(e) => setDraft({ ...current, subheadline: e.target.value })}
                    className="min-h-24"
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label>Texto do botão principal</Label>
                    <Input
                      value={current.cta_primary_label ?? ''}
                      onChange={(e) => setDraft({ ...current, cta_primary_label: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Destino do botão principal</Label>
                    <Input
                      value={current.cta_primary_url ?? ''}
                      onChange={(e) => setDraft({ ...current, cta_primary_url: e.target.value })}
                      placeholder="/registro"
                    />
                  </div>
                </div>
                <div>
                  <Label>Texto de horas por curso</Label>
                  <Input value={current.hours_label ?? ''} onChange={(e) => setDraft({ ...current, hours_label: e.target.value })} />
                </div>
                <div className="flex items-center gap-3 rounded-md border p-3">
                  <Switch
                    checked={current.enable_qr_code ?? false}
                    onCheckedChange={async (checked) => {
                      setDraft({ ...current, enable_qr_code: checked });
                      try {
                        await persistSiteSettingsPartial({ enable_qr_code: checked });
                        toast({ title: checked ? 'QR Code ativado' : 'QR Code desativado', description: checked ? 'QR Codes serão gerados nas novas inscrições.' : 'QR Codes não serão mais gerados.' });
                      } catch (err) {
                        const message = err instanceof Error ? err.message : 'Erro inesperado';
                        toast({ title: 'Erro ao alterar QR Code', description: message, variant: 'destructive' });
                        setDraft({ ...current, enable_qr_code: !checked });
                      }
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium">Ativar controle de acesso por QR Code</p>
                    <p className="text-xs text-muted-foreground">
                      Quando ativo, gera QR Code por curso na inscrição e libera scanner no painel admin.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-md border p-3">
                  <Switch
                    checked={current.enable_hero_banner ?? false}
                    onCheckedChange={async (checked) => {
                      setDraft({ ...current, enable_hero_banner: checked });
                      try {
                        await persistSiteSettingsPartial({ enable_hero_banner: checked });
                        toast({ title: checked ? 'Banner rotativo ativado' : 'Banner rotativo desativado', description: checked ? 'Os banners serão exibidos na home entre a logo e o texto principal.' : 'O banner rotativo será ocultado da home.' });
                      } catch (err) {
                        const message = err instanceof Error ? err.message : 'Erro inesperado';
                        toast({ title: 'Erro ao alterar banner', description: message, variant: 'destructive' });
                        setDraft({ ...current, enable_hero_banner: !checked });
                      }
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium">Ativar banner rotativo na Home</p>
                    <p className="text-xs text-muted-foreground">
                      Quando ativo, exibe um carrossel de banners na hero section, entre a logo e o texto principal.
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="documents" className="space-y-5">
                <div className="flex items-center gap-3 rounded-md border p-3">
                  <Switch
                    checked={current.enable_documents_section ?? false}
                    onCheckedChange={async (checked) => {
                      setDraft({ ...current, enable_documents_section: checked });
                      try {
                        await persistSiteSettingsPartial({ enable_documents_section: checked });
                        toast({ 
                          title: checked ? 'Seção de documentos ativada' : 'Seção de documentos desativada', 
                          description: checked 
                            ? 'A seção de documentos agora está visível no site.' 
                            : 'A seção de documentos foi ocultada do site.' 
                        });
                      } catch (err) {
                        const message = err instanceof Error ? err.message : 'Erro inesperado';
                        toast({ title: 'Erro ao alterar documentos', description: message, variant: 'destructive' });
                        setDraft({ ...current, enable_documents_section: !checked });
                      }
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium">Ativar seção de documentos</p>
                    <p className="text-xs text-muted-foreground">
                      Quando ativo, exibe um botão para documentos na página inicial e uma página de downloads.
                    </p>
                  </div>
                </div>

                {current.enable_documents_section && (
                  <div className="space-y-4 border rounded-lg p-4">
                    <div>
                      <Label>Texto do botão de documentos</Label>
                      <Input
                        value={current.documents_button_label ?? ''}
                        onChange={async (e) => {
                          const value = e.target.value;
                          setDraft({ ...current, documents_button_label: value });
                          try {
                            await persistSiteSettingsPartial({ documents_button_label: value });
                          } catch (err) {
                            toast({ title: 'Erro ao salvar', variant: 'destructive' });
                          }
                        }}
                        placeholder="Ex: Documentos, Downloads, Materiais"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Este texto aparecerá no botão que leva à página de documentos.
                      </p>
                    </div>

                    <div>
                      <Label>Título da página de documentos</Label>
                      <Input
                        value={current.documents_page_title ?? ''}
                        onChange={async (e) => {
                          const value = e.target.value;
                          setDraft({ ...current, documents_page_title: value });
                          try {
                            await persistSiteSettingsPartial({ documents_page_title: value });
                          } catch (err) {
                            toast({ title: 'Erro ao salvar', variant: 'destructive' });
                          }
                        }}
                        placeholder="Ex: Documentos para Download"
                      />
                    </div>

                    <div>
                      <Label>Subtítulo da página de documentos</Label>
                      <Input
                        value={current.documents_page_subtitle ?? ''}
                        onChange={async (e) => {
                          const value = e.target.value;
                          setDraft({ ...current, documents_page_subtitle: value });
                          try {
                            await persistSiteSettingsPartial({ documents_page_subtitle: value });
                          } catch (err) {
                            toast({ title: 'Erro ao salvar', variant: 'destructive' });
                          }
                        }}
                        placeholder="Ex: Baixe os documentos disponíveis"
                      />
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="banners" className="space-y-5">
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground bg-muted/30">
                  <p className="font-medium text-foreground mb-1">Dimensões recomendadas</p>
                  <p>Para melhor resultado visual, utilize imagens com as seguintes proporções:</p>
                  <ul className="mt-2 ml-4 list-disc space-y-1">
                    <li><strong>Desktop:</strong> 1920 x 500 pixels</li>
                    <li><strong>Mobile:</strong> 800 x 400 pixels</li>
                  </ul>
                </div>

                <div>
                  <Label>Dispositivo de destino</Label>
                  <select
                    className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={bannerDeviceType}
                    onChange={(e) => setBannerDeviceType(e.target.value as 'desktop' | 'mobile' | 'all')}
                  >
                    <option value="all">Ambos (Desktop e Mobile)</option>
                    <option value="desktop">Apenas Desktop</option>
                    <option value="mobile">Apenas Mobile</option>
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Selecione para qual dispositivo os banners enviados serao exibidos.
                  </p>
                </div>

                <div>
                  <Label>Upload de banners</Label>
                  <Input
                    className="mt-2"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    onChange={async (event) => {
                      const files = event.target.files;
                      if (!files || files.length === 0) return;
                      try {
                        await uploadBanners(files);
                      } catch (err) {
                        const message = err instanceof Error ? err.message : 'Erro inesperado';
                        toast({ title: 'Erro no upload', description: message, variant: 'destructive' });
                      }
                      event.target.value = '';
                    }}
                    disabled={uploadingBanners}
                  />
                  {uploadingBanners && (
                    <p className="mt-2 text-xs text-muted-foreground">Enviando banners...</p>
                  )}
                </div>

                <div className="space-y-2">
                  {(bannersQuery.data ?? []).length === 0 && (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      Nenhum banner cadastrado. Faça upload das imagens acima para adicionar banners ao carrossel.
                    </div>
                  )}
                  {[...(bannersQuery.data ?? [])].sort((a, b) => a.sort_order - b.sort_order).map((banner) => (
                    <div key={banner.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <img
                        src={`${getSiteAssetUrl(banner.path) ?? ''}?v=${banner.created_at ?? Date.now()}`}
                        alt="Banner"
                        className="h-16 w-24 rounded-md border object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{banner.path.split('/').pop()}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Label className="text-xs text-muted-foreground">Ordem:</Label>
                          <Input
                            type="number"
                            className="h-7 w-20 text-sm"
                            value={banner.sort_order}
                            onChange={(e) => {
                              const val = Number(e.target.value || 0);
                              upsertBannerMutation.mutate({
                                id: banner.id,
                                path: banner.path,
                                device_type: banner.device_type,
                                sort_order: val,
                                is_active: banner.is_active,
                              });
                            }}
                          />
                        </div>
                        <div className="mt-1">
                          <select
                            className="h-7 w-full max-w-[180px] rounded-md border border-input bg-background px-2 text-xs"
                            value={banner.device_type}
                            onChange={(e) => {
                              upsertBannerMutation.mutate({
                                id: banner.id,
                                path: banner.path,
                                device_type: e.target.value as 'desktop' | 'mobile' | 'all',
                                sort_order: banner.sort_order,
                                is_active: banner.is_active,
                              });
                            }}
                          >
                            <option value="all">Ambos</option>
                            <option value="desktop">Desktop</option>
                            <option value="mobile">Mobile</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={banner.is_active}
                          onCheckedChange={(checked) => {
                            upsertBannerMutation.mutate({
                              id: banner.id,
                              path: banner.path,
                              device_type: banner.device_type,
                              sort_order: banner.sort_order,
                              is_active: checked,
                            });
                          }}
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteBannerMutation.mutate(banner.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="seo" className="space-y-4">
                <div>
                  <Label>Título SEO (texto ao lado do favicon)</Label>
                  <Input
                    value={current.seo_title ?? ''}
                    onChange={(e) => setDraft({ ...current, seo_title: e.target.value })}
                    placeholder="Título da aba do navegador"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Esse é o texto que aparece na aba do navegador, ao lado do favicon.
                  </p>
                </div>
                <div>
                  <Label>Descrição SEO</Label>
                  <Textarea
                    value={current.seo_description ?? ''}
                    onChange={(e) => setDraft({ ...current, seo_description: e.target.value })}
                    className="min-h-20"
                    placeholder="Descrição da página para mecanismos de busca."
                  />
                </div>
              </TabsContent>

              <TabsContent value="theme" className="space-y-6">
                <div className="rounded-xl border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
                  <p className="mb-1 font-medium text-foreground">Como as cores funcionam?</p>
                  <p>
                    As opções abaixo alteram a aparência visual da home, dos botões, dos textos e das superfícies do sistema.
                    Cada seletor explica exatamente onde a cor aparece para evitar mudanças por tentativa e erro.
                  </p>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  {[
                    {
                      key: 'theme_primary',
                      label: 'Primária',
                      description:
                        'Afeta os elementos de maior destaque da interface, como botões principais, links importantes, ícones em evidência e indicadores ativos.',
                      examples: 'Exemplos visuais: botões "Inscreva-se", "Garantir minha vaga", ícones destacados e pontos ativos dos carrosséis.',
                      note: 'Prefira uma cor forte e contrastante, pois ela será a principal chamada visual da página.',
                    },
                    {
                      key: 'theme_secondary',
                      label: 'Secundária',
                      description:
                        'Afeta áreas de apoio da interface, especialmente fundos suaves, badges, blocos informativos e estados de hover mais discretos.',
                      examples: 'Exemplos visuais: selos de seção, cartões auxiliares, blocos de benefícios e fundos suaves usados para separar conteúdo.',
                      note: 'Funciona melhor como complemento da cor primária, sem competir com os CTAs principais.',
                    },
                    {
                      key: 'theme_accent',
                      label: 'Accent',
                      description:
                        'Afeta detalhes decorativos e realces sutis usados para dar acabamento visual, profundidade e variação na composição.',
                      examples: 'Exemplos visuais: brilhos decorativos, transições leves, elementos de apoio e pequenos destaques de composição.',
                      note: 'Use uma cor que converse com a identidade visual sem prejudicar a leitura do conteúdo.',
                    },
                    {
                      key: 'theme_background',
                      label: 'Background',
                      description:
                        'Afeta o fundo-base do site e das principais superfícies claras, servindo como pano de fundo para quase todo o conteúdo.',
                      examples: 'Exemplos visuais: fundo geral da home, áreas principais de leitura e superfícies amplas da interface.',
                      note: 'Recomendado usar tons claros ou suaves para preservar conforto visual e contraste com textos e botões.',
                    },
                    {
                      key: 'theme_foreground',
                      label: 'Foreground',
                      description:
                        'Afeta a cor do texto principal e de conteúdos de leitura prioritária, influenciando diretamente a legibilidade da interface.',
                      examples: 'Exemplos visuais: títulos, textos principais, rótulos e conteúdos de leitura em cartões e seções.',
                      note: 'Recomendado usar tons mais escuros ou de alto contraste em relação ao fundo.',
                    },
                  ].map(({ key, label, description, examples, note }) => (
                    <div key={key} className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <Label className="text-base font-semibold">{label}</Label>
                          <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-secondary-foreground">
                            Cor da interface
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
                        <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
                          <p className="font-medium text-foreground">Onde você vai perceber essa mudança?</p>
                          <p className="mt-1">{examples}</p>
                          <p className="mt-2">{note}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 pt-1">
                        <Input
                          type="color"
                          value={(current as Record<string, string | boolean | null>)[key] as string ?? '#000000'}
                          onChange={(e) => setDraft({ ...current, [key]: e.target.value } as unknown as SiteSettings)}
                          className="h-12 w-16 cursor-pointer p-1"
                        />
                        <Input
                          value={(current as Record<string, string | boolean | null>)[key] as string ?? ''}
                          onChange={(e) => setDraft({ ...current, [key]: e.target.value } as unknown as SiteSettings)}
                          className="font-mono text-sm uppercase"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="fields" className="space-y-4">
                <div className="rounded-xl border p-4">
                  <p className="mb-1 text-sm font-medium">Criar/editar campo global</p>
                  <p className="mb-4 text-xs text-muted-foreground">
                    Estes campos aparecem para todos os cursos no formulário de inscrição.
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="field_key">Chave técnica (única)</Label>
                      <Input
                        id="field_key"
                        placeholder="ex: empresa"
                        value={fieldDraft.field_key}
                        onChange={(e) => setFieldDraft({ ...fieldDraft, field_key: e.target.value })}
                        onBlur={() => setFieldDraft((prev) => ({ ...prev, field_key: normalizeFieldKey(prev.field_key) }))}
                      />
                      <p className="text-xs text-muted-foreground">Use uma palavra sem espaço. Exemplo: `instagram`, `empresa`.</p>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="field_label">Rótulo visível para o usuário</Label>
                      <Input
                        id="field_label"
                        placeholder="ex: Nome da empresa"
                        value={fieldDraft.label}
                        onChange={(e) => setFieldDraft({ ...fieldDraft, label: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="field_type">Tipo do campo</Label>
                      <select
                        id="field_type"
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={fieldDraft.field_type}
                        onChange={(e) => setFieldDraft({ ...fieldDraft, field_type: e.target.value as EditableField['field_type'] })}
                      >
                        <option value="text">Texto</option>
                        <option value="textarea">Texto longo</option>
                        <option value="number">Número</option>
                        <option value="date">Data</option>
                        <option value="select">Seleção (lista)</option>
                        <option value="checkbox">Caixa de marcação</option>
                      </select>
                      <p className="text-xs text-muted-foreground">{selectedTypeDescription}</p>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="field_order">Ordem de exibição</Label>
                      <Input
                        id="field_order"
                        type="number"
                        placeholder="0"
                        value={fieldDraft.sort_order}
                        onChange={(e) => setFieldDraft({ ...fieldDraft, sort_order: Number(e.target.value || 0) })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="field_placeholder">Texto de ajuda (placeholder)</Label>
                      <Input
                        id="field_placeholder"
                        placeholder="ex: Digite aqui"
                        value={fieldDraft.placeholder}
                        onChange={(e) => setFieldDraft({ ...fieldDraft, placeholder: e.target.value })}
                      />
                    </div>
                    {fieldDraft.field_type === 'select' ? (
                      <div className="space-y-1">
                        <Label htmlFor="field_options">Opções da lista</Label>
                        <Input
                          id="field_options"
                          placeholder="ex: P, M, G"
                          value={fieldDraft.options_csv}
                          onChange={(e) => setFieldDraft({ ...fieldDraft, options_csv: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">Separe cada opção por vírgula.</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Label>Opções da lista</Label>
                        <Input value="Disponível apenas no tipo Seleção (lista)" disabled />
                      </div>
                    )}
                    <div className="flex items-center gap-3 rounded-md border p-2">
                      <Switch
                        checked={fieldDraft.is_required}
                        onCheckedChange={(checked) => setFieldDraft({ ...fieldDraft, is_required: checked })}
                      />
                      <span className="text-sm">Obrigatório</span>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      onClick={() => {
                        const normalizedKey = normalizeFieldKey(fieldDraft.field_key);
                        if (!normalizedKey) {
                          toast({
                            title: 'Chave inválida',
                            description: 'Informe uma chave com letras/números, sem espaços.',
                            variant: 'destructive',
                          });
                          return;
                        }
                        if (fieldDraft.field_type === 'select' && !fieldDraft.options_csv.trim()) {
                          toast({
                            title: 'Opções obrigatórias',
                            description: 'Para campo de seleção, informe as opções separadas por vírgula.',
                            variant: 'destructive',
                          });
                          return;
                        }
                        upsertFieldMutation.mutate({ ...fieldDraft, field_key: normalizedKey });
                      }}
                      disabled={!fieldDraft.field_key.trim() || !fieldDraft.label.trim() || upsertFieldMutation.isPending}
                    >
                      {fieldDraft.id ? 'Atualizar campo' : 'Adicionar campo'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setFieldDraft(emptyField)}>
                      Limpar
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {sortedFields.length === 0 && (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      Nenhum campo personalizado criado ainda. Crie o primeiro campo usando o formulário acima.
                    </div>
                  )}
                  {sortedFields.map((field) => (
                    <div key={field.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">
                          {field.label} <span className="text-muted-foreground">({field.field_key})</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Tipo: {field.field_type} · Ordem: {field.sort_order} · {field.is_required ? 'Obrigatório' : 'Opcional'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setFieldDraft({
                              id: field.id,
                              field_key: field.field_key,
                              label: field.label,
                              field_type: field.field_type,
                              is_required: field.is_required,
                              placeholder: field.placeholder ?? '',
                              options_csv: Array.isArray(field.options_json) ? field.options_json.join(', ') : '',
                              sort_order: field.sort_order,
                              is_active: field.is_active,
                            })
                          }
                        >
                          Editar
                        </Button>
                        <Button type="button" size="icon" variant="ghost" onClick={() => deleteFieldMutation.mutate(field.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="whatsapp" className="space-y-5">
                <div className="rounded-xl border p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-6 w-6 text-primary" />
                    <div>
                      <h3 className="font-semibold">Conexão do WhatsApp</h3>
                      <p className="text-sm text-muted-foreground">
                        Conecte o seu número para enviar mensagens automáticas.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 items-center p-4 bg-muted/30 rounded-lg border">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${whatsappStatus.status === 'connected' ? 'bg-green-500' : whatsappStatus.status === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className="font-medium">
                          {whatsappStatus.status === 'connected' ? 'Conectado' : whatsappStatus.status === 'connecting' ? 'Conectando...' : whatsappStatus.status === 'qr' ? 'Aguardando Leitura do QR Code' : 'Desconectado'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {whatsappStatus.status === 'connected' ? 'O sistema está pronto para enviar mensagens.' : 'O sistema não pode enviar mensagens no momento.'}
                      </p>
                    </div>
                    
                    {whatsappStatus.status === 'qr' && whatsappStatus.qr && (
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <QRCode value={whatsappStatus.qr} size={150} />
                      </div>
                    )}

                    <Button 
                      onClick={toggleWhatsAppConnection} 
                      disabled={whatsappLoading}
                      variant={whatsappStatus.status === 'connected' ? 'destructive' : 'default'}
                      className="w-full sm:w-auto"
                    >
                      {whatsappStatus.status === 'connected' || whatsappStatus.status === 'qr' ? (
                        <><PowerOff className="w-4 h-4 mr-2" /> Desconectar</>
                      ) : (
                        <><QrCode className="w-4 h-4 mr-2" /> Iniciar Conexão</>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-md border p-3">
                    <Switch
                      checked={current.enable_whatsapp_messages ?? false}
                      onCheckedChange={async (checked) => {
                        setDraft({ ...current, enable_whatsapp_messages: checked });
                        try {
                          await persistSiteSettingsPartial({ enable_whatsapp_messages: checked });
                          toast({ title: checked ? 'Envio ativado' : 'Envio desativado' });
                        } catch (err) {
                          setDraft({ ...current, enable_whatsapp_messages: !checked });
                        }
                      }}
                    />
                    <div>
                      <p className="text-sm font-medium">Enviar confirmação de inscrição</p>
                      <p className="text-xs text-muted-foreground">
                        Envia uma mensagem automática com o QR Code logo após a inscrição (delay de 8-15s).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-md border p-3">
                    <Switch
                      checked={current.enable_whatsapp_certificates ?? false}
                      onCheckedChange={async (checked) => {
                        setDraft({ ...current, enable_whatsapp_certificates: checked });
                        try {
                          await persistSiteSettingsPartial({ enable_whatsapp_certificates: checked });
                          toast({ title: checked ? 'Envio ativado' : 'Envio desativado' });
                        } catch (err) {
                          setDraft({ ...current, enable_whatsapp_certificates: !checked });
                        }
                      }}
                    />
                    <div>
                      <p className="text-sm font-medium">Enviar certificado automaticamente</p>
                      <p className="text-xs text-muted-foreground">
                        Envia o certificado em PDF após o término do curso para quem teve presença confirmada (QR Code escaneado).
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
        <DialogFooter className="border-t px-5 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={() => saveSettingsMutation.mutate()} disabled={saveSettingsMutation.isPending || !current}>
            {saveSettingsMutation.isPending ? 'Salvando...' : 'Salvar configurações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
