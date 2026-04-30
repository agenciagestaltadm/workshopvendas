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
  X,
  Plus,
  Calendar,
  Clock
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
import { Textarea } from '@/components/ui/textarea';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  buildDisparoContactsCsvBlob,
  buildDisparoContactsXlsxBlob,
  buildFullWorkbookBlob,
  downloadBlob,
  type DisparoExportRow,
  type FullExportRow,
} from '@/lib/exports';
import { normalizePhoneForDisparo, normalizePhoneForWhatsApp } from '@/lib/phone';
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
  description?: string;
  location?: string;
  facilitator?: string;
  time_label?: string;
  image_path?: string | null;
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

/** Gera linhas de export. Com `filterCourseId`, inclui só inscrições nesse curso e a coluna Curso reflete só esse curso. */
const buildFullExportRows = (rows: RegistrationRow[] | undefined, filterCourseId?: string): FullExportRow[] => {
  if (!rows?.length) return [];
  const out: FullExportRow[] = [];
  for (const row of rows) {
    const rcs = filterCourseId
      ? row.registration_courses.filter((rc) => rc.course_id === filterCourseId)
      : row.registration_courses;
    if (filterCourseId && rcs.length === 0) continue;
    const courseParts = rcs.map((rc) => {
      const courseName = rc.courses?.name ?? rc.course_id;
      const date = rc.courses?.starts_at ? formatDateTime(rc.courses.starts_at) : '';
      return date ? `${courseName} (${date})` : courseName;
    });
    const course = courseParts.length > 0 ? courseParts.join('; ') : 'Nenhum curso';
    out.push({
      createdAt: row.created_at,
      name: row.name,
      email: row.email,
      phone: row.phone,
      document: row.document,
      course,
    });
  }
  return out;
};

const formatDateShort = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
};

