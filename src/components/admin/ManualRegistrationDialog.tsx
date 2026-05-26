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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { applyPhoneMask } from '@/lib/phone';
import { applyDocumentMask, isValidDocument } from '@/lib/cpf-cnpj';
import { requireSupabase } from '@/lib/supabase';
import { useRegistrationFormFields } from '@/lib/site-settings';

export type ManualRegistrationCourse = {
  course_id: string;
  name: string;
  starts_at: string;
  is_active: boolean;
  remaining: number;
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
  courseId: z.string().min(1, 'Selecione um curso'),
});

type FormValues = z.infer<typeof formSchema>;

const mapRegistrationError = (message: string) => {
  if (message.includes('NO_VACANCIES')) return 'O curso selecionado está com vagas esgotadas.';
  if (message.includes('COURSE_NOT_FOUND')) return 'Curso não encontrado. Atualize a página e tente novamente.';
  if (message.includes('COURSE_INACTIVE')) return 'As inscrições para este curso estão pausadas.';
  if (message.includes('DUPLICATE_REGISTRATION')) return 'Já existe inscrição neste curso para este e-mail.';
  if (message.includes('NO_COURSES_SELECTED')) return 'Selecione um curso.';
  if (message.includes('INVALID_NAME')) return 'Nome inválido. Digite o nome completo.';
  if (message.includes('INVALID_EMAIL')) return 'E-mail inválido. Verifique o formato.';
  if (message.includes('FORBIDDEN')) return 'Sem permissão para criar inscrição manual.';
  if (message.includes('permission denied') || message.includes('violates row-level')) {
    return 'Erro de permissão no servidor.';
  }
  if (message.includes('gen_random_bytes')) {
    return 'Extensão pgcrypto não habilitada. Execute supabase/fix_admin_manual_registration_pgcrypto.sql no SQL Editor do Supabase.';
  }
  if (
    message.includes('Could not find the function') ||
    message.includes('PGRST202') ||
    message.includes('admin_create_manual_registration')
  ) {
    return 'A função admin_create_manual_registration ainda não existe no Supabase. Abra o SQL Editor do projeto e execute o arquivo supabase/migrations/20260526_admin_create_manual_registration.sql';
  }
  return message || 'Erro ao criar inscrição. Tente novamente.';
};

const formatCourseDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

type ManualRegistrationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courses: ManualRegistrationCourse[];
  isQrEnabled: boolean;
  onSuccess?: () => void;
};

const ManualRegistrationDialog = ({
  open,
  onOpenChange,
  courses,
  isQrEnabled,
  onSuccess,
}: ManualRegistrationDialogProps) => {
  const dynamicFieldsQuery = useRegistrationFormFields();
  const [customValues, setCustomValues] = useState<Record<string, string | boolean>>({});
  const [qrAlreadyScanned, setQrAlreadyScanned] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      document: '',
      courseId: '',
    },
  });

  const availableCourses = useMemo(
    () => courses.filter((c) => c.is_active && c.remaining > 0),
    [courses],
  );

  const dynamicFields = dynamicFieldsQuery.data ?? [];

  useEffect(() => {
    if (!open) {
      form.reset();
      setCustomValues({});
      setQrAlreadyScanned(false);
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

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const supabase = requireSupabase();
      const { data, error } = await supabase.rpc('admin_create_manual_registration', {
        p_name: values.name.trim(),
        p_email: values.email.trim().toLowerCase(),
        p_phone: values.phone.trim(),
        p_document: values.document.replace(/\D/g, ''),
        p_course_id: values.courseId,
        p_custom_answers: customValues,
        p_qr_already_scanned: isQrEnabled ? qrAlreadyScanned : false,
      });

      if (error) {
        throw new Error(error.message || 'Erro ao criar inscrição');
      }
      if (!data) {
        throw new Error('Resposta vazia do servidor');
      }
      return String(data);
    },
    onSuccess: () => {
      toast({
        title: 'Inscrição criada',
        description: 'A inscrição manual foi registrada com sucesso.',
      });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Erro inesperado';
      toast({
        title: 'Não foi possível criar a inscrição',
        description: mapRegistrationError(message),
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (values: FormValues) => {
    if (!validateDynamicFields()) return;
    createMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar inscrição manual</DialogTitle>
          <DialogDescription>
            Preencha os dados do participante e escolha o curso. As mesmas regras de vagas e duplicidade do formulário público se aplicam.
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

            <FormField
              control={form.control}
              name="courseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Curso</FormLabel>
                  {availableCourses.length === 0 ? (
                    <p className="text-sm text-muted-foreground rounded-md border border-border p-3">
                      Nenhum curso ativo com vagas disponíveis. Ative um curso ou aumente a capacidade.
                    </p>
                  ) : (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o curso" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableCourses.map((course) => (
                          <SelectItem key={course.course_id} value={course.course_id}>
                            {course.name}
                            {course.starts_at ? ` — ${formatCourseDate(course.starts_at)}` : ''}
                            {` (${course.remaining} vaga${course.remaining === 1 ? '' : 's'})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {isQrEnabled && (
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="qr-already-scanned">QR Code já escaneado</Label>
                  <p className="text-xs text-muted-foreground">
                    Marque se o participante já fez check-in no evento.
                  </p>
                </div>
                <Switch
                  id="qr-already-scanned"
                  checked={qrAlreadyScanned}
                  onCheckedChange={setQrAlreadyScanned}
                />
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || availableCourses.length === 0}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Criar inscrição'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ManualRegistrationDialog;
