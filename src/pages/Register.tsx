import { useEffect, useMemo } from 'react';
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

const formSchema = z.object({
  name: z.string().min(2, 'Informe seu nome completo'),
  email: z.string()
    .min(1, 'E-mail é obrigatório')
    .email('Formato de e-mail inválido. Verifique se digitou corretamente.')
    .refine((val) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val), 'Informe um domínio de e-mail válido (ex: .com, .br)'),
  phone: z.string()
    .min(1, 'Telefone é obrigatório')
    .regex(/^\+55 \d{2} \d{5}-\d{4}$/, 'Formato inválido. Use: +55 11 91234-5678'),
  courseId: z.string().min(1, 'Selecione um curso'),
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
};

const mapRegistrationError = (message: string) => {
  if (message.includes('NO_VACANCIES')) return 'Este curso está com vagas esgotadas.';
  if (message.includes('COURSE_NOT_FOUND')) return 'Curso não encontrado.';
  if (message.includes('DUPLICATE_REGISTRATION')) return 'Você já está inscrito neste curso.';
  return message;
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
      courseId: '',
    },
  });

  const availabilityQuery = useQuery({
    queryKey: ['course_availability', 'vendas-online'],
    enabled: isSupabaseConfigured,
    refetchInterval: 4000,
    queryFn: async () => {
      const supabase = requireSupabase();
      const { data, error } = await supabase.rpc('get_course_availability', { p_category: 'Curso' });

      if (error) throw error;
      return (data ?? []) as CourseAvailability[];
    },
  });

  const availabilityById = useMemo(() => {
    const map = new Map<string, CourseAvailability>();
    for (const item of availabilityQuery.data ?? []) {
      map.set(item.course_id, item);
    }
    return map;
  }, [availabilityQuery.data]);

  const selectedCourseId = form.watch('courseId');
  const selectedCourse = selectedCourseId ? availabilityById.get(selectedCourseId) : undefined;
  const isSelectedSoldOut = Boolean(selectedCourse && selectedCourse.remaining <= 0);

  useEffect(() => {
    if (!selectedCourseId) return;
    if (!selectedCourse) return;

    if (selectedCourse.remaining <= 0) {
      form.setError('courseId', { message: 'Este curso está lotado. Escolha outro.' });
      return;
    }

    if (form.formState.errors.courseId?.message === 'Este curso está lotado. Escolha outro.') {
      form.clearErrors('courseId');
    }
  }, [form, selectedCourse, selectedCourseId]);

  const registerMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const supabase = requireSupabase();
      const payload = {
        p_name: values.name.trim(),
        p_email: values.email.trim(),
        p_phone: values.phone.trim(),
        p_course_id: values.courseId,
      };

      const { data, error } = await supabase.rpc('register_participant', payload);
      if (error) throw error;
      return String(data);
    },
    onSuccess: (registrationId, values) => {
      const selected = availabilityById.get(values.courseId);
      navigate('/obrigado', {
        state: {
          registrationId,
          name: values.name.trim(),
          courseId: values.courseId,
          courseName: selected?.name ?? '',
          startsAt: selected?.starts_at ?? '',
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
        <div className="mx-auto max-w-2xl">
          <header className="text-center">
            <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">Inscrição</h1>
            <p className="mt-3 text-muted-foreground">
              Preencha seus dados e escolha um curso do <strong className="text-foreground">Workshop de Vendas Online</strong>.
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
                    name="courseId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Curso do Workshop</FormLabel>
                        <FormControl>
                          <CourseSelect
                            value={field.value}
                            onValueChange={field.onChange}
                            options={(availabilityQuery.data ?? []).map((course) => ({
                              course_id: course.course_id,
                              name: course.name,
                              starts_at: course.starts_at,
                              capacity: course.capacity,
                              remaining: course.remaining,
                            }))}
                            placeholder={
                              availabilityQuery.isLoading
                                ? 'Carregando cursos...'
                                : availabilityQuery.isError
                                  ? 'Erro ao carregar cursos'
                                  : 'Selecione um curso'
                            }
                          />
                        </FormControl>
                        <FormMessage />
                        {isSelectedSoldOut && (
                          <p className="text-sm font-medium text-destructive" aria-live="polite">
                            Este curso está lotado. Escolha outro para continuar.
                          </p>
                        )}
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registerMutation.isPending || availabilityQuery.isLoading || isSelectedSoldOut}
                  >
                    {registerMutation.isPending ? 'Enviando...' : isSelectedSoldOut ? 'Curso lotado' : 'Fazer inscrição'}
                  </Button>
                </form>
              </Form>

              <p className="mt-6 text-center text-xs text-muted-foreground">
                As vagas são verificadas no momento do envio. Se o curso lotar, sua inscrição não será salva.
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
