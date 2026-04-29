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
  }, [coursesQuery.data, isSupabaseConfigured]);

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
    <section id="cursos" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-600 text-sm font-medium mb-4">
              Programação
            </span>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-slate-800 mb-4">
              Cursos do Evento
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Cursos cadastrados pelo admin com datas, palestrantes e imagens atualizadas.
            </p>
          </div>

          {/* Carousel */}
          <div className="relative">
            {coursesQuery.isError && (
              <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-center text-sm text-destructive">
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
                  delay: 5000,
                  stopOnInteraction: true,
                }),
              ]}
              className="w-full"
            >
              <CarouselContent className="-ml-6">
                {courses.map((course) => (
                  <CarouselItem key={course.id} className="pl-6 md:basis-1/2 lg:basis-1/3">
                    <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300 max-w-sm mx-auto">
                      <div className="w-full bg-slate-100">
                        <div className="aspect-[4/5]">
                          {course.imageUrl ? (
                            <img
                              src={course.imageUrl}
                              alt={course.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                              Imagem não cadastrada
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Course Info */}
                      <div className="p-4 md:p-5">
                        <h3 className="font-display text-lg md:text-xl font-bold text-slate-800 mb-2">
                          {course.name}
                        </h3>

                        {course.facilitator && (
                          <p className="text-sm font-medium text-blue-600 mb-2">
                            Palestrante: {course.facilitator}
                          </p>
                        )}

                        {course.description && (
                          <div className="mb-4">
                            <p
                              className={`text-slate-500 leading-relaxed text-sm ${
                                expandedDescriptions[course.id] ? '' : 'line-clamp-3'
                              }`}
                            >
                              {course.description}
                            </p>
                            {course.description.length > 140 && (
                              <button
                                type="button"
                                onClick={() => toggleDescription(course.id)}
                                className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700"
                              >
                                {expandedDescriptions[course.id] ? 'Ver menos' : 'Ver mais'}
                              </button>
                            )}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-3 mb-6">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-lg">
                            <Calendar className="w-3.5 h-3.5 text-blue-500" />
                            <span className="text-xs md:text-sm text-slate-600 font-medium">{course.dateLabel}</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-lg">
                            <Clock className="w-3.5 h-3.5 text-blue-500" />
                            <span className="text-xs md:text-sm text-slate-600 font-medium">{course.time_label || '-'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-lg">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs md:text-sm text-slate-500 font-medium truncate max-w-[200px]">{course.location || '-'}</span>
                          </div>
                        </div>

                        <button
                          onClick={handleInscrever}
                          className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors duration-200 text-sm md:text-base"
                        >
                          Inscrever-se neste curso
                        </button>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>

              {/* Navigation */}
              <div className="flex items-center justify-center gap-4 mt-8">
                <button
                  onClick={() => api?.scrollPrev()}
                  className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm"
                  aria-label="Curso anterior"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-600" />
                </button>

                {/* Dots indicator */}
                <div className="flex gap-2">
                  {Array.from({ length: count }).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => api?.scrollTo(index)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        current === index
                          ? 'bg-blue-500 w-6'
                          : 'bg-slate-300 w-2 hover:bg-slate-400'
                      }`}
                      aria-label={`Ir para curso ${index + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={() => api?.scrollNext()}
                  className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm"
                  aria-label="Próximo curso"
                >
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            </Carousel>
            {!coursesQuery.isLoading && courses.length === 0 && (
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
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
