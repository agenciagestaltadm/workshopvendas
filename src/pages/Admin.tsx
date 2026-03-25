import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Mail,
  MessageCircle,
  MoreVertical,
  Trash2,
  BookOpen,
  Edit3,
  Pause,
  Play,
  AlertTriangle,
  Power,
  Users,
  ChevronDown,
  ChevronUp,
  Search,
  X
} from 'lucide-react';

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
  is_active: boolean;
  filled: number;
  remaining: number;
};

type CourseInfo = {
  name: string;
  starts_at: string;
};

type RegistrationCourse = {
  course_id: string;
  courses: CourseInfo | null;
};

type RegistrationRow = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  document: string;
  registration_courses: RegistrationCourse[];
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

const formatDateShort = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
};

const Admin = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAllowed, setIsAllowed] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<RegistrationRow | null>(null);
  const [exporting, setExporting] = useState<null | 'full' | 'disparo'>(null);

  // Estados para edição de curso
  const [editingCourse, setEditingCourse] = useState<CourseAvailability | null>(null);
  const [newCapacity, setNewCapacity] = useState('');

  // Estados para controle global
  const [globalActionDialog, setGlobalActionDialog] = useState<null | 'pause' | 'resume'>(null);

  // Estados para busca e filtro
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

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
      const { data, error } = await supabase.rpc('get_all_courses_admin', {});
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
        .select(`
          id,
          created_at,
          name,
          email,
          phone,
          document,
          registration_courses(
            course_id,
            courses(name, starts_at)
          )
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as RegistrationRow[];
    },
  });

  const totalRegistrations = registrationsQuery.data?.length ?? 0;
  const activeCoursesCount = availabilityQuery.data?.filter(c => c.is_active).length ?? 0;
  const inactiveCoursesCount = availabilityQuery.data?.filter(c => !c.is_active).length ?? 0;

  // Filtro de inscrições
  const filteredRegistrations = useMemo(() => {
    if (!searchQuery.trim()) return registrationsQuery.data ?? [];
    const query = searchQuery.toLowerCase();
    return (registrationsQuery.data ?? []).filter(row =>
      row.name.toLowerCase().includes(query) ||
      row.email.toLowerCase().includes(query) ||
      row.phone.includes(query) ||
      row.document.includes(query) ||
      row.registration_courses.some(rc =>
        rc.courses?.name?.toLowerCase().includes(query)
      )
    );
  }, [registrationsQuery.data, searchQuery]);

  // Mutações para controle de cursos
  const updateCapacityMutation = useMutation({
    mutationFn: async ({ courseId, capacity }: { courseId: string; capacity: number }) => {
      const supabase = requireSupabase();
      const { error } = await supabase.rpc('update_course_capacity', {
        p_course_id: courseId,
        p_new_capacity: capacity,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingCourse(null);
      setNewCapacity('');
      queryClient.invalidateQueries({ queryKey: ['admin_availability'] });
      toast({ title: 'Vagas atualizadas', description: 'A capacidade do curso foi atualizada com sucesso.' });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Erro inesperado';
      toast({ title: 'Erro ao atualizar', description: message, variant: 'destructive' });
    },
  });

  const toggleCourseStatusMutation = useMutation({
    mutationFn: async ({ courseId, isActive }: { courseId: string; isActive: boolean }) => {
      const supabase = requireSupabase();
      const { error } = await supabase.rpc('update_course_status', {
        p_course_id: courseId,
        p_is_active: isActive,
      });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin_availability'] });
      toast({
        title: variables.isActive ? 'Curso ativado' : 'Curso pausado',
        description: variables.isActive
          ? 'As inscrições para este curso estão abertas.'
          : 'As inscrições para este curso foram pausadas.'
      });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Erro inesperado';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    },
  });

  const globalStatusMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      const supabase = requireSupabase();
      const { error } = await supabase.rpc('update_all_courses_status', {
        p_is_active: isActive,
      });
      if (error) throw error;
    },
    onSuccess: (_, isActive) => {
      setGlobalActionDialog(null);
      queryClient.invalidateQueries({ queryKey: ['admin_availability'] });
      toast({
        title: isActive ? 'Todas as inscrições ativadas' : 'Todas as inscrições pausadas',
        description: isActive
          ? 'Todos os cursos agora estão aceitando inscrições.'
          : 'Todos os cursos foram pausados e não aceitam novas inscrições.'
      });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Erro inesperado';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    },
  });

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
        // Silently ignore audit log errors
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
    return (registrationsQuery.data ?? []).map((row) => {
      const courses = row.registration_courses
        .map(rc => {
          const courseName = rc.courses?.name ?? rc.course_id;
          const date = rc.courses?.starts_at ? formatDateTime(rc.courses.starts_at) : '';
          return date ? `${courseName} (${date})` : courseName;
        })
        .join('; ');

      return {
        createdAt: row.created_at,
        name: row.name,
        email: row.email,
        phone: row.phone,
        document: row.document,
        course: courses || 'Nenhum curso',
      };
    });
  }, [registrationsQuery.data]);

  const handleDownloadFull = async () => {
    if (exporting) return;
    if (exportRows.length === 0) {
      toast({ title: 'Nada para exportar', description: 'Nenhuma inscrição foi encontrada.' });
      return;
    }

    const invalid = exportRows.find((row) => !row.name.trim() || !row.email.trim() || !row.phone.trim());
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

  const openEditDialog = (course: CourseAvailability) => {
    setEditingCourse(course);
    setNewCapacity(course.capacity.toString());
  };

  const handleSaveCapacity = () => {
    if (!editingCourse) return;
    const capacity = parseInt(newCapacity, 10);
    if (isNaN(capacity) || capacity < 1) {
      toast({ title: 'Valor inválido', description: 'A capacidade deve ser um número maior que 0.', variant: 'destructive' });
      return;
    }
    updateCapacityMutation.mutate({ courseId: editingCourse.course_id, capacity });
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
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">Admin</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Total de inscrições: <span className="font-semibold text-foreground">{totalRegistrations}</span>
                {' · '}
                <span className="text-emerald-600">{activeCoursesCount} ativos</span>
                {' · '}
                <span className="text-amber-600">{inactiveCoursesCount} pausados</span>
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setGlobalActionDialog('pause')}>
                <Pause className="mr-2 h-4 w-4" />
                Pausar Todos
              </Button>
              <Button variant="outline" onClick={() => setGlobalActionDialog('resume')}>
                <Play className="mr-2 h-4 w-4" />
                Ativar Todos
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                Sair
              </Button>
            </div>
          </div>

          {/* Seção de Cursos */}
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-foreground">Gerenciar Cursos</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {availabilityQuery.data?.map((course) => {
                const ratio = course.capacity > 0 ? course.filled / course.capacity : 0;
                const percent = Math.min(100, Math.max(0, ratio * 100));
                const status = course.remaining <= 0 ? 'sold_out' : course.remaining <= 5 ? 'last_spots' : 'available';
                const tone =
                  status === 'sold_out' ? 'text-destructive' : status === 'last_spots' ? 'text-amber-600' : 'text-emerald-600';

                return (
                  <div
                    key={course.course_id}
                    className={`rounded-2xl border-2 p-5 shadow-soft transition-all ${
                      course.is_active ? 'border-border bg-card' : 'border-amber-200 bg-amber-50/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold text-foreground">{course.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(course.starts_at)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
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
                        {!course.is_active && (
                          <Badge variant="outline" className="border-amber-500 text-amber-600">
                            <Pause className="mr-1 h-3 w-3" />
                            Pausado
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                      <div className="rounded-xl bg-muted px-3 py-2">
                        <p className="text-xs font-medium text-muted-foreground">Capacidade</p>
                        <p className="mt-1 text-base font-semibold text-foreground">{course.capacity}</p>
                      </div>
                      <div className="rounded-xl bg-muted px-3 py-2">
                        <p className="text-xs font-medium text-muted-foreground">Inscritos</p>
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
                        <div
                          className={`h-full rounded-full ${tone} bg-current transition-[width] duration-500 ease-out`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => openEditDialog(course)}
                      >
                        <Edit3 className="mr-1.5 h-4 w-4" />
                        Editar Vagas
                      </Button>
                      <Button
                        variant={course.is_active ? 'destructive' : 'default'}
                        size="sm"
                        className="flex-1"
                        onClick={() => toggleCourseStatusMutation.mutate({ courseId: course.course_id, isActive: !course.is_active })}
                        disabled={toggleCourseStatusMutation.isPending}
                      >
                        {course.is_active ? (
                          <>
                            <Pause className="mr-1.5 h-4 w-4" />
                            Pausar
                          </>
                        ) : (
                          <>
                            <Play className="mr-1.5 h-4 w-4" />
                            Ativar
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}

              {availabilityQuery.data?.length === 0 && (
                <div className="rounded-2xl border border-border bg-card p-6 text-center">
                  <p className="text-base text-muted-foreground">
                    Nenhum curso encontrado. Verifique o seed da tabela <strong>courses</strong>.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Seção de Inscrições */}
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

            {/* Busca */}
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email, telefone, CPF ou curso..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>

            <p className="mt-2 text-sm text-muted-foreground">
              {filteredRegistrations.length} {filteredRegistrations.length === 1 ? 'inscrição encontrada' : 'inscrições encontradas'}
            </p>

            {/* Lista de Inscrições em Cards Expansíveis */}
            <div className="mt-4 space-y-3">
              {filteredRegistrations.map((row) => {
                const courseCount = row.registration_courses?.length ?? 0;
                const isExpanded = expandedItems.includes(row.id);

                return (
                  <div
                    key={row.id}
                    className="rounded-xl border border-border bg-card overflow-hidden"
                  >
                    <div
                      className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => {
                        setExpandedItems(prev =>
                          prev.includes(row.id)
                            ? prev.filter(id => id !== row.id)
                            : [...prev, row.id]
                        );
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">{row.name}</h3>
                            <Badge variant="secondary" className="text-xs">
                              <BookOpen className="mr-1 h-3 w-3" />
                              {courseCount} {courseCount === 1 ? 'curso' : 'cursos'}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{row.email}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span>{row.phone}</span>
                            <span>·</span>
                            <span>CPF: {row.document}</span>
                            <span>·</span>
                            <span>{formatDateTime(row.created_at)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  const phone = normalizePhoneForWhatsApp(row.phone);
                                  window.open(`https://wa.me/${phone}`, '_blank', 'noopener,noreferrer');
                                }}
                              >
                                <MessageCircle className="mr-2 h-4 w-4" />
                                WhatsApp
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  const subject = encodeURIComponent('Inscrição confirmada - Workshop de Vendas Online');
                                  const body = encodeURIComponent(`Olá ${row.name}! Segue uma atualização sobre sua inscrição.`);
                                  window.location.href = `mailto:${row.email}?subject=${subject}&body=${body}`;
                                }}
                              >
                                <Mail className="mr-2 h-4 w-4" />
                                Email
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                                onClick={() => setDeleteTarget(row)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Apagar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-border bg-muted/20">
                        <p className="py-2 text-sm font-medium text-foreground">Cursos inscritos:</p>
                        <div className="grid gap-2">
                          {row.registration_courses?.map((rc, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between rounded-lg bg-background p-3 text-sm"
                            >
                              <div>
                                <p className="font-medium text-foreground">{rc.courses?.name ?? rc.course_id}</p>
                                <p className="text-xs text-muted-foreground">
                                  {rc.courses?.starts_at ? formatDateTime(rc.courses.starts_at) : 'Data não definida'}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredRegistrations.length === 0 && (
                <div className="rounded-xl border border-border bg-card p-8 text-center">
                  <Users className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">
                    {searchQuery ? 'Nenhuma inscrição encontrada para esta busca.' : 'Nenhuma inscrição registrada ainda.'}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
      <Footer />

      {/* Dialog de Edição de Vagas */}
      <Dialog open={Boolean(editingCourse)} onOpenChange={() => setEditingCourse(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Vagas</DialogTitle>
            <DialogDescription>
              Altere a quantidade de vagas disponíveis para o curso <strong>{editingCourse?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="capacity">Nova capacidade</Label>
            <Input
              id="capacity"
              type="number"
              min={editingCourse?.filled || 1}
              value={newCapacity}
              onChange={(e) => setNewCapacity(e.target.value)}
              className="mt-2"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Atualmente {editingCourse?.filled} inscritos. O valor mínimo é {editingCourse?.filled || 1}.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCourse(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveCapacity}
              disabled={updateCapacityMutation.isPending}
            >
              {updateCapacityMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Ação Global */}
      <AlertDialog open={Boolean(globalActionDialog)} onOpenChange={() => setGlobalActionDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {globalActionDialog === 'pause' ? 'Pausar Todas as Inscrições' : 'Ativar Todas as Inscrições'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {globalActionDialog === 'pause'
                ? 'Isso pausará as inscrições para TODOS os cursos. Nenhuma nova inscrição será aceita até que você reative manualmente.'
                : 'Isso ativará as inscrições para TODOS os cursos. Os usuários poderão se inscrever em todos os cursos disponíveis.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => globalStatusMutation.mutate(globalActionDialog === 'resume')}
              disabled={globalStatusMutation.isPending}
              className={globalActionDialog === 'pause' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {globalStatusMutation.isPending
                ? 'Processando...'
                : globalActionDialog === 'pause'
                ? 'Sim, Pausar Todos'
                : 'Sim, Ativar Todos'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
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
              <div className="mt-2 flex flex-wrap gap-1">
                {deleteTarget.registration_courses?.map((rc, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {rc.courses?.name ?? rc.course_id}
                  </Badge>
                ))}
              </div>
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
