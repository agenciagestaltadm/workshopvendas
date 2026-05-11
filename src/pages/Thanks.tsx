import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Calendar, Download, QrCode } from 'lucide-react';
import QRCodeSVG from 'react-qr-code';

import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';

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
  const qrRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setIsReady(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  const courses = state.courses ?? [];
  const hasCourses = courses.length > 0;
  const qrCodes = state.qrCodes ?? [];
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
      <header className="fixed left-0 right-0 top-0 z-50 px-5 pt-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-2xl border border-border bg-background/95 px-3 py-2 shadow-sm backdrop-blur-xl transition-all duration-300">
            <div className="flex justify-start pl-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full px-5 border-border text-foreground hover:bg-secondary"
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
      <main className="container mx-auto flex-1 px-4 pb-10 pt-32 sm:pt-36">
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

          {hasQrCodes && (
            <div
              className={[
                'mt-10 rounded-2xl border border-border bg-card p-6 text-left shadow-sm',
                'transition-all delay-300 duration-700 ease-out motion-reduce:transition-none',
                isReady ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
              ].join(' ')}
            >
              <div className="flex items-center gap-2 mb-4">
                <QrCode className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Seu controle de acesso</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Apresente o QR Code correspondente à entrada de cada curso. Cada código é único e de uso único.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {qrCodes.map((qr, index) => (
                  <div
                    key={qr.course_id}
                    className="rounded-xl border border-border bg-secondary p-4 flex flex-col items-center"
                  >
                    <p className="text-sm font-medium text-foreground mb-2 text-center">
                      {qr.course_name}
                    </p>
                    <div
                      ref={(el) => { qrRefs.current[qr.qr_code] = el; }}
                      className="bg-white p-2 rounded-lg"
                    >
                      <QRCodeSVG value={qr.qr_code} size={160} />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground font-mono break-all text-center max-w-[180px]">
                      {qr.qr_code}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => downloadQrCode(qr.qr_code, qr.course_name)}
                    >
                      <Download className="h-3.5 w-3.5 mr-1" />
                      Baixar QR Code
                    </Button>
                  </div>
                ))}
              </div>
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
