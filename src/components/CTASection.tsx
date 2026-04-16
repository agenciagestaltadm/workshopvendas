import { ExternalLink, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const CTASection = () => {
  const benefits = [
    'Cursos práticos',
    'Chef Istefanny Cardoso',
    '8h por curso',
    'Certificado de participação'
  ];

  return (
    <section id="inscricao" className="py-20 bg-blue-50 border-t border-blue-100">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <span className="inline-block px-4 py-1.5 rounded-full bg-blue-100 border border-blue-200 text-blue-600 text-sm font-medium mb-6">
            Inscrições Abertas
          </span>

          {/* Title */}
          <h2 className="font-display text-3xl md:text-5xl font-bold text-slate-800 mb-4">
            Como se Inscrever
          </h2>

          {/* Description */}
          <p className="text-base md:text-lg text-slate-500 mb-8 max-w-xl mx-auto leading-relaxed">
            As inscrições são realizadas por formulário online.
            Clique no botão abaixo para <strong className="text-slate-700">garantir sua vaga</strong> no Canaã Gastronomia 2026.
          </p>

          {/* Benefits */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {benefits.map((benefit, index) => (
              <div 
                key={index}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-200"
              >
                <CheckCircle className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-slate-600 font-medium">{benefit}</span>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <Link
            to="/registro"
            className="group inline-flex items-center gap-2 px-10 py-4 bg-blue-500 text-white rounded-full font-semibold text-lg shadow-sm hover:bg-blue-600 hover:shadow-md transition-all duration-200"
          >
            Fazer Inscrição
            <ExternalLink className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>

          {/* Notice */}
          <p className="mt-6 text-sm text-slate-400">
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
