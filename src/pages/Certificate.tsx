import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, Download, FileCheck, Clock, XCircle, Award, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';

import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { requireSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { getSiteAssetUrl, useSiteSettings } from '@/lib/site-settings';
import { applyDocumentMask, isValidDocument } from '@/lib/cpf-cnpj';
import { generateCertificatePdf } from '@/lib/certificate';

type CertificateCourse = {
  registration_id: string;
  name: string;
  email: string;
  course_id: string;
  course_name: string;
  course_starts_at: string;
  course_ends_at: string | null;
  course_time_label: string | null;
  course_hours_label: string;
  is_scanned: boolean;
  scanned_at: string;
  qr_code: string;
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' });
};

const formatDateShort = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const Certificate = () => {
  const navigate = useNavigate();
  const settingsQuery = useSiteSettings();
  const [documentInput, setDocumentInput] = useState('');
  const [searchedDocument, setSearchedDocument] = useState('');
  const [downloadingCourseId, setDownloadingCourseId] = useState<string | null>(null);

  const certificatesQuery = useQuery({
    queryKey: ['certificates', searchedDocument],
    enabled: searchedDocument.length > 0 && isSupabaseConfigured,
    queryFn: async () => {
      const supabase = requireSupabase();
      const { data, error } = await supabase.rpc('get_certificates_by_document', {
        p_document: searchedDocument,
      });
      if (error) {
        console.error('[Certificate] Erro ao buscar certificados:', JSON.stringify(error, null, 2));
        throw new Error(error.message || 'Erro ao consultar o banco de dados');
      }
      // Mapear colunas result_* para os nomes esperados no frontend
      const mapped = (data ?? []).map((item: Record<string, unknown>) => ({
        registration_id: item.result_registration_id as string,
        name: item.result_participant_name as string,
        email: '',
        course_id: item.result_course_id as string,
        course_name: item.result_course_name as string,
        course_starts_at: item.result_course_starts_at as string,
        course_ends_at: item.result_course_ends_at as string | null,
        course_time_label: null as string | null,
        course_hours_label: item.result_hours_label as string,
        is_scanned: item.result_scanned as boolean,
        scanned_at: '',
        qr_code: item.result_qr_code as string,
      }));
      return mapped as CertificateCourse[];
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async (course: CertificateCourse) => {
      setDownloadingCourseId(course.course_id);
      const pdfBlob = await generateCertificatePdf({
        name: course.name,
        courseName: course.course_name,
        courseDate: formatDateShort(course.course_starts_at),
        courseTimeLabel: course.course_time_label,
        courseHoursLabel: course.course_hours_label,
        logoUrl: getSiteAssetUrl(settingsQuery.data?.logo_main_path) ?? undefined,
        qrCode: course.qr_code,
        themePrimary: settingsQuery.data?.theme_primary ?? undefined,
        themeAccent: settingsQuery.data?.theme_accent ?? undefined,
        signatureUrl: getSiteAssetUrl(settingsQuery.data?.signature_path) ?? undefined,
      });

      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificado-${course.course_name.replace(/\s+/g, '-').toLowerCase()}-${course.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Erro inesperado';
      toast({ title: 'Erro ao gerar certificado', description: message, variant: 'destructive' });
    },
    onSettled: () => {
      setDownloadingCourseId(null);
    },
  });

  const handleSearch = () => {
    const cleaned = documentInput.replace(/\D/g, '');
    if (!cleaned) {
      toast({ title: 'Informe o CPF/CNPJ', variant: 'destructive' });
      return;
    }
    if (cleaned.length !== 11 && cleaned.length !== 14) {
      toast({ title: 'CPF/CNPJ inválido', description: 'Digite um CPF (11 dígitos) ou CNPJ (14 dígitos).', variant: 'destructive' });
      return;
    }
    if (!isValidDocument(documentInput)) {
      toast({ title: 'CPF/CNPJ inválido', description: 'Verifique os dígitos informados.', variant: 'destructive' });
      return;
    }
    setSearchedDocument(cleaned);
  };

  const now = new Date();
  const courses = certificatesQuery.data ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="fixed left-0 right-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4 lg:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4 rounded-2xl border border-border bg-background/95 px-2 py-1.5 sm:px-3 sm:py-2 shadow-sm backdrop-blur-xl transition-all duration-300">
            <div className="flex justify-start pl-1 sm:pl-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full px-3 py-2 sm:px-5 text-sm border-border text-foreground hover:bg-secondary min-h-[44px]"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </div>
            <span className="flex items-center justify-center">
              {getSiteAssetUrl(settingsQuery.data?.logo_nav_path) ? (
                <img
                  src={getSiteAssetUrl(settingsQuery.data?.logo_nav_path) as string}
                  alt="Logo"
                  width={140}
                  height={40}
                  decoding="async"
                  className="h-[36px] w-auto object-contain sm:h-[40px]"
                />
              ) : (
                <span className="font-semibold text-foreground">{settingsQuery.data?.seo_title || "Evento"}</span>
              )}
            </span>
            <div />
          </div>
        </div>
      </header>

      <main className="container mx-auto flex-1 px-3 sm:px-4 pb-10 pt-28 sm:pt-36">
        <div className="relative mx-auto max-w-2xl text-center">
          <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-80 max-w-4xl bg-[radial-gradient(circle_at_center,hsl(217,91%,60%,0.08),transparent_62%)]" />

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-primary">
            <Award className="h-8 w-8" />
          </div>

          <h1 className="mt-6 font-display text-3xl font-bold text-foreground sm:text-4xl">
            Emitir Certificado
          </h1>
          <p className="mt-3 text-muted-foreground">
            Informe seu CPF ou CNPJ para consultar os certificados disponíveis.
          </p>

          <div className="mt-6 sm:mt-8 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-8">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                placeholder="CPF ou CNPJ"
                value={documentInput}
                onChange={(e) => setDocumentInput(applyDocumentMask(e.target.value))}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                maxLength={18}
                className="flex-1 text-base"
              />
              <Button
                onClick={handleSearch}
                disabled={certificatesQuery.isLoading}
                className="bg-primary hover:bg-primary/90"
              >
                {certificatesQuery.isLoading ? (
                  'Buscando...'
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Buscar
                  </>
                )}
              </Button>
            </div>

            {searchedDocument && !certificatesQuery.isLoading && (
              <div className="mt-6 text-left">
                {certificatesQuery.isError && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center">
                    <XCircle className="mx-auto h-6 w-6 text-destructive mb-2" />
                    <p className="text-sm text-destructive font-medium">Erro ao buscar certificados</p>
                    <p className="mt-1 text-xs text-destructive/80">
                      {certificatesQuery.error instanceof Error
                        ? certificatesQuery.error.message
                        : 'Verifique sua conexão e tente novamente.'}
                    </p>
                  </div>
                )}

                {courses.length === 0 && !certificatesQuery.isError && (
                  <div className="rounded-xl border border-border bg-muted/30 p-6 text-center">
                    <FileCheck className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Nenhum certificado disponível para este documento.
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Certificados só são emitidos para participantes com presença confirmada via QR Code.
                    </p>
                  </div>
                )}

                {courses.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">
                      {courses.length} {courses.length === 1 ? 'certificado disponível' : 'certificados disponíveis'}
                    </p>
                    {courses.map((course) => {
                      const releaseDate = course.course_ends_at
                        ? new Date(course.course_ends_at)
                        : new Date(course.course_starts_at);
                      const isTimeReleased = releaseDate <= now;
                      const isScanned = course.is_scanned === true;
                      const isAvailable = isTimeReleased && isScanned;

                      return (
                        <div
                          key={course.course_id}
                          className="rounded-xl border border-border bg-background p-4"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-medium text-foreground">{course.course_name}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                <Clock className="inline h-3 w-3 mr-1" />
                                {formatDateTime(course.course_starts_at)}
                              </p>
                              {course.course_ends_at && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Término: {formatDateTime(course.course_ends_at)}
                                </p>
                              )}
                              {course.course_hours_label && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Carga horária: {course.course_hours_label}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {isAvailable ? (
                                <Button
                                  size="sm"
                                  onClick={() => downloadMutation.mutate(course)}
                                  disabled={downloadMutation.isPending}
                                >
                                  {downloadingCourseId === course.course_id ? (
                                    'Gerando...'
                                  ) : (
                                    <>
                                      <Download className="mr-1.5 h-4 w-4" />
                                      Baixar
                                    </>
                                  )}
                                </Button>
                              ) : (
                                <div className="flex flex-col items-end gap-1.5">
                                  {!isScanned && (
                                    <Badge variant="outline" className="border-red-400 text-red-600 bg-red-50">
                                      <ShieldAlert className="mr-1 h-3 w-3" />
                                      Aguardando escaneamento do QR Code
                                    </Badge>
                                  )}
                                  {!isTimeReleased && (
                                    <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50">
                                      <Clock className="mr-1 h-3 w-3" />
                                      Disponível em {releaseDate.toLocaleDateString('pt-BR')}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Certificate;
