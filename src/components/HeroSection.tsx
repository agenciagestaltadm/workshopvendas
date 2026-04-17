import { useNavigate } from 'react-router-dom';
import { ArrowDown, ChefHat } from 'lucide-react';

const HeroSection = () => {
  const navigate = useNavigate();

  const scrollToCursos = () => {
    document.getElementById('cursos')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-blue-50 to-white">
      {/* Subtle decorative elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-50/60 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 pt-28 pb-20 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Logo */}
          <div className="flex justify-center animate-fade-in">
            <img
              src="/LogoCanaãGastronomia.png"
              alt="Canaã Gastronomia 2026"
              className="w-auto h-24 md:h-32 object-contain"
            />
          </div>

          {/* Badge */}
          <div className="flex justify-center animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-600 text-sm font-medium">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
              Inscrições Abertas
            </span>
          </div>

          {/* Title - apenas logo, sem texto */}

          {/* Description */}
          <p className="text-base text-slate-500 max-w-xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Uma experiência única de aprendizado em gastronomia. 
            Cursos práticos de trufas, chocolates e bolos com a chef Istefanny Cardoso.
          </p>

          {/* Event Info */}
          <div className="flex flex-wrap justify-center gap-3 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border border-slate-200 shadow-sm">
              <ChefHat className="w-4 h-4 text-blue-500" />
              <span className="text-slate-600 text-sm font-medium">8h por curso</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <button 
              onClick={() => navigate('/registro')}
              className="group px-8 py-3.5 bg-blue-500 rounded-full text-white font-semibold text-base shadow-sm hover:bg-blue-600 hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2"
            >
              Inscreva-se Agora
              <ArrowDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
            </button>
            <button 
              onClick={scrollToCursos}
              className="px-8 py-3.5 bg-white border border-slate-200 rounded-full text-slate-700 font-semibold text-base hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm"
            >
              Ver Cursos
            </button>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <button 
        onClick={scrollToCursos}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce cursor-pointer z-20"
        aria-label="Rolar para baixo"
      >
        <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm">
          <ArrowDown className="w-4 h-4 text-slate-400" />
        </div>
      </button>
    </section>
  );
};

export default HeroSection;
