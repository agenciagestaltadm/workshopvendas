import { useNavigate } from 'react-router-dom';
import { ArrowDown, ChefHat, Award, FileStack } from 'lucide-react';
import { SiteSettings, getSiteAssetUrl, useHeroBanners, useIsMobile } from '@/lib/site-settings';
import HeroBannerCarousel from '@/components/HeroBannerCarousel';

type Props = {
  settings?: SiteSettings;
};

const HeroSection = ({ settings }: Props) => {
  const navigate = useNavigate();
  const bannersQuery = useHeroBanners();
  const isMobile = useIsMobile();
  const effectiveSettings = settings;
  const isQrEnabled = effectiveSettings?.enable_qr_code ?? false;
  const isBannerEnabled = effectiveSettings?.enable_hero_banner ?? false;
  const logoSrc = getSiteAssetUrl(effectiveSettings?.logo_main_path);
  const primaryCtaLabel =
    effectiveSettings?.cta_primary_label?.trim() ||
    effectiveSettings?.headline?.trim() ||
    'Inscreva-se';

  const filteredBanners = (bannersQuery.data ?? []).filter((banner) => {
    if (banner.device_type === 'all') return true;
    if (isMobile) return banner.device_type === 'mobile';
    return banner.device_type === 'desktop';
  });

  const scrollToCursos = () => {
    document.getElementById('cursos')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative flex min-h-[92vh] items-center justify-center overflow-hidden bg-gradient-to-b from-secondary/45 via-background to-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-background/80 to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 h-[320px] w-[320px] -translate-y-1/3 translate-x-1/4 rounded-full bg-primary/10 blur-[110px] md:h-[620px] md:w-[620px] md:translate-x-1/3" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[280px] w-[280px] -translate-x-1/4 translate-y-1/3 rounded-full bg-accent/10 blur-[110px] md:h-[560px] md:w-[560px]" />

      <div className="relative z-10 container mx-auto px-3 sm:px-4 pb-16 sm:pb-20 pt-24 sm:pt-28 md:pb-28 md:pt-32 lg:pt-36">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl sm:rounded-[2rem] border border-border/60 bg-background/80 p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 shadow-[0_24px_80px_-40px_hsl(var(--foreground)/0.45)] backdrop-blur-xl">
            <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 sm:gap-8 text-center md:gap-10">
              <div className="flex justify-center animate-fade-in" style={{ animationDelay: '0.05s' }}>
                <span className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-primary/15 bg-background/85 px-3 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-primary shadow-sm backdrop-blur-sm">
                  <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-primary"></span>
                  </span>
                  Inscrições Abertas
                </span>
              </div>

              <div className="flex w-full justify-center animate-fade-in px-2 sm:px-0" style={{ animationDelay: '0.1s' }}>
                {logoSrc ? (
                  <div className="flex min-h-[80px] sm:min-h-[120px] md:min-h-[140px] w-full max-w-2xl lg:max-w-3xl items-center justify-center rounded-xl sm:rounded-[1.5rem] border border-border/60 bg-background/75 px-4 sm:px-6 py-3 sm:py-4 shadow-sm overflow-hidden">
                    <img
                      src={logoSrc}
                      alt="Logo principal"
                      className="max-h-[60px] sm:max-h-[80px] md:max-h-[100px] lg:max-h-[120px] w-auto object-contain drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] max-w-full"
                      onError={(e) => {
                        console.error('Erro ao carregar logo:', logoSrc);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-16 sm:h-24 md:h-32" aria-hidden="true" />
                )}
              </div>

              {effectiveSettings?.subheadline && (
                <div className="animate-fade-in px-2 sm:px-4" style={{ animationDelay: '0.15s' }}>
                  <p className="mx-auto max-w-3xl text-sm sm:text-base font-medium leading-7 sm:leading-8 text-muted-foreground md:text-lg lg:text-[1.35rem] lg:leading-9">
                    {effectiveSettings.subheadline}
                  </p>
                </div>
              )}

              {effectiveSettings?.hours_label && (
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                  <div className="flex items-center gap-2 sm:gap-2.5 rounded-xl sm:rounded-2xl border border-border/70 bg-card/90 px-3 sm:px-5 py-2.5 sm:py-3 shadow-sm backdrop-blur-sm">
                    <ChefHat className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium text-foreground md:text-base">{effectiveSettings.hours_label}</span>
                  </div>
                </div>
              )}

              {isBannerEnabled && filteredBanners.length > 0 && (
                <div className="w-full animate-fade-in" style={{ animationDelay: '0.25s' }}>
                  <HeroBannerCarousel banners={filteredBanners} />
                </div>
              )}

              <div className="w-full animate-fade-in pt-2" style={{ animationDelay: '0.3s' }}>
                <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
                  <button
                    onClick={() => navigate(effectiveSettings?.cta_primary_url || '/registro')}
                    className="group inline-flex min-h-[52px] sm:min-h-[60px] w-full items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-primary px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 md:text-lg"
                  >
                    {primaryCtaLabel}
                    <ArrowDown className="h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:translate-y-1" />
                  </button>
                  {isQrEnabled && (
                    <button
                      onClick={() => navigate('/certificado')}
                      className="group inline-flex min-h-[52px] sm:min-h-[60px] w-full items-center justify-center gap-2 rounded-xl sm:rounded-2xl border-2 border-primary/20 bg-background px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-semibold text-foreground shadow-sm transition-all duration-300 hover:border-primary hover:bg-secondary/50 md:text-lg"
                    >
                      <Award className="h-4 w-4 sm:h-5 sm:w-5 text-primary transition-transform group-hover:scale-110 flex-shrink-0" />
                      <span className="truncate">Baixar Certificado</span>
                    </button>
                  )}
                  {effectiveSettings?.enable_documents_section && (
                    <button
                      onClick={() => navigate('/documentos')}
                      className="group inline-flex min-h-[52px] sm:min-h-[60px] w-full items-center justify-center gap-2 rounded-xl sm:rounded-2xl border-2 border-primary/20 bg-background px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-semibold text-foreground shadow-sm transition-all duration-300 hover:border-primary hover:bg-secondary/50 md:text-lg"
                    >
                      <FileStack className="h-4 w-4 sm:h-5 sm:w-5 text-primary transition-transform group-hover:scale-110 flex-shrink-0" />
                      <span className="truncate">{effectiveSettings?.documents_button_label || 'Documentos'}</span>
                    </button>
                  )}
                  <button
                    onClick={scrollToCursos}
                    className="group inline-flex min-h-[52px] sm:min-h-[60px] w-full items-center justify-center gap-2 rounded-xl sm:rounded-2xl border-2 border-primary/20 bg-background px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-semibold text-foreground shadow-sm transition-all duration-300 hover:border-primary hover:bg-secondary/50 md:text-lg"
                  >
                    Ver Cursos
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={scrollToCursos}
        className="absolute bottom-4 sm:bottom-8 left-1/2 z-20 -translate-x-1/2 animate-bounce cursor-pointer"
        aria-label="Rolar para baixo"
      >
        <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full border-2 border-primary/20 bg-background/90 shadow-sm transition-colors hover:border-primary hover:bg-secondary/50">
          <ArrowDown className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
        </div>
      </button>
    </section>
  );
};

export default HeroSection;
