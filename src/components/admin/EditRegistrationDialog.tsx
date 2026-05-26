import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';
import { applyPhoneMask } from '@/lib/phone';
import { applyDocumentMask, isValidDocument } from '@/lib/cpf-cnpj';
import { requireSupabase } from '@/lib/supabase';
import { useRegistrationFormFields } from '@/lib/site-settings';
import type { ManualRegistrationCourse } from '@/components/admin/ManualRegistrationDialog';

export type EditRegistrationRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  document: string;
  registration_courses: Array<{ course_id: string }>;
  registration_field_answers?: Array<{
    field_key: string;
    value_json: unknown;
  }>;
};

const formSchema = z.object({
  name: z.string().min(2, 'Informe o nome completo'),
  email: z
    .string()
    .min(1, 'E-mail é obrigatório')
    .email('Formato de e-mail inválido.')
    .refine(
      (val) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val),
      'Informe um domínio de e-mail válido (ex: .com, .br)',
    ),
  phone: z
    .string()
    .min(1, 'Telefone é obrigatório')
    .regex(/^\+55 \d{2} \d{5}-\d{4}$/, 'Formato inválido. Use: +55 11 91234-5678'),
  document: z
    .string()
    .min(1, 'CPF/CNPJ é obrigatório')
    .refine((val) => {
      const cleaned = val.replace(/\D/g, '');
      return cleaned.length === 11 || cleaned.length === 14;
    }, 'Digite um CPF (11 dígitos) ou CNPJ (14 dígitos) válido')
    .refine((val) => isValidDocument(val), 'CPF ou CNPJ inválido.'),
});

type FormValues = z.infer<typeof formSchema>;

const mapUpdateError = (message: string) => {
  if (message.includes('REGISTRATION_NOT_FOUND')) return 'Inscrição não encontrada. Atualize a página.';
  if (message.includes('NO_VACANCIES')) return 'O curso selecionado está com vagas esgotadas.';
  if (message.includes('COURSE_NOT_FOUND')) return 'Curso não encontrado. Atualize a página e tente novamente.';
  if (message.includes('COURSE_INACTIVE')) return 'As inscrições para este curso estão pausadas.';
  if (message.includes('DUPLICATE_REGISTRATION')) return 'Já existe inscrição neste curso para este e-mail.';
  if (message.includes('NO_COURSES_SELECTED')) return 'Selecione pelo menos um curso.';
  if (message.includes('INVALID_NAME')) return 'Nome inválido. Digite o nome completo.';
  if (message.includes('INVALID_EMAIL')) return 'E-mail inválido. Verifique o formato.';
  if (message.includes('FORBIDDEN')) return 'Sem permissão para editar inscrição.';
  if (message.includes('permission denied') || message.includes('violates row-level')) {
    return 'Erro de permissão no servidor.';
  }
  if (
    message.includes('Could not find the function') ||
    message.includes('PGRST202') ||
    message.includes('admin_update_registration')
  ) {
    return 'A função admin_update_registration ainda não existe no Supabase. Execute supabase/apply_admin_update_registration.sql no SQL Editor.';
  }
  return message || 'Erro ao salvar inscrição. Tente novamente.';
};

const formatCourseDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

const formatCustomFieldValueForInput = (value: unknown): string | boolean => {
  if (typeof value === 'boolean') return value;
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
};

type EditRegistrationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registration: EditRegistrationRow | null;
  courses: ManualRegistrationCourse[];
  onSuccess?: () => void;
};

