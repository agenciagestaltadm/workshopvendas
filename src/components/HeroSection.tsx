import { useNavigate } from 'react-router-dom';
import { ArrowDown, ChefHat } from 'lucide-react';
import { SiteSettings, defaultSiteSettings, getSiteAssetUrl } from '@/lib/site-settings';

type Props = {
  settings?: SiteSettings;
};

const HeroSection = ({ settings = defaultSiteSettings }: Props) => {
  const navigate = useNavigate();

  const scrollToCursos = () => {
    document.getElementById('cursos')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-secondary to-background">
      {/* Subtle decorative elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 pt-28 pb-20 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Logo */}
          <div className="flex justify-center animate-fade-in">
            <img
              src={getSiteAssetUrl(settings.logo_main_path) ?? '/LogoCanaãGastronomia.png'}
              alt="Logo principal"
              className="w-auto h-24 md:h-32 object-contain"
            />
          </div>

          {/* Badge */}
          <div className="flex justify-center animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-background border border-border text-primary text-sm font-medium">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              Inscrições Abertas
            </span>
          </div>

          {/* Title - apenas logo, sem texto */}

          {/* Description */}
          <p className="text-base text-muted-foreground max-w-xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
            {settings.subheadline ?? defaultSiteSettings.subheadline}
          </p>

          {/* Event Info */}
          <div className="flex flex-wrap justify-center gap-3 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center gap-2 px-4 py-2.5 bg-background rounded-xl border border-border shadow-sm">
              <ChefHat className="w-4 h-4 text-primary" />
              <span className="text-foreground text-sm font-medium">{settings.hours_label ?? defaultSiteSettings.hours_label}</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <button 
              onClick={() => navigate(settings.cta_primary_url || '/registro')}
              className="group px-8 py-3.5 bg-primary rounded-full text-primary-foreground font-semibold text-base shadow-sm hover:bg-primary/90 hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2"
            >
              {settings.headline ?? defaultSiteSettings.headline}
              <ArrowDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
            </button>
            <button 
              onClick={scrollToCursos}
              className="px-8 py-3.5 bg-background border border-border rounded-full text-foreground font-semibold text-base hover:bg-secondary transition-all duration-200 shadow-sm"
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
        <div className="w-9 h-9 rounded-full bg-background border border-border flex items-center justify-center hover:bg-secondary transition-colors shadow-sm">
          <ArrowDown className="w-4 h-4 text-muted-foreground" />
        </div>
      </button>
    </section>
  );
};

export default HeroSection;
