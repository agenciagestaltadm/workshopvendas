import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';

type ThanksState = {
  registrationId?: string;
  name?: string;
  courseName?: string;
  startsAt?: string;
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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="fixed left-0 right-0 top-0 z-50 px-5 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[50rem]">
          <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-full border border-border/60 bg-background/70 px-2 py-2 shadow-soft backdrop-blur-lg transition-all duration-300">
            <div className="flex justify-start pl-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full px-5"
                onClick={() => navigate('/')}
              >
                Voltar para Página Inicial
              </Button>
            </div>
            <span className="flex items-center justify-center">
              <img
                src="/Design sem nome - 2026-03-20T153441.627.png"
                alt="Workshop de Vendas Online"
                width={120}
                height={48}
                decoding="async"
                className="h-[40px] w-auto object-contain sm:h-[48px]"
              />
            </span>
            <div />
          </div>
        </div>
      </header>
      <main className="container mx-auto flex-1 px-4 pb-10 pt-32 sm:pt-36">
        <div className="relative mx-auto max-w-2xl text-center">
          <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-80 max-w-4xl bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.18),transparent_62%)]" />
          <div
            className={[
              'mx-auto flex h-20 w-20 items-center justify-center rounded-full shadow-soft',
              'bg-gradient-cta text-primary-foreground',
              'transition-all duration-700 ease-out motion-reduce:transition-none',
              isReady ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-95 opacity-0',
            ].join(' ')}
            aria-hidden="true"
          >
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <h1
            className={[
              'mt-8 font-display text-3xl font-bold text-foreground sm:text-4xl',
              'transition-all duration-700 ease-out motion-reduce:transition-none',
              isReady ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
            ].join(' ')}
          >
            Inscrição confirmada
          </h1>
          <p
            className={[
              'mt-4 text-muted-foreground',
              'transition-all delay-100 duration-700 ease-out motion-reduce:transition-none',
              isReady ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
            ].join(' ')}
          >
            Obrigado por se inscrever no Workshop de Vendas Online! Sua participação foi registrada com sucesso.
          </p>

          <p
            className={[
              'mt-4 text-sm text-accent font-medium',
              'transition-all delay-150 duration-700 ease-out motion-reduce:transition-none',
              isReady ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
            ].join(' ')}
          >
            Não esqueça de trazer seu notebook!
          </p>

          {(state.courseName || state.registrationId) && (
            <div
              className={[
                'mt-10 rounded-2xl border border-border bg-card p-6 text-left shadow-soft',
                'transition-all delay-200 duration-700 ease-out motion-reduce:transition-none',
                isReady ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
              ].join(' ')}
            >
              {state.name && (
                <p className="text-sm text-muted-foreground">
                  Nome: <span className="font-semibold text-foreground">{state.name}</span>
                </p>
              )}
              {state.courseName && (
                <p className={state.name ? 'mt-2 text-sm text-muted-foreground' : 'text-sm text-muted-foreground'}>
                  Curso: <span className="font-semibold text-foreground">{state.courseName}</span>
                </p>
              )}
              {state.startsAt && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Data/Hora: <span className="font-semibold text-foreground">{state.startsAt}</span>
                </p>
              )}
              {state.registrationId && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Protocolo: <span className="font-semibold text-foreground">{state.registrationId}</span>
                </p>
              )}
            </div>
          )}

          <div
            className={[
              'mt-8 p-4 rounded-xl bg-muted/50 border border-border/60',
              'transition-all delay-300 duration-700 ease-out motion-reduce:transition-none',
              isReady ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
            ].join(' ')}
          >
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Local:</strong> Sebrae - Parauapebas
            </p>
            <p className="text-sm text-muted-foreground mt-1">
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
