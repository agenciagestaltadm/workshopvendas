import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { getSiteAssetUrl, type HeroBanner } from '@/lib/site-settings';

type Props = {
  banners: HeroBanner[];
};

const HeroBannerCarousel = ({ banners }: Props) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  if (banners.length === 0) return null;

  return (
    <div className="relative w-full">
      <Carousel
        setApi={setApi}
        opts={{
          align: 'center',
          loop: true,
        }}
        plugins={[
          Autoplay({
            delay: 4000,
            stopOnInteraction: true,
          }),
        ]}
        className="w-full"
      >
        <CarouselContent className="-ml-0">
          {banners.map((banner) => (
            <CarouselItem key={banner.id}>
              <div className="relative w-full overflow-hidden rounded-[1.75rem] border border-border/70 bg-card shadow-[0_20px_60px_-35px_hsl(var(--foreground)/0.5)]">
                <div className="w-full max-h-[280px] sm:max-h-[340px] md:max-h-[420px]">
                  <img
                    src={getSiteAssetUrl(banner.path) ?? ''}
                    alt="Banner"
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Navigation arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={() => api?.scrollPrev()}
            className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border/80 bg-background/90 shadow-sm transition-colors hover:bg-secondary md:left-4 md:h-11 md:w-11"
            aria-label="Banner anterior"
          >
            <ChevronLeft className="h-4 w-4 text-foreground md:h-5 md:w-5" />
          </button>

          <button
            onClick={() => api?.scrollNext()}
            className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border/80 bg-background/90 shadow-sm transition-colors hover:bg-secondary md:right-4 md:h-11 md:w-11"
            aria-label="Próximo banner"
          >
            <ChevronRight className="h-4 w-4 text-foreground md:h-5 md:w-5" />
          </button>

          {/* Dots indicator */}
          <div className="mt-4 flex justify-center gap-2.5">
            {Array.from({ length: count }).map((_, index) => (
              <button
                key={index}
                onClick={() => api?.scrollTo(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  current === index
                    ? 'w-7 bg-primary shadow-sm shadow-primary/30'
                    : 'w-2 bg-muted-foreground/40 hover:bg-muted-foreground/70'
                }`}
                aria-label={`Ir para banner ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default HeroBannerCarousel;
