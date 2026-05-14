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
        <CarouselContent>
          {banners.map((banner) => (
            <CarouselItem key={banner.id}>
              <div className="relative w-full overflow-hidden rounded-xl border border-border shadow-sm">
                <div className="w-full max-h-[280px] md:max-h-[380px]">
                  <img
                    src={getSiteAssetUrl(banner.path) ?? ''}
                    alt="Banner"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
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
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 md:w-10 md:h-10 rounded-full bg-background/90 border border-border flex items-center justify-center hover:bg-secondary transition-colors shadow-sm"
            aria-label="Banner anterior"
          >
            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 text-foreground" />
          </button>

          <button
            onClick={() => api?.scrollNext()}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 md:w-10 md:h-10 rounded-full bg-background/90 border border-border flex items-center justify-center hover:bg-secondary transition-colors shadow-sm"
            aria-label="Próximo banner"
          >
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-foreground" />
          </button>

          {/* Dots indicator */}
          <div className="flex justify-center gap-2 mt-3">
            {Array.from({ length: count }).map((_, index) => (
              <button
                key={index}
                onClick={() => api?.scrollTo(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  current === index
                    ? 'bg-primary w-6'
                    : 'bg-muted-foreground/40 w-2 hover:bg-muted-foreground/70'
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
