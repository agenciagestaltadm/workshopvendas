import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Calendar } from 'lucide-react';

import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';

type CourseInfo = {
  id: string;
  name: string;
  startsAt: string;
};

type ThanksState = {
  registrationId?: string;
  name?: string;
  courses?: CourseInfo[];
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

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setIsReady(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  const courses = state.courses ?? [];
  const hasCourses = courses.length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="fixed left-0 right-0 top-0 z-50 px-5 pt-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur-xl transition-all duration-300">
            <div className="flex justify-start pl-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full px-5 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                onClick={() => navigate('/')}
              >
                Voltar
              </Button>
            </div>
            <span className="flex items-center justify-center">
              <img
                src="/logo-canaa-gastronomia.png"
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
              'bg-blue-50 text-blue-500',
              'transition-all duration-700 ease-out motion-reduce:transition-none',
              isReady ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-95 opacity-0',
            ].join(' ')}
            aria-hidden="true"
          >
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <h1
            className={[
              'mt-6 font-display text-3xl font-bold text-slate-800 sm:text-4xl',
              'transition-all duration-700 ease-out motion-reduce:transition-none',
              isReady ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
            ].join(' ')}
          >
            Inscrição confirmada
          </h1>
          <p
            className={[
              'mt-3 text-slate-500',
              'transition-all delay-100 duration-700 ease-out motion-reduce:transition-none',
              isReady ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
            ].join(' ')}
          >
            Obrigado por se inscrever no Canaã Gastronomia 2026! Sua participação foi registrada com sucesso.
          </p>



          {(hasCourses || state.registrationId) && (
            <div
              className={[
                'mt-10 rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm',
                'transition-all delay-200 duration-700 ease-out motion-reduce:transition-none',
                isReady ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
              ].join(' ')}
            >
              {state.name && (
                <p className="text-sm text-slate-500">
                  Nome: <span className="font-semibold text-slate-800">{state.name}</span>
                </p>
              )}

              {hasCourses && (
                <div className={state.name ? 'mt-4' : ''}>
                  <p className="text-sm font-medium text-slate-800 mb-3">
                    {courses.length === 1 ? 'Curso selecionado:' : `${courses.length} cursos selecionados:`}
                  </p>
                  <div className="space-y-2">
                    {courses.map((course, index) => (
                      <div 
                        key={course.id} 
                        className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="flex items-start gap-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs font-bold">
                            {index + 1}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-slate-800">{course.name}</p>
                            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
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
                <p className="mt-4 text-sm text-slate-500 pt-4 border-t border-slate-200">
                  Protocolo: <span className="font-semibold text-slate-800">{state.registrationId}</span>
                </p>
              )}
            </div>
          )}

          <div
            className={[
              'mt-8 p-4 rounded-xl bg-blue-50 border border-blue-100',
              'transition-all delay-300 duration-700 ease-out motion-reduce:transition-none',
              isReady ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
            ].join(' ')}
          >
            <p className="text-sm text-slate-500">
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