const EditRegistrationDialog = ({
  open,
  onOpenChange,
  registration,
  courses,
  onSuccess,
}: EditRegistrationDialogProps) => {
  const dynamicFieldsQuery = useRegistrationFormFields();
  const [customValues, setCustomValues] = useState<Record<string, string | boolean>>({});
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      document: '',
    },
  });

  const enrolledCourseIds = useMemo(
    () => new Set(registration?.registration_courses.map((rc) => rc.course_id) ?? []),
    [registration],
  );

  const selectableCourses = useMemo(
    () =>
      courses.filter(
        (c) => (c.is_active && c.remaining > 0) || enrolledCourseIds.has(c.course_id),
      ),
    [courses, enrolledCourseIds],
  );

  const dynamicFields = dynamicFieldsQuery.data ?? [];

  useEffect(() => {
    if (!open || !registration) return;

    form.reset({
      name: registration.name,
      email: registration.email,
      phone: applyPhoneMask(registration.phone),
      document: applyDocumentMask(registration.document),
    });

    setSelectedCourseIds(
      registration.registration_courses.map((rc) => rc.course_id),
    );

    const answers: Record<string, string | boolean> = {};
    for (const answer of registration.registration_field_answers ?? []) {
      answers[answer.field_key] = formatCustomFieldValueForInput(answer.value_json);
    }
    setCustomValues(answers);
  }, [open, registration, form]);

  useEffect(() => {
    if (!open) {
      form.reset();
      setCustomValues({});
      setSelectedCourseIds([]);
    }
  }, [open, form]);

  const validateDynamicFields = () => {
    for (const field of dynamicFields) {
      const value = customValues[field.field_key];
      if (field.is_required && (value === undefined || value === '' || value === false)) {
        toast({
          title: 'Campo obrigatório',
          description: `Preencha o campo "${field.label}" antes de continuar.`,
          variant: 'destructive',
        });
        return false;
      }
    }
    return true;
  };

  const toggleCourse = (courseId: string, checked: boolean) => {
    setSelectedCourseIds((prev) => {
      if (checked) {
        return prev.includes(courseId) ? prev : [...prev, courseId];
      }
      return prev.filter((id) => id !== courseId);
    });
  };

  const updateMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!registration) throw new Error('Inscrição não selecionada');

      const supabase = requireSupabase();
      const { error } = await supabase.rpc('admin_update_registration', {
        p_registration_id: registration.id,
        p_name: values.name.trim(),
        p_email: values.email.trim().toLowerCase(),
        p_phone: values.phone.trim(),
        p_document: values.document.replace(/\D/g, ''),
        p_course_ids: selectedCourseIds,
        p_custom_answers: customValues,
      });

      if (error) {
        throw new Error(error.message || 'Erro ao atualizar inscrição');
      }
    },
    onSuccess: () => {
      toast({
        title: 'Inscrição atualizada',
        description: 'Os dados foram salvos com sucesso.',
      });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Erro inesperado';
      toast({
        title: 'Não foi possível salvar',
        description: mapUpdateError(message),
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (values: FormValues) => {
    if (selectedCourseIds.length === 0) {
      toast({
        title: 'Selecione um curso',
        description: 'A inscrição precisa de pelo menos um curso vinculado.',
        variant: 'destructive',
      });
      return;
    }
    if (!validateDynamicFields()) return;
    updateMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar inscrição</DialogTitle>
          <DialogDescription>
            Altere os dados do participante e os cursos vinculados. Cursos já escaneados mantêm o status de check-in.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome completo" autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {dynamicFields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label>
                  {field.label}
                  {field.is_required ? ' *' : ''}
                </Label>
                {field.field_type === 'textarea' ? (
                  <textarea
                    className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder={field.placeholder ?? ''}
                    value={String(customValues[field.field_key] ?? '')}
                    onChange={(e) =>
                      setCustomValues((prev) => ({ ...prev, [field.field_key]: e.target.value }))
                    }
                  />
                ) : field.field_type === 'select' ? (
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={String(customValues[field.field_key] ?? '')}
                    onChange={(e) =>
                      setCustomValues((prev) => ({ ...prev, [field.field_key]: e.target.value }))
                    }
                  >
                    <option value="">Selecione</option>
                    {(field.options_json ?? []).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : field.field_type === 'checkbox' ? (
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={Boolean(customValues[field.field_key])}
                      onChange={(e) =>
                        setCustomValues((prev) => ({ ...prev, [field.field_key]: e.target.checked }))
                      }
                    />
                    Marcar
                  </label>
                ) : (
                  <Input
                    type={field.field_type === 'number' || field.field_type === 'date' ? field.field_type : 'text'}
                    placeholder={field.placeholder ?? ''}
                    value={String(customValues[field.field_key] ?? '')}
                    onChange={(e) =>
                      setCustomValues((prev) => ({ ...prev, [field.field_key]: e.target.value }))
                    }
                  />
                )}
              </div>
            ))}

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input placeholder="email@exemplo.com" type="email" autoComplete="email" {...field} />
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
                      onChange={(e) => field.onChange(applyPhoneMask(e.target.value))}
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
                      onChange={(e) => field.onChange(applyDocumentMask(e.target.value))}
                      maxLength={18}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label>Cursos</Label>
              {selectableCourses.length === 0 ? (
                <p className="text-sm text-muted-foreground rounded-md border border-border p-3">
                  Nenhum curso disponível para vincular.
                </p>
              ) : (
                <div className="space-y-2 rounded-md border border-border p-3">
                  {selectableCourses.map((course) => {
                    const isEnrolled = enrolledCourseIds.has(course.course_id);
                    const checked = selectedCourseIds.includes(course.course_id);
                    return (
                      <label
                        key={course.course_id}
                        className="flex items-start gap-3 text-sm cursor-pointer"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) =>
                            toggleCourse(course.course_id, value === true)
                          }
                        />
                        <span>
                          <span className="font-medium text-foreground">{course.name}</span>
                          {course.starts_at ? (
                            <span className="text-muted-foreground">
                              {' '}
                              — {formatCourseDate(course.starts_at)}
                            </span>
                          ) : null}
                          <span className="block text-xs text-muted-foreground">
                            {isEnrolled
                              ? 'Já inscrito neste curso'
                              : `${course.remaining} vaga${course.remaining === 1 ? '' : 's'} disponíveis`}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updateMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending || selectableCourses.length === 0}
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar alterações'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditRegistrationDialog;