const Admin = () => {
  const COURSES_BUCKET = 'courses-images';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAllowed, setIsAllowed] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<RegistrationRow | null>(null);
  const [exporting, setExporting] = useState<null | 'full' | 'disparo'>(null);
  const [exportFullDialogOpen, setExportFullDialogOpen] = useState(false);
  const [fullExportScope, setFullExportScope] = useState<'all' | 'course'>('all');
  const [fullExportCourseId, setFullExportCourseId] = useState('');
  const [exportDisparoDialogOpen, setExportDisparoDialogOpen] = useState(false);
  const [disparoExportStep, setDisparoExportStep] = useState<1 | 2>(1);
  const [disparoExportScope, setDisparoExportScope] = useState<'all' | 'course'>('all');
  const [disparoExportCourseId, setDisparoExportCourseId] = useState('');
  const [disparoExportFormat, setDisparoExportFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteScope, setBulkDeleteScope] = useState<'all' | 'course'>('all');
  const [bulkDeleteCourseId, setBulkDeleteCourseId] = useState('');

  // Estados para edição de curso
  const [editingCourse, setEditingCourse] = useState<CourseAvailability | null>(null);
  const [newCapacity, setNewCapacity] = useState('');

  // Estados para CRUD de cursos
  const [isCourseFormOpen, setIsCourseFormOpen] = useState(false);
  const [editingCourseData, setEditingCourseData] = useState<CourseAvailability | null>(null);
  const [courseFormData, setCourseFormData] = useState({
    id: '',
    name: '',
    category: 'Curso',
    starts_at: '',
    capacity: '20',
    is_active: true,
    description: '',
    location: 'Sebrae - Parauapebas',
    facilitator: '',
    time_label: '',
    image_path: '',
  });
  const [courseImageFile, setCourseImageFile] = useState<File | null>(null);
  const [courseImagePreviewUrl, setCourseImagePreviewUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [courseFormStep, setCourseFormStep] = useState(1);
  const [deleteCourseTarget, setDeleteCourseTarget] = useState<CourseAvailability | null>(null);

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
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    queryFn: async () => {
      const supabase = requireSupabase();
      const { data, error } = await supabase.rpc('get_all_courses_admin', {});
      if (error) {
        if (import.meta.env.DEV) {
          console.error('[Admin] Erro ao carregar cursos:', error);
        }
        throw new Error('Falha ao carregar cursos. Verifique sua conexão.');
      }
      
      // Remover duplicatas baseado no course_id
      const uniqueCourses = new Map<string, CourseAvailability>();
      (data ?? []).forEach((course: CourseAvailability) => {
        if (!uniqueCourses.has(course.course_id)) {
          uniqueCourses.set(course.course_id, course);
        }
      });
      
      const result = Array.from(uniqueCourses.values());
      
      // Log apenas em desenvolvimento
      if (import.meta.env.DEV) {
        console.log('[Admin] Cursos carregados:', result.length, '(após remover duplicatas)');
      }
      return result;
    },
  });

  const registrationsQuery = useQuery({
    queryKey: ['admin_registrations'],
    enabled: isAllowed,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
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
      if (error) {
        if (import.meta.env.DEV) {
          console.error('[Admin] Erro ao carregar inscrições:', error);
        }
        throw new Error('Falha ao carregar inscrições. Verifique sua conexão.');
      }
      // Log apenas em desenvolvimento
      if (import.meta.env.DEV) {
        console.log('[Admin] Inscrições carregadas:', data?.length ?? 0);
      }
      return (data ?? []) as unknown as RegistrationRow[];
    },
  });

  const totalRegistrations = registrationsQuery.data?.length ?? 0;
  const activeCoursesCount = availabilityQuery.data?.filter(c => c.is_active).length ?? 0;
  const inactiveCoursesCount = availabilityQuery.data?.filter(c => !c.is_active).length ?? 0;

  const coursesForExportSelect = useMemo(() => {
    const list = availabilityQuery.data ?? [];
    return [...list].sort(
      (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    );
  }, [availabilityQuery.data]);

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
      if (error) {
        if (import.meta.env.DEV) {
          console.error('[Admin] Erro ao atualizar capacidade:', error);
        }
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      setEditingCourse(null);
      setNewCapacity('');
      // Invalidar ambas as queries para manter consistência
      queryClient.invalidateQueries({ queryKey: ['admin_availability'] });
      queryClient.invalidateQueries({ queryKey: ['course_availability'] });
      toast({ title: 'Vagas atualizadas', description: 'A capacidade do curso foi atualizada com sucesso.' });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Erro inesperado';
      toast({ title: 'Erro ao atualizar', description: message, variant: 'destructive' });
    },
  });

  const toggleCourseStatusMutation = useMutation({
    mutationFn: async ({ courseId, isActive }: { courseId: string; isActive: boolean }) => {
      if (!courseId || courseId.trim() === '') {
        throw new Error('ID do curso não pode ser vazio');
      }
      
      console.log('[Admin] Alterando status do curso:', { courseId, isActive });
      
      const supabase = requireSupabase();
      
      // Usar update direto na tabela em vez de RPC
      const { data, error } = await supabase
        .from('courses')
        .update({ is_active: isActive })
        .eq('id', courseId)
        .select();
      
      if (error) {
        console.error('[Admin] Erro ao atualizar status:', error);
        throw new Error(error.message);
      }
      
      console.log('[Admin] Status atualizado com sucesso:', data);
    },
    onSuccess: (_, variables) => {
      // Invalidar ambas as queries para manter consistência entre admin e página de registro
      queryClient.invalidateQueries({ queryKey: ['admin_availability'] });
      queryClient.invalidateQueries({ queryKey: ['course_availability'] });
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
      // Usar update direto na tabela em vez de RPC
      const { error } = await supabase
        .from('courses')
        .update({ is_active: isActive })
        .neq('id', ''); // WHERE id != '' (todos os cursos)
      
      if (error) {
        console.error('[Admin] Erro ao atualizar status global:', error);
        throw new Error(error.message);
      }
    },
    onSuccess: (_, isActive) => {
      setGlobalActionDialog(null);
      // Invalidar ambas as queries
      queryClient.invalidateQueries({ queryKey: ['admin_availability'] });
      queryClient.invalidateQueries({ queryKey: ['course_availability'] });
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
      
      // Primeiro deletar os registros relacionados na tabela registration_courses
      const { error: relError } = await supabase
        .from('registration_courses')
        .delete()
        .eq('registration_id', row.id);
      
      if (relError) {
        if (import.meta.env.DEV) {
          console.error('[Admin] Erro ao deletar relacionamentos:', relError);
        }
        throw new Error('Falha ao remover cursos da inscrição.');
      }
      
      // Depois deletar o registro principal
      const { error: deleteError } = await supabase.from('registrations').delete().eq('id', row.id);
      if (deleteError) {
        if (import.meta.env.DEV) {
          console.error('[Admin] Erro ao deletar inscrição:', deleteError);
        }
        throw new Error('Falha ao remover inscrição.');
      }

      // Tentar registrar no audit log (não crítico)
      try {
        await supabase
          .from('audit_logs')
          .insert({ action: 'delete_registration', registration_id: row.id, actor_email: ADMIN_EMAIL });
      } catch {
        // Silently ignore audit log errors
      }
    },
    onSuccess: async () => {
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ['admin_registrations'] });
      await queryClient.invalidateQueries({ queryKey: ['admin_availability'] });
      await queryClient.invalidateQueries({ queryKey: ['course_availability'] });
      toast({ title: 'Inscrição apagada', description: 'A inscrição foi removida com sucesso.' });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Erro inesperado';
      toast({ title: 'Não foi possível apagar', description: message, variant: 'destructive' });
    },
  });

  const bulkDeleteRegistrationsMutation = useMutation({
    mutationFn: async ({ scope, courseId }: { scope: 'all' | 'course'; courseId?: string }) => {
      const supabase = requireSupabase();
      const { error } = await supabase.rpc('admin_bulk_delete_registrations', {
        p_scope: scope,
        p_course_id: scope === 'course' ? courseId ?? null : null,
      });
      if (error) throw error;
    },
    onSuccess: async (_, variables) => {
      setBulkDeleteDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['admin_registrations'] });
      await queryClient.invalidateQueries({ queryKey: ['admin_availability'] });
      await queryClient.invalidateQueries({ queryKey: ['course_availability'] });
      toast({
        title: 'Inscrições removidas',
        description:
          variables.scope === 'all'
            ? 'Todas as inscrições foram excluídas com sucesso.'
            : 'As inscrições do curso selecionado foram excluídas com sucesso.',
      });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Erro inesperado';
      toast({ title: 'Não foi possível excluir inscrições', description: message, variant: 'destructive' });
    },
  });

  // Mutações para CRUD de cursos
  const createCourseMutation = useMutation({
    mutationFn: async (courseData: typeof courseFormData) => {
      const supabase = requireSupabase();
      const { error } = await supabase
        .from('courses')
        .insert({
          id: courseData.id,
          name: courseData.name,
          category: courseData.category,
          starts_at: new Date(courseData.starts_at).toISOString(),
          capacity: parseInt(courseData.capacity, 10),
          is_active: courseData.is_active,
          description: courseData.description.trim(),
          location: courseData.location.trim(),
          facilitator: courseData.facilitator.trim(),
          time_label: courseData.time_label.trim(),
          image_path: courseData.image_path.trim() || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      setIsCourseFormOpen(false);
      resetCourseForm();
      setCourseImageFile(null);
      setCourseImagePreviewUrl('');
      queryClient.invalidateQueries({ queryKey: ['admin_availability'] });
      queryClient.invalidateQueries({ queryKey: ['course_availability'] });
      toast({ title: 'Curso criado', description: 'O curso foi criado com sucesso.' });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Erro inesperado';
      toast({ title: 'Erro ao criar curso', description: message, variant: 'destructive' });
    },
  });

  const updateCourseMutation = useMutation({
    mutationFn: async (courseData: typeof courseFormData & { originalId: string }) => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from('courses')
        .update({
          name: courseData.name,
          category: courseData.category,
          starts_at: new Date(courseData.starts_at).toISOString(),
          capacity: parseInt(courseData.capacity, 10),
          is_active: courseData.is_active,
          description: courseData.description.trim(),
          location: courseData.location.trim(),
          facilitator: courseData.facilitator.trim(),
          time_label: courseData.time_label.trim(),
          image_path: courseData.image_path.trim() || null,
        })
        .eq('id', courseData.originalId)
        .select();
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Nenhum registro foi atualizado. Verifique se o curso existe.');
      }
      return data;
    },
    onSuccess: () => {
      setIsCourseFormOpen(false);
      setEditingCourseData(null);
      resetCourseForm();
      setCourseImageFile(null);
      setCourseImagePreviewUrl('');
      // Invalidar queries para atualizar UI
      queryClient.invalidateQueries({ queryKey: ['admin_availability'] });
      queryClient.invalidateQueries({ queryKey: ['course_availability'] });
      // Forçar refetch imediato para sincronização em tempo real
      queryClient.refetchQueries({ queryKey: ['admin_availability'], exact: false });
      queryClient.refetchQueries({ queryKey: ['course_availability'], exact: false });
      toast({ title: '✅ Curso atualizado', description: 'As alterações foram salvas e já estão visíveis para os usuários.' });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Erro inesperado';
      toast({ title: '❌ Erro ao atualizar curso', description: message, variant: 'destructive' });
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const supabase = requireSupabase();
      const { error } = await supabase.rpc('admin_delete_course_with_registrations', {
        p_course_id: courseId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDeleteCourseTarget(null);
      queryClient.invalidateQueries({ queryKey: ['admin_availability'] });
      queryClient.invalidateQueries({ queryKey: ['course_availability'] });
      toast({
        title: 'Curso excluído',
        description: 'O curso foi removido com sucesso. Inscrições vinculadas também foram excluídas.',
      });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Erro inesperado';
      toast({ title: 'Não foi possível excluir', description: message, variant: 'destructive' });
    },
  });

  const resetCourseForm = () => {
    setCourseFormData({
      id: '',
      name: '',
      category: 'Curso',
      starts_at: '',
      capacity: '20',
      is_active: true,
      description: '',
      location: 'Sebrae - Parauapebas',
      facilitator: '',
      time_label: '',
      image_path: '',
    });
  };
  const totalCourseFormSteps = 4;

  const getCourseStepLabel = (step: number) => {
    if (step === 1) return 'Básicos';
    if (step === 2) return 'Agenda e Local';
    if (step === 3) return 'Descrição e Palestrante';
    return 'Imagem e Revisão';
  };

  const getCoursePublicImageUrl = (imagePath?: string | null) => {
    if (!imagePath) return '';
    const supabase = requireSupabase();
    const { data } = supabase.storage.from(COURSES_BUCKET).getPublicUrl(imagePath);
    return data.publicUrl;
  };

  const uploadCourseImage = async (courseId: string, file: File) => {
    const supabase = requireSupabase();
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const safeCourseId = courseId.replace(/[^a-zA-Z0-9-_]/g, '-');
    const path = `${safeCourseId}/${Date.now()}.${extension}`;
    const { error } = await supabase.storage.from(COURSES_BUCKET).upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    if (error) throw error;
    return path;
  };

  const openCreateCourseForm = () => {
    resetCourseForm();
    setEditingCourseData(null);
    setCourseImageFile(null);
    setCourseImagePreviewUrl('');
    setCourseFormStep(1);
    setIsCourseFormOpen(true);
  };

  const openEditCourseForm = (course: CourseAvailability) => {
    setCourseFormData({
      id: course.course_id,
      name: course.name,
      category: course.category,
      starts_at: course.starts_at.slice(0, 16), // Format for datetime-local input
      capacity: course.capacity.toString(),
      is_active: course.is_active,
      description: course.description ?? '',
      location: course.location ?? 'Sebrae - Parauapebas',
      facilitator: course.facilitator ?? '',
      time_label: course.time_label ?? '',
      image_path: course.image_path ?? '',
    });
    setCourseImageFile(null);
    setCourseImagePreviewUrl(getCoursePublicImageUrl(course.image_path));
    setCourseFormStep(1);
    setEditingCourseData(course);
    setIsCourseFormOpen(true);
  };

  const validateCourseStep = (step: number) => {
    if (step === 1) {
      if (!courseFormData.id?.trim()) {
        toast({ title: 'ID do curso obrigatório', description: 'Informe um identificador único para o curso.', variant: 'destructive' });
        return false;
      }
      if (!courseFormData.name?.trim()) {
        toast({ title: 'Nome do curso obrigatório', description: 'Informe o nome do curso.', variant: 'destructive' });
        return false;
      }
      if (!editingCourseData) {
        const existingCourse = availabilityQuery.data?.find(c => c.course_id === courseFormData.id.trim());
        if (existingCourse) {
          toast({ title: 'ID já existe', description: 'Já existe um curso com este identificador.', variant: 'destructive' });
          return false;
        }
      }
    }

    if (step === 2) {
      if (!courseFormData.time_label?.trim()) {
        toast({ title: 'Horário obrigatório', description: 'Informe o horário de realização do curso.', variant: 'destructive' });
        return false;
      }
      if (!courseFormData.starts_at) {
        toast({ title: 'Data/hora obrigatória', description: 'Selecione a data e hora de início do curso.', variant: 'destructive' });
        return false;
      }
      const startDate = new Date(courseFormData.starts_at);
      if (isNaN(startDate.getTime())) {
        toast({ title: 'Data inválida', description: 'Selecione uma data e hora válidas.', variant: 'destructive' });
        return false;
      }
      const capacity = parseInt(courseFormData.capacity, 10);
      if (isNaN(capacity) || capacity < 1) {
        toast({ title: 'Capacidade inválida', description: 'A capacidade deve ser um número maior que 0.', variant: 'destructive' });
        return false;
      }
    }

    return true;
  };

  const handleNextCourseStep = () => {
    if (!validateCourseStep(courseFormStep)) return;
    setCourseFormStep(prev => Math.min(totalCourseFormSteps, prev + 1));
  };

  const handlePrevCourseStep = () => {
    setCourseFormStep(prev => Math.max(1, prev - 1));
  };

  const handleSaveCourse = async () => {
    if (!validateCourseStep(1) || !validateCourseStep(2)) return;

    try {
      setIsUploadingImage(true);
      let imagePath = courseFormData.image_path;
      if (courseImageFile) {
        imagePath = await uploadCourseImage(courseFormData.id.trim(), courseImageFile);
      }

      const payload = { ...courseFormData, image_path: imagePath };
      if (editingCourseData) {
        await updateCourseMutation.mutateAsync({ ...payload, originalId: editingCourseData.course_id });
      } else {
        await createCourseMutation.mutateAsync(payload);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro inesperado';
      toast({ title: 'Erro ao enviar imagem', description: message, variant: 'destructive' });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const exportRows = useMemo(
    () => buildFullExportRows(registrationsQuery.data, undefined),
    [registrationsQuery.data]
  );

  const openExportFullDialog = () => {
    setFullExportScope('all');
    setFullExportCourseId(coursesForExportSelect[0]?.course_id ?? '');
    setExportFullDialogOpen(true);
  };

  const openExportDisparoDialog = () => {
    setDisparoExportStep(1);
    setDisparoExportScope('all');
    setDisparoExportFormat('xlsx');
    setDisparoExportCourseId(coursesForExportSelect[0]?.course_id ?? '');
    setExportDisparoDialogOpen(true);
  };

  const openBulkDeleteDialog = () => {
    setBulkDeleteScope('all');
    setBulkDeleteCourseId(coursesForExportSelect[0]?.course_id ?? '');
    setBulkDeleteDialogOpen(true);
  };

  const handleConfirmBulkDelete = () => {
    if (bulkDeleteRegistrationsMutation.isPending) return;

    if (bulkDeleteScope === 'course' && !bulkDeleteCourseId) {
      toast({
        title: 'Selecione um curso',
        description: 'Escolha um curso para excluir inscrições.',
        variant: 'destructive',
      });
      return;
    }

    bulkDeleteRegistrationsMutation.mutate({
      scope: bulkDeleteScope,
      courseId: bulkDeleteScope === 'course' ? bulkDeleteCourseId : undefined,
    });
  };

  const handleConfirmFullExport = async () => {
    if (exporting) return;
    if (fullExportScope === 'course' && !fullExportCourseId) {
      toast({ title: 'Selecione um curso', description: 'Escolha um curso na lista para exportar.', variant: 'destructive' });
      return;
    }

    const filterId = fullExportScope === 'course' ? fullExportCourseId : undefined;
    const rows = buildFullExportRows(registrationsQuery.data, filterId);

    if (rows.length === 0) {
      toast({
        title: 'Nada para exportar',
        description:
          fullExportScope === 'course'
            ? 'Nenhuma inscrição encontrada para este curso.'
            : 'Nenhuma inscrição foi encontrada.',
      });
      return;
    }

    const invalid = rows.find((row) => !row.name.trim() || !row.email.trim() || !row.phone.trim());
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
      const blob = buildFullWorkbookBlob(rows);
      const date = new Date().toISOString().slice(0, 10);
      const filename =
        fullExportScope === 'all'
          ? `inscricoes-completo-${date}.xlsx`
          : `inscricoes-curso-${fullExportCourseId.replace(/[^a-zA-Z0-9-_]/g, '_')}-${date}.xlsx`;
      downloadBlob(filename, blob);
      toast({ title: 'Download iniciado', description: 'Arquivo Excel gerado com sucesso.' });
      setExportFullDialogOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro inesperado';
      toast({ title: 'Falha ao gerar Excel', description: message, variant: 'destructive' });
    } finally {
      setExporting(null);
    }
  };

  const buildDisparoRows = (scope: 'all' | 'course', selectedCourseId?: string): DisparoExportRow[] => {
    const map = new Map<string, DisparoExportRow & { tagsSet: Set<string> }>();
    for (const row of registrationsQuery.data ?? []) {
      const relevantCourses = scope === 'course'
        ? row.registration_courses.filter((rc) => rc.course_id === selectedCourseId)
        : row.registration_courses;

      if (relevantCourses.length === 0) continue;

      const phone = normalizePhoneForDisparo(row.phone);
      const key = row.email.trim().toLowerCase() || row.id;
      const tags = relevantCourses.map((rc) => rc.courses?.name?.trim() || rc.course_id).filter(Boolean);

      if (!map.has(key)) {
        map.set(key, {
          Name: row.name.trim(),
          Email: row.email.trim(),
          Phone: phone,
          Tags: '',
          tagsSet: new Set<string>(tags),
        });
      } else {
        const current = map.get(key)!;
        for (const tag of tags) current.tagsSet.add(tag);
      }
    }

    return Array.from(map.values()).map((item) => ({
      Name: item.Name,
      Email: item.Email,
      Phone: item.Phone,
      Tags: Array.from(item.tagsSet).join(';'),
    }));
  };

  const handleConfirmDisparoExport = async () => {
    if (exporting) return;

    if (disparoExportScope === 'course' && !disparoExportCourseId) {
      toast({ title: 'Selecione um curso', description: 'Escolha um curso para o disparo.', variant: 'destructive' });
      return;
    }

    const rows = buildDisparoRows(disparoExportScope, disparoExportCourseId);
    if (rows.length === 0) {
      toast({ title: 'Nada para exportar', description: 'Nenhum contato encontrado com este filtro.' });
      return;
    }

    const invalidCount = rows.filter(
      (row) => !row.Name.trim() || !row.Email.trim() || !row.Phone.trim() || !/^55\d{2}9\d{8}$/.test(row.Phone)
    ).length;
    if (invalidCount > 0) {
      toast({
        title: 'Dados inválidos para disparo',
        description: `${invalidCount} contato(s) possuem Name/Email/Phone inválido. Ajuste os dados e tente novamente.`,
        variant: 'destructive',
      });
      return;
    }

    setExporting('disparo');
    try {
      const date = new Date().toISOString().slice(0, 10);
      const scopeLabel = disparoExportScope === 'all'
        ? 'todos-cursos'
        : `curso-${disparoExportCourseId.replace(/[^a-zA-Z0-9-_]/g, '_')}`;
      const isCsv = disparoExportFormat === 'csv';
      const blob = isCsv ? buildDisparoContactsCsvBlob(rows) : buildDisparoContactsXlsxBlob(rows);
      const filename = `disparo-${scopeLabel}-${date}.${isCsv ? 'csv' : 'xlsx'}`;
      downloadBlob(filename, blob);
      toast({ title: 'Download iniciado', description: `Arquivo ${isCsv ? 'CSV' : 'Excel'} gerado com sucesso.` });
      setExportDisparoDialogOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro inesperado';
      toast({ title: 'Falha ao gerar arquivo', description: message, variant: 'destructive' });
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-lg font-semibold text-foreground">Gerenciar Cursos</h2>
              <Button onClick={openCreateCourseForm} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Novo Curso
              </Button>
            </div>
            
            {availabilityQuery.isError && (
              <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
                <AlertTriangle className="mx-auto h-8 w-8 text-destructive mb-2" />
                <p className="text-sm font-medium text-destructive">Erro ao carregar cursos</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {availabilityQuery.error instanceof Error 
                    ? availabilityQuery.error.message 
                    : 'Não foi possível carregar os cursos.'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => availabilityQuery.refetch()}
                >
                  Tentar novamente
                </Button>
              </div>
            )}
            
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
                        onClick={() => {
                          const courseId = course.course_id;
                          const newStatus = !course.is_active;
                          
                          if (!courseId) {
                            toast({ title: 'Erro', description: 'ID do curso não encontrado', variant: 'destructive' });
                            return;
                          }
                          
                          toggleCourseStatusMutation.mutate({ 
                            courseId: courseId, 
                            isActive: newStatus 
                          });
                        }}
                        disabled={toggleCourseStatusMutation.isPending || !course.course_id}
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

                    {/* Botões de Editar e Excluir */}
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => openEditCourseForm(course)}
                      >
                        <Edit3 className="mr-1.5 h-4 w-4" />
                        Editar Curso
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => setDeleteCourseTarget(course)}
                      >
                        <Trash2 className="mr-1.5 h-4 w-4" />
                        Excluir
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
                <Button type="button" variant="outline" onClick={openExportFullDialog} disabled={exporting !== null}>
                  {exporting === 'full' ? 'Gerando...' : 'Baixar Excel Completo'}
                </Button>
                <Button type="button" variant="outline" onClick={openExportDisparoDialog} disabled={exporting !== null}>
                  {exporting === 'disparo' ? 'Gerando...' : 'Baixar Excel Disparo'}
                </Button>
                <Button type="button" variant="destructive" onClick={openBulkDeleteDialog}>
                  Excluir Inscrições
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
            
            {registrationsQuery.isError && (
              <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
                <AlertTriangle className="mx-auto h-8 w-8 text-destructive mb-2" />
                <p className="text-sm font-medium text-destructive">Erro ao carregar inscrições</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {registrationsQuery.error instanceof Error 
                    ? registrationsQuery.error.message 
                    : 'Não foi possível carregar as inscrições.'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => registrationsQuery.refetch()}
                >
                  Tentar novamente
                </Button>
              </div>
            )}
            
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

      <Dialog open={exportFullDialogOpen} onOpenChange={setExportFullDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Baixar Excel completo</DialogTitle>
            <DialogDescription>
              Escolha exportar todas as inscrições ou somente as de um curso específico.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <RadioGroup
              value={fullExportScope}
              onValueChange={(v) => {
                const next = v as 'all' | 'course';
                setFullExportScope(next);
                if (next === 'course' && coursesForExportSelect[0]) {
                  setFullExportCourseId((prev) =>
                    prev && coursesForExportSelect.some((c) => c.course_id === prev)
                      ? prev
                      : coursesForExportSelect[0].course_id
                  );
                }
              }}
              className="space-y-3"
            >
              <div className="flex items-start gap-2">
                <RadioGroupItem value="all" id="export-scope-all" className="mt-1" />
                <div>
                  <Label htmlFor="export-scope-all" className="cursor-pointer font-medium">
                    Todos os cursos
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Inclui todas as inscrições; a coluna Curso reúne os cursos de cada pessoa.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <RadioGroupItem value="course" id="export-scope-course" className="mt-1" />
                <div className="min-w-0 flex-1">
                  <Label htmlFor="export-scope-course" className="cursor-pointer font-medium">
                    Apenas um curso
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Só inscrições vinculadas ao curso escolhido; a coluna Curso exibe somente esse curso.
                  </p>
                </div>
              </div>
            </RadioGroup>
            {fullExportScope === 'course' && (
              <div className="space-y-2 pl-0.5">
                <Label htmlFor="export-course-select">Curso</Label>
                {availabilityQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Carregando cursos...</p>
                ) : coursesForExportSelect.length === 0 ? (
                  <p className="text-sm text-destructive">Nenhum curso cadastrado.</p>
                ) : (
                  <Select value={fullExportCourseId} onValueChange={setFullExportCourseId}>
                    <SelectTrigger id="export-course-select">
                      <SelectValue placeholder="Selecione o curso" />
                    </SelectTrigger>
                    <SelectContent>
                      {coursesForExportSelect.map((c) => (
                        <SelectItem key={c.course_id} value={c.course_id}>
                          {c.name} — {formatDateTime(c.starts_at)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setExportFullDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmFullExport}
              disabled={
                exporting !== null ||
                (fullExportScope === 'course' &&
                  (availabilityQuery.isLoading || !fullExportCourseId || coursesForExportSelect.length === 0))
              }
            >
              {exporting === 'full' ? 'Gerando...' : 'Baixar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={bulkDeleteDialogOpen}
        onOpenChange={(open) => {
          setBulkDeleteDialogOpen(open);
          if (!open) {
            setBulkDeleteScope('all');
            setBulkDeleteCourseId(coursesForExportSelect[0]?.course_id ?? '');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir inscrições</DialogTitle>
            <DialogDescription>
              Esta ação é permanente. Escolha se deseja excluir todas as inscrições ou somente as de um curso.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <RadioGroup
              value={bulkDeleteScope}
              onValueChange={(v) => {
                const next = v as 'all' | 'course';
                setBulkDeleteScope(next);
                if (next === 'course' && coursesForExportSelect[0]) {
                  setBulkDeleteCourseId((prev) =>
                    prev && coursesForExportSelect.some((c) => c.course_id === prev)
                      ? prev
                      : coursesForExportSelect[0].course_id
                  );
                }
              }}
              className="space-y-3"
            >
              <div className="flex items-start gap-2">
                <RadioGroupItem value="all" id="bulk-delete-scope-all" className="mt-1" />
                <div>
                  <Label htmlFor="bulk-delete-scope-all" className="cursor-pointer font-medium">
                    Todas as inscrições
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Remove todos os inscritos e todos os vínculos com cursos.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <RadioGroupItem value="course" id="bulk-delete-scope-course" className="mt-1" />
                <div className="min-w-0 flex-1">
                  <Label htmlFor="bulk-delete-scope-course" className="cursor-pointer font-medium">
                    Apenas de um curso
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Remove inscrições do curso selecionado e apaga cadastros sem outros cursos vinculados.
                  </p>
                </div>
              </div>
            </RadioGroup>

            {bulkDeleteScope === 'course' && (
              <div className="space-y-2 pl-0.5">
                <Label htmlFor="bulk-delete-course-select">Curso</Label>
                {availabilityQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Carregando cursos...</p>
                ) : coursesForExportSelect.length === 0 ? (
                  <p className="text-sm text-destructive">Nenhum curso cadastrado.</p>
                ) : (
                  <Select value={bulkDeleteCourseId} onValueChange={setBulkDeleteCourseId}>
                    <SelectTrigger id="bulk-delete-course-select">
                      <SelectValue placeholder="Selecione o curso" />
                    </SelectTrigger>
                    <SelectContent>
                      {coursesForExportSelect.map((c) => (
                        <SelectItem key={c.course_id} value={c.course_id}>
                          {c.name} — {formatDateTime(c.starts_at)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              Atenção: esta exclusão não pode ser desfeita.
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setBulkDeleteDialogOpen(false)}
              disabled={bulkDeleteRegistrationsMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmBulkDelete}
              disabled={
                bulkDeleteRegistrationsMutation.isPending ||
                (bulkDeleteScope === 'course' &&
                  (availabilityQuery.isLoading || !bulkDeleteCourseId || coursesForExportSelect.length === 0))
              }
            >
              {bulkDeleteRegistrationsMutation.isPending ? 'Excluindo...' : 'Excluir Inscrições'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={exportDisparoDialogOpen}
        onOpenChange={(open) => {
          setExportDisparoDialogOpen(open);
          if (!open) setDisparoExportStep(1);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Baixar arquivo de disparo</DialogTitle>
            <DialogDescription>
              Passo {disparoExportStep} de 2
            </DialogDescription>
          </DialogHeader>

          {disparoExportStep === 1 && (
            <div className="space-y-4 py-2">
              <RadioGroup
                value={disparoExportScope}
                onValueChange={(v) => {
                  const next = v as 'all' | 'course';
                  setDisparoExportScope(next);
                  if (next === 'course' && coursesForExportSelect[0]) {
                    setDisparoExportCourseId((prev) =>
                      prev && coursesForExportSelect.some((c) => c.course_id === prev)
                        ? prev
                        : coursesForExportSelect[0].course_id
                    );
                  }
                }}
                className="space-y-3"
              >
                <div className="flex items-start gap-2">
                  <RadioGroupItem value="all" id="disparo-scope-all" className="mt-1" />
                  <div>
                    <Label htmlFor="disparo-scope-all" className="cursor-pointer font-medium">
                      Todos os cursos
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Agrupa por contato e junta os cursos em Tags.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <RadioGroupItem value="course" id="disparo-scope-course" className="mt-1" />
                  <div className="min-w-0 flex-1">
                    <Label htmlFor="disparo-scope-course" className="cursor-pointer font-medium">
                      Apenas um curso
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Exporta contatos vinculados ao curso selecionado.
                    </p>
                  </div>
                </div>
              </RadioGroup>

              {disparoExportScope === 'course' && (
                <div className="space-y-2 pl-0.5">
                  <Label htmlFor="disparo-course-select">Curso</Label>
                  {availabilityQuery.isLoading ? (
                    <p className="text-sm text-muted-foreground">Carregando cursos...</p>
                  ) : coursesForExportSelect.length === 0 ? (
                    <p className="text-sm text-destructive">Nenhum curso cadastrado.</p>
                  ) : (
                    <Select value={disparoExportCourseId} onValueChange={setDisparoExportCourseId}>
                      <SelectTrigger id="disparo-course-select">
                        <SelectValue placeholder="Selecione o curso" />
                      </SelectTrigger>
                      <SelectContent>
                        {coursesForExportSelect.map((c) => (
                          <SelectItem key={c.course_id} value={c.course_id}>
                            {c.name} — {formatDateTime(c.starts_at)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>
          )}

          {disparoExportStep === 2 && (
            <div className="space-y-4 py-2">
              <RadioGroup
                value={disparoExportFormat}
                onValueChange={(v) => setDisparoExportFormat(v as 'xlsx' | 'csv')}
                className="space-y-3"
              >
                <div className="flex items-start gap-2">
                  <RadioGroupItem value="xlsx" id="disparo-format-xlsx" className="mt-1" />
                  <div>
                    <Label htmlFor="disparo-format-xlsx" className="cursor-pointer font-medium">
                      Excel (.xlsx)
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Colunas: Name, Email, Phone, Tags.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <RadioGroupItem value="csv" id="disparo-format-csv" className="mt-1" />
                  <div>
                    <Label htmlFor="disparo-format-csv" className="cursor-pointer font-medium">
                      CSV (.csv)
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Mesmo layout do Excel para integração.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setExportDisparoDialogOpen(false)}>
              Cancelar
            </Button>
            {disparoExportStep === 2 && (
              <Button type="button" variant="outline" onClick={() => setDisparoExportStep(1)}>
                Voltar
              </Button>
            )}
            {disparoExportStep === 1 ? (
              <Button
                type="button"
                onClick={() => setDisparoExportStep(2)}
                disabled={
                  disparoExportScope === 'course' &&
                  (availabilityQuery.isLoading || !disparoExportCourseId || coursesForExportSelect.length === 0)
                }
              >
                Próximo
              </Button>
            ) : (
              <Button type="button" onClick={handleConfirmDisparoExport} disabled={exporting !== null}>
                {exporting === 'disparo' ? 'Gerando...' : 'Baixar'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Dialog de Formulário de Curso (Criar/Editar) */}
      <Dialog
        open={isCourseFormOpen}
        onOpenChange={(open) => {
          setIsCourseFormOpen(open);
          if (!open) {
            setCourseImageFile(null);
            setCourseImagePreviewUrl('');
            setCourseFormStep(1);
          }
        }}
      >
        <DialogContent className="max-w-2xl p-0 sm:max-h-[90vh] sm:overflow-hidden">
          <DialogHeader>
            <div className="border-b px-4 pb-4 pt-5 sm:px-6">
              <DialogTitle>{editingCourseData ? 'Editar Curso' : 'Novo Curso'}</DialogTitle>
              <DialogDescription>
                {editingCourseData
                  ? 'Atualize as informações do curso existente em etapas.'
                  : 'Preencha as informações do curso em um passo a passo.'}
              </DialogDescription>
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Etapa {courseFormStep} de {totalCourseFormSteps}</span>
                  <span>{getCourseStepLabel(courseFormStep)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${(courseFormStep / totalCourseFormSteps) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </DialogHeader>
          <div className="max-h-[62vh] space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
            {courseFormStep === 1 && (
              <>
                <div>
              <Label htmlFor="course-id">ID do Curso *</Label>
              <Input
                id="course-id"
                placeholder="ex: workshop-1"
                value={courseFormData.id}
                onChange={(e) => setCourseFormData({ ...courseFormData, id: e.target.value })}
                className="mt-1"
                disabled={!!editingCourseData}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Identificador único do curso (não pode ser alterado depois)
              </p>
            </div>
            <div>
              <Label htmlFor="course-name">Nome do Curso *</Label>
              <Input
                id="course-name"
                placeholder="Nome do curso"
                value={courseFormData.name}
                onChange={(e) => setCourseFormData({ ...courseFormData, name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="course-category">Categoria</Label>
              <Input
                id="course-category"
                placeholder="Categoria"
                value={courseFormData.category}
                onChange={(e) => setCourseFormData({ ...courseFormData, category: e.target.value })}
                className="mt-1"
              />
            </div>
              </>
            )}

            {courseFormStep === 2 && (
              <>
                <div>
                  <Label htmlFor="course-time-label">Horário do Curso *</Label>
                  <Input
                    id="course-time-label"
                    placeholder="ex: 14h às 17h30"
                    value={courseFormData.time_label}
                    onChange={(e) => setCourseFormData({ ...courseFormData, time_label: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
              <Label htmlFor="course-date">Data e Hora de Início *</Label>
              <Input
                id="course-date"
                type="datetime-local"
                value={courseFormData.starts_at}
                onChange={(e) => setCourseFormData({ ...courseFormData, starts_at: e.target.value })}
                className="mt-1"
              />
            </div>
                <div>
              <Label htmlFor="course-location">Local</Label>
              <Input
                id="course-location"
                placeholder="Local do curso"
                value={courseFormData.location}
                onChange={(e) => setCourseFormData({ ...courseFormData, location: e.target.value })}
                className="mt-1"
              />
            </div>
                <div>
                  <Label htmlFor="course-capacity">Capacidade (vagas)</Label>
                  <Input
                    id="course-capacity"
                    type="number"
                    min="1"
                    value={courseFormData.capacity}
                    onChange={(e) => setCourseFormData({ ...courseFormData, capacity: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-center gap-2 rounded-md border p-3">
                  <Switch
                    id="course-active"
                    checked={courseFormData.is_active}
                    onCheckedChange={(checked) => setCourseFormData({ ...courseFormData, is_active: checked })}
                  />
                  <Label htmlFor="course-active">Curso ativo (aceitando inscrições)</Label>
                </div>
              </>
            )}

            {courseFormStep === 3 && (
              <>
                <div>
                  <Label htmlFor="course-facilitator">Palestrante</Label>
                  <Input
                    id="course-facilitator"
                    placeholder="Nome de quem vai palestrar"
                    value={courseFormData.facilitator}
                    onChange={(e) => setCourseFormData({ ...courseFormData, facilitator: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
              <Label htmlFor="course-description">Descrição</Label>
              <Textarea
                id="course-description"
                placeholder="Descrição para aparecer na Home"
                value={courseFormData.description}
                onChange={(e) => setCourseFormData({ ...courseFormData, description: e.target.value })}
                className="mt-1 min-h-24"
              />
            </div>
              </>
            )}

            {courseFormStep === 4 && (
              <>
                <div>
              <Label htmlFor="course-image">Imagem do Curso (1080x1350)</Label>
              <Input
                id="course-image"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setCourseImageFile(file);
                  if (file) {
                    const localUrl = URL.createObjectURL(file);
                    setCourseImagePreviewUrl(localUrl);
                  } else {
                    setCourseImagePreviewUrl(getCoursePublicImageUrl(courseFormData.image_path));
                  }
                }}
                className="mt-1"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Use imagens no formato 4:5 (1080x1350) para manter todos os cards iguais na Home.
              </p>
              {courseImagePreviewUrl && (
                <div className="mt-3 w-40 overflow-hidden rounded-lg border border-border">
                  <div className="aspect-[4/5]">
                    <img src={courseImagePreviewUrl} alt="Prévia do curso" className="h-full w-full object-cover" />
                  </div>
                </div>
              )}
            </div>
                <div className="rounded-lg border bg-muted/20 p-4 text-sm">
                  <p className="font-semibold text-foreground">Revisão rápida</p>
                  <p className="mt-2 text-muted-foreground"><span className="font-medium text-foreground">Curso:</span> {courseFormData.name || '-'}</p>
                  <p className="text-muted-foreground"><span className="font-medium text-foreground">Data/Hora:</span> {courseFormData.starts_at || '-'} · {courseFormData.time_label || '-'}</p>
                  <p className="text-muted-foreground"><span className="font-medium text-foreground">Local:</span> {courseFormData.location || '-'}</p>
                  <p className="text-muted-foreground"><span className="font-medium text-foreground">Palestrante:</span> {courseFormData.facilitator || '-'}</p>
                  <p className="text-muted-foreground"><span className="font-medium text-foreground">Descrição:</span> {courseFormData.description ? `${courseFormData.description.slice(0, 100)}${courseFormData.description.length > 100 ? '...' : ''}` : '-'}</p>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="border-t px-4 py-4 sm:px-6">
            <Button variant="outline" onClick={() => setIsCourseFormOpen(false)}>
              Cancelar
            </Button>
            {courseFormStep > 1 && (
              <Button variant="outline" onClick={handlePrevCourseStep}>
                Voltar
              </Button>
            )}
            {courseFormStep < totalCourseFormSteps ? (
              <Button onClick={handleNextCourseStep}>
                Próximo
              </Button>
            ) : (
              <Button
                onClick={handleSaveCourse}
                disabled={createCourseMutation.isPending || updateCourseMutation.isPending || isUploadingImage}
              >
                {createCourseMutation.isPending || updateCourseMutation.isPending || isUploadingImage
                  ? 'Salvando...'
                  : editingCourseData ? 'Atualizar' : 'Criar'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão de Curso */}
      <AlertDialog open={Boolean(deleteCourseTarget)} onOpenChange={(open) => !open && setDeleteCourseTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir curso</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente. O curso será removido e não poderá ser recuperado.
              {deleteCourseTarget && deleteCourseTarget.filled > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  Atenção: Este curso possui {deleteCourseTarget.filled} inscrição(ões).
                  Ao continuar, as inscrições vinculadas a este curso também serão apagadas.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteCourseTarget && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
              <p className="font-semibold text-foreground">{deleteCourseTarget.name}</p>
              <p className="mt-1 text-muted-foreground">{formatDateTime(deleteCourseTarget.starts_at)}</p>
              <p className="mt-1 text-muted-foreground">
                {deleteCourseTarget.filled} inscritos / {deleteCourseTarget.capacity} vagas
              </p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCourseMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteCourseTarget && deleteCourseMutation.mutate(deleteCourseTarget.course_id)}
              disabled={!deleteCourseTarget || deleteCourseMutation.isPending}
            >
              {deleteCourseMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Admin;
