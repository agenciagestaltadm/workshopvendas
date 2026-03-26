import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';

import Footer from '@/components/Footer';
import { CourseSelect } from '@/components/CourseSelect';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { isSupabaseConfigured, requireSupabase } from '@/lib/supabase';
import { applyPhoneMask } from '@/lib/phone';
import { applyDocumentMask, isValidDocument } from '@/lib/cpf-cnpj';

const formSchema = z.object({
  name: z.string().min(2, 'Informe seu nome completo'),
  email: z.string()
    .min(1, 'E-mail é obrigatório')
    .email('Formato de e-mail inválido. Verifique se digitou corretamente.')
    .refine((val) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val), 'Informe um domínio de e-mail válido (ex: .com, .br)'),
  phone: z.string()
    .min(1, 'Telefone é obrigatório')
    .regex(/^\+55 \d{2} \d{5}-\d{4}$/, 'Formato inválido. Use: +55 11 91234-5678'),
  document: z.string()
    .min(1, 'CPF/CNPJ é obrigatório')
    .refine((val) => {
      const cleaned = val.replace(/\D/g, '');
      return cleaned.length === 11 || cleaned.length === 14;
    }, 'Digite um CPF (11 dígitos) ou CNPJ (14 dígitos) válido')
    .refine((val) => isValidDocument(val), 'CPF ou CNPJ inválido. Verifique os dígitos informados.'),
  courseIds: z.array(z.string()).min(1, 'Selecione pelo menos um curso'),
});

type FormValues = z.infer<typeof formSchema>;

type CourseAvailability = {
  course_id: string;
  name: string;
  category: string;
  starts_at: string;
  capacity: number;
  filled: number;
  remaining: number;
  is_active?: boolean; // Adicionado para indicar se o curso está ativo
};

const mapRegistrationError = (message: string) => {
  if (message.includes('NO_VACANCIES')) return 'Um ou mais cursos selecionados estão com vagas esgotadas.';
  if (message.includes('COURSE_NOT_FOUND')) return 'Curso não encontrado. Por favor, atualize a página e tente novamente.';
  if (message.includes('COURSE_INACTIVE')) return 'As inscrições para um dos cursos estão pausadas.';
  if (message.includes('DUPLICATE_REGISTRATION')) return 'Você já está inscrito em um dos cursos selecionados.';
  if (message.includes('NO_COURSES_SELECTED')) return 'Selecione pelo menos um curso.';
  if (message.includes('INVALID_NAME')) return 'Nome inválido. Digite seu nome completo.';
  if (message.includes('INVALID_EMAIL')) return 'E-mail inválido. Verifique o formato.';
  if (message.includes('permission denied') || message.includes('violates row-level')) {
    return 'Erro de permissão no servidor. Entre em contato com o suporte.';
  }
  if (message.includes('schema') || message.includes('function')) {
    return 'Erro no banco de dados. Execute o script de correção no Supabase.';
  }
  return message || 'Erro ao processar inscrição. Tente novamente.';
};

