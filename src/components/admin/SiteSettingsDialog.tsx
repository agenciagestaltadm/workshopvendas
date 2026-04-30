import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { getSiteAssetUrl, SiteSettings, useRegistrationFormFields, useSiteSettings } from '@/lib/site-settings';
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
  const [draft, setDraft] = useState<SiteSettings | null>(null);
  const [fieldDraft, setFieldDraft] = useState<EditableField>(emptyField);
  const [uploadingAsset, setUploadingAsset] = useState<null | 'favicon' | 'logoMain' | 'logoNav'>(null);

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
        theme_primary: current.theme_primary,
        theme_secondary: current.theme_secondary,
        theme_accent: current.theme_accent,
        theme_background: current.theme_background,
        theme_foreground: current.theme_foreground,
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

  const uploadAsset = async (asset: 'favicon' | 'logoMain' | 'logoNav', file: File) => {
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
      };
      setDraft(nextDraft);

      await persistSiteSettingsPartial({
        favicon_path: nextDraft.favicon_path,
        logo_main_path: nextDraft.logo_main_path,
        logo_nav_path: nextDraft.logo_nav_path,
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
                <TabsTrigger value="theme">Theme Tokens</TabsTrigger>
                <TabsTrigger value="fields">Campos de Inscrição</TabsTrigger>
              </TabsList>

              <TabsContent value="branding" className="space-y-5">
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    { key: 'favicon', label: 'Favicon', value: current.favicon_path },
                    { key: 'logoMain', label: 'Logo principal (Hero)', value: current.logo_main_path },
                    { key: 'logoNav', label: 'Logo da navbar', value: current.logo_nav_path },
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
                            await uploadAsset(asset.key as 'favicon' | 'logoMain' | 'logoNav', file);
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
                          };
                          setDraft(nextDraft);
                          try {
                            await persistSiteSettingsPartial({
                              favicon_path: nextDraft.favicon_path,
                              logo_main_path: nextDraft.logo_main_path,
                              logo_nav_path: nextDraft.logo_nav_path,
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
              </TabsContent>

              <TabsContent value="theme" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    ['theme_primary', 'Primária'],
                    ['theme_secondary', 'Secundária'],
                    ['theme_accent', 'Accent'],
                    ['theme_background', 'Background'],
                    ['theme_foreground', 'Foreground'],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <Label>{label}</Label>
                      <div className="mt-1 flex items-center gap-2">
                        <Input
                          type="color"
                          value={(current as Record<string, string | null>)[key] ?? '#000000'}
                          onChange={(e) => setDraft({ ...current, [key]: e.target.value } as SiteSettings)}
                          className="h-10 w-14 p-1"
                        />
                        <Input
                          value={(current as Record<string, string | null>)[key] ?? ''}
                          onChange={(e) => setDraft({ ...current, [key]: e.target.value } as SiteSettings)}
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
