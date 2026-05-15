import { ExternalLink, CheckCircle, FileStack } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SiteSettings } from '@/lib/site-settings';

type Props = {
  settings?: SiteSettings;
};

const CTASection = ({ settings }: Props) => {
  const benefits = [
    'Conteúdo prático',
    'Instrutores convidados',
    settings?.hours_label?.trim() || 'Programação confirmada',
    'Certificado de participação'
  ];

  return (
    <section id="inscricao" className="relative overflow-hidden bg-background py-12 sm:py-16 lg:py-24">
      <div className="pointer-events-none absolute inset-0 bg-secondary/20" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[400px] sm:h-[600px] sm:w-[600px] lg:h-[800px] lg:w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-[60px] sm:blur-[80px] lg:blur-[100px]" />

      <div className="relative z-10 container mx-auto px-3 sm:px-4">
        <div className="mx-auto max-w-5xl rounded-xl sm:rounded-2xl lg:rounded-[2rem] border border-border/50 bg-card/95 backdrop-blur-sm p-4 sm:p-6 lg:p-10 xl:p-12 shadow-[0_20px_60px_-30px_hsl(var(--foreground)/0.3)]">
          <div className="grid gap-6 sm:gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div className="text-center lg:text-left">
              <span className="mb-3 sm:mb-4 inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold uppercase tracking-wide text-primary">
                Inscrições Abertas
              </span>

              <h2 className="mb-3 sm:mb-4 font-display text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
                Garanta sua Vaga Agora
              </h2>

              <p className="mx-auto max-w-xl text-sm sm:text-base leading-6 sm:leading-7 text-muted-foreground lg:mx-0">
                As vagas são limitadas. Faça sua inscrição online em poucos minutos e assegure sua participação no evento.
              </p>

              <p className="mt-3 sm:mt-4 text-xs sm:text-sm font-medium text-muted-foreground">
                Ambiente seguro. Confirmação imediata por e-mail ou WhatsApp.
              </p>
            </div>

            <div className="space-y-3 sm:space-y-4 rounded-lg sm:rounded-xl lg:rounded-2xl border border-border/40 bg-background/80 backdrop-blur-sm p-3 sm:p-4 lg:p-5 shadow-sm">
              <div className="grid grid-cols-1 gap-2 sm:gap-3 sm:grid-cols-2 text-left">
                {benefits.map((benefit, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 sm:gap-2.5 rounded-md sm:rounded-lg border border-border/50 bg-background/90 px-2.5 sm:px-3 py-2 sm:py-2.5"
                  >
                    <div className="flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <CheckCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-foreground leading-tight">{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2 sm:gap-3 pt-1 sm:pt-2">
                <Link
                  to={settings?.cta_primary_url || '/registro'}
                  className="group inline-flex w-full items-center justify-center gap-1.5 sm:gap-2 rounded-md sm:rounded-lg lg:rounded-xl bg-primary px-4 sm:px-6 py-2.5 sm:py-3 text-center text-xs sm:text-sm lg:text-base font-bold text-primary-foreground shadow-md shadow-primary/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg"
                >
                  {settings?.cta_primary_label?.trim() || 'Fazer Inscrição'}
                  <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>

                {settings?.enable_documents_section && (
                  <Link
                    to="/documentos"
                    className="group inline-flex w-full items-center justify-center gap-1.5 sm:gap-2 rounded-md sm:rounded-lg lg:rounded-xl border-2 border-primary/20 bg-background px-4 sm:px-6 py-2.5 sm:py-3 text-center text-xs sm:text-sm lg:text-base font-bold text-foreground shadow-sm transition-all duration-200 hover:border-primary hover:bg-secondary/30"
                  >
                    <FileStack className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary transition-transform group-hover:scale-105" />
                    {settings?.documents_button_label?.trim() || 'Documentos'}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
