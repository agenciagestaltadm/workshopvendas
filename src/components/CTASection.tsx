import { ExternalLink, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const CTASection = () => {
  const benefits = [
    'Cursos 100% gratuitos',
    'Certificado de participação',
    '20 horas de conteúdo',
    'Traga seu notebook'
  ];

  return (
    <section id="inscricao" className="py-20 bg-gradient-hero relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-accent/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gold/10 rounded-full translate-x-1/3 translate-y-1/3" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <span className="inline-block px-4 py-2 rounded-full bg-primary-foreground/20 backdrop-blur-sm text-primary-foreground text-sm font-medium mb-6">
            Inscrições Abertas
          </span>

          {/* Title */}
          <h2 className="font-display text-3xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6">
            Como se Inscrever
          </h2>

          {/* Description */}
          <p className="text-lg md:text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto leading-relaxed">
            As inscrições são realizadas por formulário online.
            Clique no botão abaixo para <strong>garantir sua vaga</strong> no Workshop de Vendas Online em Parauapebas.
          </p>

          {/* Benefits */}
          <div className="flex flex-wrap justify-center gap-4 mb-10">
            {benefits.map((benefit, index) => (
              <div 
                key={index}
                className="flex items-center gap-2 px-4 py-2 bg-primary-foreground/10 backdrop-blur-sm rounded-full"
              >
                <CheckCircle className="w-4 h-4 text-accent" />
                <span className="text-sm text-primary-foreground font-medium">{benefit}</span>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <Link
            to="/registro"
            className="group inline-flex items-center gap-3 px-10 py-5 bg-primary-foreground text-primary rounded-full font-bold text-xl shadow-2xl hover:scale-105 hover:shadow-cta transition-all duration-300"
          >
            Fazer Inscrição
            <ExternalLink className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </Link>

          {/* Notice */}
          <p className="mt-8 text-sm text-primary-foreground/70">
            Ao clicar, você será redirecionado para o formulário de inscrição.
            <br />
            <span className="text-primary-foreground/50">
              Vagas limitadas. Confirmação por e-mail ou WhatsApp. Não esqueça de trazer seu notebook!
            </span>
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
