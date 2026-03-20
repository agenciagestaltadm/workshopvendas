import { ArrowDown, Calendar, MapPin, Laptop } from 'lucide-react';

const HeroSection = () => {
  const scrollToCursos = () => {
    document.getElementById('cursos')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToInscricao = () => {
    document.getElementById('inscricao')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#0D4D4D] via-[#1B6B6B] to-[#2D8A8A]">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating Circles */}
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-[#7ED321]/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -right-32 w-80 h-80 bg-[#4CAF50]/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute -bottom-20 left-1/3 w-72 h-72 bg-[#7ED321]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Grid Pattern using CSS */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `linear-gradient(rgba(126, 211, 33, 0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(126, 211, 33, 0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80" />
      </div>

      {/* Content - Aumentado e mais compacto */}
      <div className="relative z-10 container mx-auto px-4 pt-28 pb-20 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Badge */}
          <div className="flex justify-center animate-fade-in">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-medium">
              <span className="w-2 h-2 bg-[#7ED321] rounded-full animate-pulse" />
              Inscrições Abertas - Parauapebas
            </span>
          </div>

          {/* Title - Maior e mais impactante */}
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold text-white leading-tight animate-fade-in drop-shadow-lg">
            <span className="text-[#7ED321]">WORKSHOP</span>
            <span className="block text-white mt-2 text-3xl md:text-4xl lg:text-5xl tracking-wider">DE VENDAS ONLINE</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-white/90 font-semibold tracking-wide uppercase animate-fade-in" style={{ animationDelay: '0.1s' }}>
            20 horas de capacitação gratuita
          </p>

          {/* Description */}
          <p className="text-base md:text-lg text-white/80 max-w-2xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Aprenda a vender pela internet com cursos práticos de produtos digitais, 
            páginas de vendas, criativos, tráfego pago e técnicas de vendas.
          </p>

          {/* Event Info Cards */}
          <div className="flex flex-wrap justify-center gap-3 md:gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
              <MapPin className="w-4 h-4 text-[#7ED321]" />
              <span className="text-white text-sm font-medium">Sebrae - Parauapebas</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
              <Calendar className="w-4 h-4 text-[#7ED321]" />
              <span className="text-white text-sm font-medium">06 a 10 de Abril</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
              <Laptop className="w-4 h-4 text-[#7ED321]" />
              <span className="text-white text-sm font-medium">Traga seu notebook</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <button 
              onClick={scrollToInscricao}
              className="group px-8 py-4 bg-gradient-to-r from-[#7ED321] to-[#4CAF50] rounded-full text-white font-bold text-lg shadow-lg shadow-[#7ED321]/30 hover:shadow-xl hover:shadow-[#7ED321]/40 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
            >
              Inscreva-se Agora
              <ArrowDown className="w-5 h-5 group-hover:translate-y-1 transition-transform" />
            </button>
            <button 
              onClick={scrollToCursos}
              className="px-8 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/30 rounded-full text-white font-semibold text-lg hover:bg-white/20 hover:border-white/40 transition-all duration-300"
            >
              Ver Módulos
            </button>
          </div>
        </div>
      </div>

      {/* Decorative Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
          <path 
            d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" 
            fill="hsl(var(--background))"
          />
        </svg>
      </div>
      
      {/* Scroll Indicator */}
      <button 
        onClick={scrollToCursos}
        className="absolute bottom-24 left-1/2 -translate-x-1/2 animate-bounce cursor-pointer z-20"
        aria-label="Rolar para baixo"
      >
        <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all">
          <ArrowDown className="w-5 h-5 text-white" />
        </div>
      </button>
    </section>
  );
};

export default HeroSection;
