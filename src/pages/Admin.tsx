import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, MessageCircle, MoreVertical, Trash2 } from 'lucide-react';

import Footer from '@/components/Footer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/use-toast';
import { buildDisparoXlsxBlob, buildFullWorkbookBlob, downloadBlob } from '@/lib/exports';
import { normalizePhoneForWhatsApp } from '@/lib/phone';
import { isSupabaseConfigured, requireSupabase } from '@/lib/supabase';

const ADMIN_EMAIL = 'admgestalt@gmail.com';

type CourseAvailability = {
  course_id: string;
  name: string;
  category: string;
  starts_at: string;
  capacity: number;
  filled: number;
  remaining: number;
};

type RegistrationRow = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  document: string;
  course_id: string;
  courses?: {
    name?: string;
    starts_at?: string;
  } | null;
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

const Admin = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAllowed, setIsAllowed] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<RegistrationRow | null>(null);
  const [exporting, setExporting] = useState<null | 'full' | 'disparo'>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      navigate('/');
      return;
    }

    const supabase = requireSupabase();
    let isActive = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isActive) return;
      if (error) {
        navigate('/');
        return;
      }

      const email = data.session?.user?.email ?? '';
      if (email !== ADMIN_EMAIL) {
        navigate('/');
        return;
      }

      setIsAllowed(true);
      setIsChecking(false);
    });

    return () => {
      isActive = false;
    };
  }, [navigate]);

  const availabilityQuery = useQuery({
    queryKey: ['admin_availability'],
    enabled: isAllowed,
    queryFn: async () => {
      const supabase = requireSupabase();
      const { data, error } = await supabase.rpc('get_course_availability', {});
      if (error) throw error;
      return (data ?? []) as CourseAvailability[];
    },
  });

  const registrationsQuery = useQuery({
    queryKey: ['admin_registrations'],
    enabled: isAllowed,
    queryFn: async () => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from('registrations')
        .select('id,created_at,name,email,phone,document,course_id,courses(name,starts_at)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as RegistrationRow[];
    },
  });

  const totalRegistrations = registrationsQuery.data?.length ?? 0;

  const empreendedorismo = useMemo(
    () => (availabilityQuery.data ?? []),
    [availabilityQuery.data],
  );

  const handleLogout = async () => {
    try {
      const supabase = requireSupabase();
      await supabase.auth.signOut();
      navigate('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro inesperado';
      toast({ title: 'Não foi possível sair', description: message, variant: 'destructive' });
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (row: RegistrationRow) => {
      const supabase = requireSupabase();

      const { error: deleteError } = await supabase.from('registrations').delete().eq('id', row.id);
      if (deleteError) throw deleteError;

      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({ action: 'delete_registration', registration_id: row.id, actor_email: ADMIN_EMAIL });

      if (auditError) {
        console.info('audit_log_failed', { registration_id: row.id, message: auditError.message });
      }
    },
    onSuccess: async () => {
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ['admin_registrations'] });
      await queryClient.invalidateQueries({ queryKey: ['admin_availability'] });
      toast({ title: 'Inscrição apagada', description: 'A inscrição foi removida com sucesso.' });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Erro inesperado';
      toast({ title: 'Não foi possível apagar', description: message, variant: 'destructive' });
    },
  });

  const exportRows = useMemo(() => {
    return (registrationsQuery.data ?? []).map((row) => ({
      createdAt: row.created_at,
      name: row.name,
      email: row.email,
      phone: row.phone,
      document: row.document,
      course:
        (row.courses?.name ?? row.course_id) + (row.courses?.starts_at ? ` (${formatDateTime(row.courses.starts_at)})` : ''),
    }));
  }, [registrationsQuery.data]);

  const handleDownloadFull = async () => {
    if (exporting) return;
    if (exportRows.length === 0) {
      toast({ title: 'Nada para exportar', description: 'Nenhuma inscrição foi encontrada.' });
      return;
    }

    const invalid = exportRows.find((row) => !row.name.trim() || !row.email.trim() || !row.phone.trim() || !row.course.trim());
    if (invalid) {
      toast({
        title: 'Dados incompletos',
        description: 'Há inscrições com campos vazios. Corrija os registros antes de exportar.',
        variant: 'destructive',
      });
      return;
    }

    setExporting('full');
    try {
      const blob = buildFullWorkbookBlob(exportRows);
      downloadBlob(`inscricoes-completo-${new Date().toISOString().slice(0, 10)}.xlsx`, blob);
      toast({ title: 'Download iniciado', description: 'Arquivo Excel completo gerado com sucesso.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro inesperado';
      toast({ title: 'Falha ao gerar Excel', description: message, variant: 'destructive' });
    } finally {
      setExporting(null);
    }
  };

  const handleDownloadDisparo = async () => {
    if (exporting) return;
    if (exportRows.length === 0) {
      toast({ title: 'Nada para exportar', description: 'Nenhuma inscrição foi encontrada.' });
      return;
    }

    const payload = exportRows.map((row) => ({ name: row.name, phone: normalizePhoneForWhatsApp(row.phone) }));
    const invalidCount = payload.filter((row) => !row.name.trim() || !/^\d{12,13}$/.test(row.phone)).length;
    if (invalidCount > 0) {
      toast({
        title: 'Telefones inválidos',
        description: `${invalidCount} registro(s) possuem telefone inválido para disparo. Ajuste antes de exportar.`,
        variant: 'destructive',
      });
      return;
    }

    setExporting('disparo');
    try {
      const blob = buildDisparoXlsxBlob(payload);
      downloadBlob(`inscricoes-disparo-${new Date().toISOString().slice(0, 10)}.xlsx`, blob);
      toast({ title: 'Download iniciado', description: 'Arquivo Excel para disparo gerado com sucesso.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro inesperado';
      toast({ title: 'Falha ao gerar Excel', description: message, variant: 'destructive' });
    } finally {
      setExporting(null);
    }
  };

  if (isChecking) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <main className="container mx-auto flex-1 px-4 pb-16 pt-12">
          <div className="mx-auto max-w-5xl rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Verificando acesso...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isAllowed) return null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="container mx-auto flex-1 px-4 pb-12 pt-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">Admin</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Total de inscrições: <span className="font-semibold text-foreground">{totalRegistrations}</span>
              </p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              Sair
            </Button>
          </div>

          <section className="mt-10">
            <h2 className="text-lg font-semibold text-foreground">Vagas por curso (Empreendedorismo)</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {empreendedorismo.map((course) => {
                const ratio = course.capacity > 0 ? course.filled / course.capacity : 0;
                const percent = Math.min(100, Math.max(0, ratio * 100));
                const status = course.remaining <= 0 ? 'sold_out' : course.remaining <= 5 ? 'last_spots' : 'available';
                const tone =
                  status === 'sold_out' ? 'text-destructive' : status === 'last_spots' ? 'text-amber-600' : 'text-emerald-600';

                return (
                  <div
                    key={course.course_id}
                    className="rounded-2xl border border-border bg-card p-5 shadow-soft transition-colors hover:bg-muted/30"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-foreground">{course.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(course.starts_at)}</p>
                      </div>
                      <Badge
                        className={
                          status === 'sold_out'
                            ? 'border-transparent bg-destructive text-destructive-foreground'
                            : status === 'last_spots'
                              ? 'border-transparent bg-amber-500 text-black'
                              : 'border-transparent bg-emerald-600 text-white'
                        }
                      >
                        {status === 'sold_out' ? 'Esgotado' : status === 'last_spots' ? 'Últimas vagas' : 'Disponível'}
                      </Badge>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                      <div className="rounded-xl bg-muted px-3 py-2">
                        <p className="text-xs font-medium text-muted-foreground">Capacidade</p>
                        <p className="mt-1 text-base font-semibold text-foreground">{course.capacity}</p>
                      </div>
                      <div className="rounded-xl bg-muted px-3 py-2">
                        <p className="text-xs font-medium text-muted-foreground">Inscritas</p>
                        <p className="mt-1 text-base font-semibold text-foreground">{course.filled}</p>
                      </div>
                      <div className="rounded-xl bg-muted px-3 py-2">
                        <p className="text-xs font-medium text-muted-foreground">Restantes</p>
                        <p className="mt-1 text-base font-semibold text-foreground">{course.remaining}</p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Ocupação</span>
                        <span className="font-medium">{Math.round(percent)}%</span>
                      </div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
                        <div className={`h-full rounded-full ${tone} bg-current transition-[width] duration-500 ease-out`} style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}

              {empreendedorismo.length === 0 && (
                <div className="rounded-2xl border border-border bg-card p-6 text-center">
                  <p className="text-base text-muted-foreground">
                    Nenhum curso encontrado. Verifique o seed da tabela <strong>courses</strong>.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="mt-10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-foreground">Inscrições</h2>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="outline" onClick={handleDownloadFull} disabled={exporting !== null}>
                  {exporting === 'full' ? 'Gerando...' : 'Baixar Excel Completo'}
                </Button>
                <Button type="button" variant="outline" onClick={handleDownloadDisparo} disabled={exporting !== null}>
                  {exporting === 'disparo' ? 'Gerando...' : 'Baixar Excel Disparo'}
                </Button>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-left text-sm">
                  <thead className="border-b border-border bg-muted/30">
                    <tr>
                      <th className="px-5 py-3 font-semibold text-foreground">Data</th>
                      <th className="px-5 py-3 font-semibold text-foreground">Nome</th>
                      <th className="px-5 py-3 font-semibold text-foreground">E-mail</th>
                      <th className="px-5 py-3 font-semibold text-foreground">Telefone</th>
                      <th className="px-5 py-3 font-semibold text-foreground">CPF/CNPJ</th>
                      <th className="px-5 py-3 font-semibold text-foreground">Curso</th>
                      <th className="px-5 py-3 text-right font-semibold text-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(registrationsQuery.data ?? []).map((row) => (
                      <tr key={row.id} className="border-b border-border last:border-b-0">
                        <td className="px-5 py-3 text-muted-foreground">{formatDateTime(row.created_at)}</td>
                        <td className="px-5 py-3 text-foreground">{row.name}</td>
                        <td className="px-5 py-3 text-muted-foreground">{row.email}</td>
                        <td className="px-5 py-3 text-muted-foreground">{row.phone}</td>
                        <td className="px-5 py-3 text-muted-foreground">{row.document}</td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {row.courses?.name ?? row.course_id}
                          {row.courses?.starts_at ? ` (${formatDateTime(row.courses.starts_at)})` : ''}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="ghost" size="icon" aria-label="Abrir ações">
                                <MoreVertical />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuItem
                                onSelect={() => {
                                  const phone = normalizePhoneForWhatsApp(row.phone);
                                  window.open(`https://wa.me/${phone}`, '_blank', 'noopener,noreferrer');
                                }}
                              >
                                <MessageCircle />
                                Enviar WhatsApp
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => {
                                  const subject = encodeURIComponent('Inscrição confirmada');
                                  const body = encodeURIComponent('Olá! Segue uma atualização sobre sua inscrição.');
                                  window.location.href = `mailto:${row.email}?subject=${subject}&body=${body}`;
                                }}
                              >
                                <Mail />
                                Enviar email
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                                onSelect={() => setDeleteTarget(row)}
                              >
                                <Trash2 />
                                Apagar inscrição
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                    {totalRegistrations === 0 && (
                      <tr>
                        <td colSpan={7} className="px-5 py-6 text-center text-muted-foreground">
                          Nenhuma inscrição registrada ainda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => (open ? null : setDeleteTarget(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar inscrição</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente. A inscrição selecionada será removida e não poderá ser recuperada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteTarget && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
              <p className="font-semibold text-foreground">{deleteTarget.name}</p>
              <p className="mt-1 text-muted-foreground">{deleteTarget.email}</p>
              <p className="mt-1 text-muted-foreground">{deleteTarget.phone}</p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
              disabled={!deleteTarget || deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Apagando...' : 'Apagar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Admin;
