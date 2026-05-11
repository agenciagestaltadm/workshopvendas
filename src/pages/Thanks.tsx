import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Calendar, Download, QrCode, Loader2, AlertCircle } from 'lucide-react';
import QRCodeSVG from 'react-qr-code';

import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { isSupabaseConfigured, requireSupabase } from '@/lib/supabase';
import { useSiteSettings } from '@/lib/site-settings';

type CourseInfo = {
  id: string;
  name: string;
  startsAt: string;
};

type QrCodeInfo = {
  course_id: string;
  qr_code: string;
  course_name: string;
};

type ThanksState = {
  registrationId?: string;
  name?: string;
  courses?: CourseInfo[];
  qrCodes?: QrCodeInfo[];
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('pt-BR', { 
    dateStyle: 'short', 
    timeStyle: 'short' 
  });
};

const Thanks = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as ThanksState;
  const [isReady, setIsReady] = useState(false);
  const [fetchedQrCodes, setFetchedQrCodes] = useState<QrCodeInfo[]>([]);
  const [isLoadingQr, setIsLoadingQr] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const qrRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const settingsQuery = useSiteSettings();
  const isQrEnabled = settingsQuery.data?.enable_qr_code ?? false;

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setIsReady(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  // Buscar QR codes via RPC se não vieram no state e o toggle estiver ativo
  const fetchQrCodes = useCallback(async () => {
    if (!isSupabaseConfigured || !state.registrationId) return;
    // Se já temos QR codes do state, não buscar de novo
    if (state.qrCodes && state.qrCodes.length > 0) return;
    // Se o toggle está desativado, não tentar buscar
    if (!isQrEnabled) return;

    setIsLoadingQr(true);
    setQrError(null);
    try {
      const supabase = requireSupabase();
      console.log('[Thanks] Buscando QR codes para registration:', state.registrationId, 'isQrEnabled:', isQrEnabled);
      const { data, error } = await supabase.rpc('generate_qr_codes_for_registration', {
        p_registration_id: state.registrationId,
      });
      console.log('[Thanks] Resultado RPC:', { data, error });
      if (error) {
        console.error('[Thanks] Erro RPC:', error.message, error.details, error.hint);
        setQrError(`Erro ao buscar QR Code: ${error.message}`);
      } else if (data && Array.isArray(data) && data.length > 0) {
        const codes = (data as { result_course_id: string; result_qr_code: string }[]).map((item) => ({
          course_id: item.result_course_id,
          qr_code: item.result_qr_code,
          course_name: (state.courses ?? []).find((c) => c.id === item.result_course_id)?.name ?? '',
        }));
        console.log('[Thanks] QR codes encontrados:', codes);
        setFetchedQrCodes(codes);
      } else {
        console.log('[Thanks] Nenhum QR code retornado. data:', data);
        setQrError('QR Codes não foram gerados. Verifique se o controle de acesso por QR Code está ativado nas configurações do site.');
      }
    } catch (e) {
      console.error('[Thanks] Erro ao buscar QR codes:', e);
      setQrError(`Erro inesperado: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsLoadingQr(false);
    }
  }, [state.registrationId, state.qrCodes, state.courses, isQrEnabled]);

  useEffect(() => {
    if (settingsQuery.isSuccess && isQrEnabled) {
      fetchQrCodes();
    }
  }, [settingsQuery.isSuccess, isQrEnabled, fetchQrCodes]);

  const courses = state.courses ?? [];
  const hasCourses = courses.length > 0;
  const qrCodes = state.qrCodes?.length ? state.qrCodes : fetchedQrCodes;
  const hasQrCodes = qrCodes.length > 0;

  const downloadQrCode = (qrCode: string, courseName: string) => {
    const svgElement = qrRefs.current[qrCode];
    if (!svgElement) return;

    const svg = svgElement.querySelector('svg');
    if (!svg) return;

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngFile;
      downloadLink.download = `qr-code-${courseName.replace(/\s+/g, '-').toLowerCase()}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
  };

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
                Voltar
              </Button>
            </div>
            <span className="flex items-center justify-center">
              <img
                src="/LogoCanaãGastronomia.png"
                alt="Canaã Gastronomia 2026"
                width={140}
                height={40}
                decoding="async"
                className="h-[36px] w-auto object-contain sm:h-[40px]"
              />
            </span>
            <div />
          </div>
        </div>
      </header>
      <main className="container mx-auto flex-1 px-3 sm:px-4 pb-10 pt-28 sm:pt-36">
        <div className="relative mx-auto max-w-2xl text-center">
          <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-80 max-w-4xl bg-[radial-gradient(circle_at_center,hsl(217,91%,60%,0.08),transparent_62%)]" />
          <div
            className={[
              'mx-auto flex h-16 w-16 items-center justify-center rounded-full',
              'bg-secondary text-primary',
              'transition-all duration-700 ease-out motion-reduce:transition-none',
              isReady ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-95 opacity-0',
            ].join(' ')}
            aria-hidden="true"
          >
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <h1
            className={[
              'mt-6 font-display text-3xl font-bold text-foreground sm:text-4xl',
              'transition-all duration-700 ease-out motion-reduce:transition-none',
              isReady ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
            ].join(' ')}
          >
            Inscrição confirmada
          </h1>
          <p
            className={[
              'mt-3 text-muted-foreground',
              'transition-all delay-100 duration-700 ease-out motion-reduce:transition-none',
              isReady ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
            ].join(' ')}
          >
            Obrigado por se inscrever no Canaã Gastronomia 2026! Sua participação foi registrada com sucesso.
          </p>



          {(hasCourses || state.registrationId) && (
            <div
              className={[
              'mt-10 rounded-2xl border border-border bg-card p-6 text-left shadow-sm',
                'transition-all delay-200 duration-700 ease-out motion-reduce:transition-none',
                isReady ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
              ].join(' ')}
            >
              {state.name && (
                <p className="text-sm text-muted-foreground">
                  Nome: <span className="font-semibold text-foreground">{state.name}</span>
                </p>
              )}

              {hasCourses && (
                <div className={state.name ? 'mt-4' : ''}>
                  <p className="text-sm font-medium text-foreground mb-3">
                    {courses.length === 1 ? 'Curso selecionado:' : `${courses.length} cursos selecionados:`}
                  </p>
                  <div className="space-y-2">
                    {courses.map((course, index) => (
                      <div 
                        key={course.id} 
                        className="rounded-xl border border-border bg-secondary p-3"
                      >
                        <div className="flex items-start gap-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">
                            {index + 1}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-foreground">{course.name}</p>
                            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {formatDateTime(course.startsAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {state.registrationId && (
                <p className="mt-4 text-sm text-muted-foreground pt-4 border-t border-border">
                  Protocolo: <span className="font-semibold text-foreground">{state.registrationId}</span>
                </p>
              )}
            </div>
          )}

          {(isLoadingQr || hasQrCodes || qrError) && isQrEnabled && (
            <div
              className={[
                'mt-10 rounded-2xl border border-border bg-card p-4 sm:p-6 text-left shadow-sm',
                'transition-all delay-300 duration-700 ease-out motion-reduce:transition-none',
                isReady ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
              ].join(' ')}
            >
              {isLoadingQr && (
                <div className="text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">Gerando QR Code de acesso...</p>
                </div>
              )}

              {qrError && !isLoadingQr && (
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  </div>
                  <p className="text-sm text-destructive font-medium mb-1">Erro ao gerar QR Code</p>
                  <p className="text-xs text-muted-foreground mb-3">{qrError}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { setQrError(null); fetchQrCodes(); }}
                  >
                    Tentar novamente
                  </Button>
                </div>
              )}

              {hasQrCodes && !isLoadingQr && !qrError && (
                <>
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <QrCode className="h-5 w-5 text-primary" />
                    <h2 className="text-base sm:text-lg font-semibold text-foreground">Seu controle de acesso</h2>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                    Apresente o QR Code na entrada do curso. Cada código é de uso único.
                  </p>
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                    {qrCodes.map((qr) => (
                      <div
                        key={qr.course_id}
                        className="rounded-xl border border-border bg-secondary p-3 sm:p-4 flex flex-col items-center"
                      >
                        <p className="text-sm font-medium text-foreground mb-2 text-center">
                          {qr.course_name}
                        </p>
                        <div
                          ref={(el) => { qrRefs.current[qr.qr_code] = el; }}
                          className="bg-white p-3 rounded-lg border-2 border-gray-200 shadow-sm"
                        >
                          <QRCodeSVG value={qr.qr_code} size={200} level="M" />
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground font-mono break-all text-center max-w-[200px]">
                          {qr.qr_code}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-3 w-full"
                          onClick={() => downloadQrCode(qr.qr_code, qr.course_name)}
                        >
                          <Download className="h-3.5 w-3.5 mr-1" />
                          Salvar QR Code
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div
            className={[
              'mt-8 p-4 rounded-xl bg-secondary border border-border',
              'transition-all delay-300 duration-700 ease-out motion-reduce:transition-none',
              isReady ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
            ].join(' ')}
          >
            <p className="text-sm text-muted-foreground">
              Você receberá mais informações por e-mail ou WhatsApp em breve.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Thanks;
