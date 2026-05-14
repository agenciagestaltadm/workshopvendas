import { ExternalLink, CheckCircle, FileStack } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SiteSettings, defaultSiteSettings } from '@/lib/site-settings';

type Props = {
  settings?: SiteSettings;
};

const CTASection = ({ settings = defaultSiteSettings }: Props) => {
  const benefits = [
    'Conteúdo prático',
    'Instrutores convidados',
    settings.hours_label ?? defaultSiteSettings.hours_label,
    'Certificado de participação'
  ];

  return (
    <section id="inscricao" className="py-20 bg-secondary border-t border-border">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <span className="inline-block px-4 py-1.5 rounded-full bg-background border border-border text-foreground text-sm font-medium mb-6">
            Inscrições Abertas
          </span>

          {/* Title */}
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">
            Como se Inscrever
          </h2>

          {/* Description */}
          <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">
            As inscrições são realizadas por formulário online.
            Clique no botão abaixo para <strong className="text-foreground">garantir sua vaga</strong> no evento.
          </p>

          {/* Benefits */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {benefits.map((benefit, index) => (
              <div 
                key={index}
                className="flex items-center gap-2 px-4 py-2 bg-background rounded-full border border-border"
              >
                <CheckCircle className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground font-medium">{benefit}</span>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to={settings.cta_primary_url || '/registro'}
              className="group inline-flex items-center gap-2 px-10 py-4 bg-primary text-primary-foreground rounded-full font-semibold text-lg shadow-sm hover:bg-primary/90 hover:shadow-md transition-all duration-200"
            >
              {settings.cta_primary_label ?? 'Fazer Inscrição'}
              <ExternalLink className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>

            {settings.enable_documents_section && (
              <Link
                to="/documentos"
                className="group inline-flex items-center gap-2 px-8 py-4 bg-background border-2 border-primary text-primary rounded-full font-semibold text-lg shadow-sm hover:bg-primary hover:text-primary-foreground transition-all duration-200"
              >
                <FileStack className="w-5 h-5" />
                {settings.documents_button_label || 'Documentos'}
              </Link>
            )}
          </div>

          {/* Notice */}
          <p className="mt-6 text-sm text-muted-foreground">
            Ao clicar, você será redirecionado para o formulário de inscrição.
            <br />
            Vagas limitadas. Confirmação por e-mail ou WhatsApp.
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