const Register = () => {
  const navigate = useNavigate();
  
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/');
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      document: '',
      courseIds: [],
    },
  });

  const availabilityQuery = useQuery({
    queryKey: ['course_availability', 'vendas-online'],
    enabled: true,
    refetchInterval: 30000, // Atualiza a cada 30 segundos
    retry: 3,
    retryDelay: 2000,
    queryFn: async () => {
      const supabase = requireSupabase();
      const { data, error } = await supabase.rpc('get_course_availability', {});

      if (error) {
        throw error;
      }
      
      const courses = (data ?? []) as CourseAvailability[];
      
      if (import.meta.env.DEV) {
        console.log('[Register] Cursos carregados do Supabase:', courses.length);
      }
      
      return courses;
    },
  });

  const availabilityById = useMemo(() => {
    const map = new Map<string, CourseAvailability>();
    for (const item of availabilityQuery.data ?? []) {
      map.set(item.course_id, item);
    }
    return map;
  }, [availabilityQuery.data]);

  const selectedCourseIds = form.watch('courseIds');
  
  const selectedCourses = useMemo(() => {
    return selectedCourseIds.map(id => availabilityById.get(id)).filter(Boolean) as CourseAvailability[];
  }, [selectedCourseIds, availabilityById]);
  
  const hasAnySoldOut = selectedCourses.some(c => c.remaining <= 0);

  // Storage key for local registrations backup
  const REGISTRATIONS_STORAGE_KEY = 'workshop_registrations_backup';

  // Save registration locally
  const saveRegistrationLocally = (values: FormValues) => {
    try {
      const existing = JSON.parse(localStorage.getItem(REGISTRATIONS_STORAGE_KEY) || '[]');
      const newRegistration = {
        id: `local-${Date.now()}`,
        created_at: new Date().toISOString(),
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        document: values.document.replace(/\D/g, ''),
        course_ids: values.courseIds,
        synced: false,
      };
      existing.push(newRegistration);
      localStorage.setItem(REGISTRATIONS_STORAGE_KEY, JSON.stringify(existing));
      return newRegistration.id;
    } catch (e) {
      return null;
    }
  };

  const registerMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // Try Supabase first
      if (isSupabaseConfigured) {
        try {
          const supabase = requireSupabase();
          const payload = {
            p_name: values.name.trim(),
            p_email: values.email.trim().toLowerCase(),
            p_phone: values.phone.trim(),
            p_document: values.document.replace(/\D/g, ''),
            p_course_ids: values.courseIds,
          };

          console.log('[Register] Enviando para Supabase:', payload);

          const { data, error } = await supabase.rpc('register_participant_with_courses', payload);
          
          if (error) {
            console.error('[Register] Erro do Supabase:', error);
            throw new Error(error.message || 'Erro ao salvar no banco de dados');
          }
          
          if (data) {
            console.log('[Register] Sucesso! ID:', data);
            return String(data);
          }
          
          throw new Error('Resposta vazia do servidor');
        } catch (supabaseError) {
          console.error('[Register] Erro na chamada Supabase:', supabaseError);
          // Não usar fallback local em produção - mostrar erro real
          if (supabaseError instanceof Error) {
            throw supabaseError;
          }
          throw new Error('Falha ao conectar com o servidor. Tente novamente.');
        }
      }

      // Fallback local apenas se Supabase não estiver configurado
      const localId = saveRegistrationLocally(values);
      if (!localId) {
        throw new Error('Falha ao salvar inscrição. Tente novamente.');
      }
      return localId;
    },
    onSuccess: (registrationId, values) => {
      const courses = values.courseIds.map(id => {
        const course = availabilityById.get(id);
        return {
          id,
          name: course?.name ?? '',
          startsAt: course?.starts_at ?? '',
        };
      });
      
      navigate('/obrigado', {
        state: {
          registrationId,
          name: values.name.trim(),
          courses,
        },
      });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Erro inesperado';
      toast({
        title: 'Não foi possível concluir sua inscrição',
        description: mapRegistrationError(message),
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (values: FormValues) => registerMutation.mutate(values);

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed left-0 right-0 top-0 z-50 px-5 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[50rem]">
          <div className="flex w-full items-center justify-between gap-4 rounded-full border border-border/60 bg-background/70 px-2 py-2 shadow-soft backdrop-blur-lg transition-all duration-300">
            <span className="flex items-center justify-center px-4">
              <img
                src="/Design sem nome - 2026-03-20T153441.627.png"
                alt="Workshop de Vendas Online"
                width={120}
                height={48}
                decoding="async"
                className="h-[40px] w-auto object-contain sm:h-[48px]"
              />
            </span>
            <Button type="button" variant="outline" onClick={handleBack} className="rounded-full px-6">
              Voltar
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 pb-16 pt-32 sm:pt-36">
        <div className="mx-auto max-w-4xl">
          <header className="text-center">
            <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">Inscrição</h1>
            <p className="mt-3 text-muted-foreground">
              Preencha seus dados e escolha os cursos do <strong className="text-foreground">Workshop de Vendas Online</strong>.
            </p>
          </header>

          {!isSupabaseConfigured ? (
            <div className="mt-10 rounded-2xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">
                O sistema de inscrições ainda não está configurado. Defina <strong>VITE_SUPABASE_URL</strong> e{' '}
                <strong>VITE_SUPABASE_ANON_KEY</strong>.
              </p>
            </div>
          ) : (
            <div className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input placeholder="Seu nome completo" autoComplete="name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input placeholder="voce@exemplo.com" type="email" autoComplete="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>WhatsApp</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="+55 11 91234-5678"
                            autoComplete="tel"
                            {...field}
                            onChange={(e) => {
                              const masked = applyPhoneMask(e.target.value);
                              field.onChange(masked);
                            }}
                            maxLength={17}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="document"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPF ou CNPJ</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="000.000.000-00 ou 00.000.000/0000-00"
                            autoComplete="off"
                            {...field}
                            onChange={(e) => {
                              const masked = applyDocumentMask(e.target.value);
                              field.onChange(masked);
                            }}
                            maxLength={18}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="courseIds"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Cursos do Workshop</FormLabel>
                          {availabilityQuery.isFetching && (
                            <span className="text-xs text-muted-foreground animate-pulse">
                              Atualizando...
                            </span>
                          )}
                        </div>
                        <FormControl>
                          {availabilityQuery.isError ? (
                            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
                              <p className="text-sm text-destructive font-medium">
                                Erro ao carregar cursos
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {availabilityQuery.error instanceof Error 
                                  ? availabilityQuery.error.message 
                                  : 'Não foi possível carregar os cursos. Tente novamente.'}
                              </p>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-3"
                                onClick={() => availabilityQuery.refetch()}
                              >
                                Tentar novamente
                              </Button>
                            </div>
                          ) : (
                            <CourseSelect
                              selectedIds={field.value}
                              onSelectionChange={field.onChange}
                              options={(availabilityQuery.data ?? []).map((course) => ({
                                course_id: course.course_id,
                                name: course.name,
                                starts_at: course.starts_at,
                                capacity: course.capacity,
                                remaining: course.remaining,
                              }))}
                              disabled={availabilityQuery.isLoading || registerMutation.isPending}
                            />
                          )}
                        </FormControl>
                        <FormMessage />
                        {hasAnySoldOut && (
                          <p className="text-sm font-medium text-destructive" aria-live="polite">
                            Um ou mais cursos selecionados estão lotados. Remova-os para continuar.
                          </p>
                        )}
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registerMutation.isPending || availabilityQuery.isLoading || availabilityQuery.isError || (availabilityQuery.data?.length === 0) || hasAnySoldOut || selectedCourseIds.length === 0}
                  >
                    {registerMutation.isPending 
                      ? 'Enviando...' 
                      : availabilityQuery.isError
                        ? 'Erro ao carregar cursos'
                        : availabilityQuery.data?.length === 0
                          ? 'Nenhum curso disponível'
                          : hasAnySoldOut 
                            ? 'Remova cursos lotados' 
                            : selectedCourseIds.length === 0
                              ? 'Selecione pelo menos um curso'
                              : `Confirmar inscrição em ${selectedCourseIds.length} ${selectedCourseIds.length === 1 ? 'curso' : 'cursos'}`
                    }
                  </Button>
                </form>
              </Form>

              <p className="mt-6 text-center text-xs text-muted-foreground">
                As vagas são verificadas no momento do envio. Se algum curso lotar, sua inscrição não será salva.
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Register;
