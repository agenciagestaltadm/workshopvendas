import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { isSupabaseConfigured, requireSupabase } from '@/lib/supabase';

type HomeCourse = {
  id: string;
  name: string;
  starts_at: string;
  time_label: string | null;
  location: string | null;
  image_path: string | null;
  facilitator: string | null;
  description: string | null;
  is_active: boolean;
};

const CoursesCarousel = () => {
  const bucket = 'courses-images';
  const navigate = useNavigate();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});

  const coursesQuery = useQuery({
    queryKey: ['home_courses'],
    enabled: isSupabaseConfigured,
    queryFn: async () => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from('courses')
        .select('id,name,starts_at,time_label,location,image_path,facilitator,description,is_active')
        .eq('is_active', true)
        .order('starts_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as HomeCourse[];
    },
  });

  const courses = useMemo(() => {
    if (!isSupabaseConfigured) return [];
    const supabase = requireSupabase();
    return (coursesQuery.data ?? []).map((course) => {
      const imageUrl = course.image_path
        ? supabase.storage.from(bucket).getPublicUrl(course.image_path).data.publicUrl
        : null;
      const startsAt = new Date(course.starts_at);
      const dateLabel = Number.isNaN(startsAt.getTime())
        ? course.starts_at
        : startsAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
      return {
        ...course,
        imageUrl,
        dateLabel,
      };
    });
  }, [coursesQuery.data]);

  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const handleInscrever = () => {
    navigate('/registro');
  };

  const toggleDescription = (courseId: string) => {
    setExpandedDescriptions((prev) => ({
      ...prev,
      [courseId]: !prev[courseId],
    }));
  };

  return (
    <section id="cursos" className="bg-background py-12 sm:py-16 lg:py-24">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="mx-auto mb-8 sm:mb-10 lg:mb-14 max-w-3xl text-center">
            <span className="mb-3 sm:mb-4 inline-flex rounded-full border border-primary/15 bg-secondary/70 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold uppercase tracking-[0.15em] sm:tracking-[0.18em] text-primary shadow-sm">
              Programação
            </span>
            <h2 className="mb-3 sm:mb-4 font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground lg:text-5xl">
              Cursos do Evento
            </h2>
            <p className="mx-auto max-w-2xl text-sm sm:text-base leading-6 sm:leading-7 text-muted-foreground md:text-lg md:leading-8">
              Confira nossa programação completa com datas, palestrantes e locais.
            </p>
          </div>

          {/* Carousel */}
          <div className="relative">
            {coursesQuery.isError && (
              <div className="mb-8 rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-center text-base text-destructive">
                Erro ao carregar cursos. Tente novamente em instantes.
              </div>
            )}
            <Carousel
              setApi={setApi}
              opts={{
                align: 'center',
                loop: true,
              }}
              plugins={[
                Autoplay({
                  delay: 6000,
                  stopOnInteraction: true,
                }),
              ]}
              className="w-full"
            >
              <CarouselContent className="-ml-3 sm:-ml-4 md:-ml-5">
                {courses.map((course) => (
                  <CarouselItem key={course.id} className="pl-3 sm:pl-4 md:basis-1/2 md:pl-5 lg:basis-1/3">
                    <div className="group mx-auto flex h-full max-w-xs sm:max-w-sm flex-col overflow-hidden rounded-2xl sm:rounded-[2rem] border border-border/60 bg-card shadow-[0_12px_40px_-25px_hsl(var(--foreground)/0.4)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_-25px_hsl(var(--foreground)/0.5)]">
                      <div className="relative w-full bg-white/40 dark:bg-black/20 flex items-center justify-center p-4 sm:p-6 border-b border-border/30">
                          {course.imageUrl ? (
                            <img
                              src={course.imageUrl}
                              alt={course.name}
                              className="w-full h-auto object-contain transition-transform duration-700 group-hover:scale-105"
                              loading="lazy"
                              style={{ display: 'block' }}
                              onError={(e) => {
                                console.error('Erro ao carregar imagem do curso:', course.imageUrl);
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs sm:text-sm text-muted-foreground">
                              Imagem não cadastrada
                            </div>
                          )}
                      </div>

                      {/* Course Info */}
                      <div className="flex flex-grow flex-col p-3 sm:p-4">
                        <h3 className="mb-1.5 sm:mb-2 font-display text-base sm:text-lg font-bold leading-snug text-foreground line-clamp-2">
                          {course.name}
                        </h3>

                        {course.facilitator && (
                          <p className="mb-2 sm:mb-3 flex items-center gap-1.5 text-xs sm:text-sm font-medium text-primary/80">
                            <span className="h-px w-3 sm:w-4 bg-primary/20 flex-shrink-0" />
                            <span className="line-clamp-1">{course.facilitator}</span>
                          </p>
                        )}

                        {course.description && (
                          <div className="mb-3 sm:mb-4 flex-grow">
                            <p
                              className={`text-muted-foreground leading-relaxed text-xs sm:text-sm ${
                                expandedDescriptions[course.id] ? '' : 'line-clamp-2'
                              }`}
                            >
                              {course.description}
                            </p>
                            {course.description.length > 100 && (
                              <button
                                type="button"
                                onClick={() => toggleDescription(course.id)}
                                className="mt-1.5 sm:mt-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                              >
                                {expandedDescriptions[course.id] ? 'Menos' : 'Mais'}
                              </button>
                            )}
                          </div>
                        )}

                        <div className="mt-auto mb-4 sm:mb-6 grid gap-1.5">
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-foreground">
                            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-primary/70" />
                            <span>{course.dateLabel}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-foreground">
                            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-primary/70" />
                            <span>{course.time_label || 'Horário a definir'}</span>
                          </div>
                          <div className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-primary/50 mt-0.5" />
                            <span className="leading-tight">{course.location || 'Local a definir'}</span>
                          </div>
                        </div>

                        <button
                          onClick={handleInscrever}
                          className="w-full rounded-lg sm:rounded-xl bg-primary py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90"
                        >
                          Garantir minha vaga
                        </button>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>

              {/* Navigation */}
              <div className="mt-8 sm:mt-10 flex flex-row items-center justify-center gap-4 sm:gap-6">
                <button
                  onClick={() => api?.scrollPrev()}
                  className="group flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary/20 bg-background shadow-sm transition-all hover:border-primary hover:bg-secondary"
                  aria-label="Curso anterior"
                >
                  <ChevronLeft className="h-6 w-6 text-primary transition-transform group-hover:-translate-x-0.5" />
                </button>

                {/* Dots indicator */}
                <div className="flex gap-2.5">
                  {Array.from({ length: count }).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => api?.scrollTo(index)}
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        current === index
                          ? 'bg-primary w-8 shadow-sm shadow-primary/30'
                          : 'bg-primary/20 w-2.5 hover:bg-primary/40'
                      }`}
                      aria-label={`Ir para curso ${index + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={() => api?.scrollNext()}
                  className="group flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary/20 bg-background shadow-sm transition-all hover:border-primary hover:bg-secondary"
                  aria-label="Próximo curso"
                >
                  <ChevronRight className="h-6 w-6 text-primary transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </Carousel>
            {!coursesQuery.isLoading && courses.length === 0 && (
              <div className="mt-8 rounded-3xl border border-dashed border-border bg-muted/50 p-12 text-center text-lg text-muted-foreground">
                Nenhum curso ativo cadastrado no momento.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CoursesCarousel;
