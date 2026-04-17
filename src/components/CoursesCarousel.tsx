import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';

const courses = [
  {
    id: 1,
    title: 'Chocolates Bean to Bar',
    date: '21 de abril',
    time: '8h às 12h / 14h às 18h',
    location: 'Avenida da Cooperativa, 496, São José',
    image: '/fotos/CHOCOLATES BEAN TO BAR.png',
    instructor: 'Istefanny Cardoso',
    description: 'Aprenda todo o processo do chocolate Bean to Bar, desde a seleção do cacau até a produção final.',
  },
  {
    id: 2,
    title: 'Trufas Artesanais',
    date: '22 de abril',
    time: '8h às 12h / 14h às 18h',
    location: 'Rua Presidente Médici S/N, Feira do Produtor',
    image: '/fotos/TRUFAS ARTESANAIS.png',
    instructor: 'Istefanny Cardoso',
    description: 'Aprenda a produzir trufas artesanais irresistíveis com técnicas de preparo e recheios variados.',
  },
  {
    id: 3,
    title: 'Bolos Caseiros & Bolos para Venda',
    date: '23 de abril',
    time: '8h às 12h / 14h às 18h',
    location: 'Rua Presidente Médici S/N, Feira do Produtor',
    image: '/fotos/BOLOS CASEIROS & BOLOS PARA VENDA.png',
    instructor: 'Istefanny Cardoso',
    description: 'Aprenda a preparar bolos caseiros deliciosos e versões ideais para venda com técnicas lucrativas.',
  },
  {
    id: 4,
    title: 'Canais de Aquisição de Clientes',
    date: '24 de abril',
    time: '8h às 12h / 14h às 18h',
    location: 'Avenida da Cooperativa, 496, São José',
    image: '/fotos/CANAIS DE AQUISIÇÃO DE CLIENTES - FEED.png',
    instructor: 'Istefanny Cardoso',
    description: 'Descubra estratégias eficazes para atrair e conquistar novos clientes para o seu negócio.',
  },
  {
    id: 5,
    title: 'Como Iniciar um Negócio de Alimentação do Zero',
    date: '25 de abril',
    time: '8h às 12h / 14h às 18h',
    location: 'Rua Presidente Médici S/N, Feira do Produtor',
    image: '/fotos/COMO INICIAR UM NEGÓCIO DE ALIMENTAÇÃO DO ZERO - FEED.png',
    instructor: 'Istefanny Cardoso',
    description: 'Aprenda o passo a passo para montar um negócio de alimentação do zero com segurança e planejamento.',
  },
  {
    id: 6,
    title: 'Curso de Bartender Rápido',
    date: '26 de abril',
    time: '8h às 12h / 14h às 18h',
    location: 'Avenida da Cooperativa, 496, São José',
    image: '/fotos/CURSO DE BARTENDER RÁPIDO - FEED.png',
    instructor: 'Istefanny Cardoso',
    description: 'Aprenda técnicas de preparo de drinks e coquetéis para impulsionar sua carreira como bartender.',
  },
  {
    id: 7,
    title: 'Gestão de Segurança de Alimentos',
    date: '27 de abril',
    time: '8h às 12h / 14h às 18h',
    location: 'Rua Presidente Médici S/N, Feira do Produtor',
    image: '/fotos/GESTÃO DE SEGURANÇA DE ALIMENTOS CONFORME AS DIRETRIZES - FEED.png',
    instructor: 'Istefanny Cardoso',
    description: 'Conheça as diretrizes e boas práticas para garantir a segurança alimentar no seu negócio.',
  },
  {
    id: 8,
    title: 'Instagram para Negócios Locais',
    date: '28 de abril',
    time: '8h às 12h / 14h às 18h',
    location: 'Avenida da Cooperativa, 496, São José',
    image: '/fotos/INSTAGRAM PARA NEGÓCIOS LOCAIS - FEED.png',
    instructor: 'Istefanny Cardoso',
    description: 'Aprenda a usar o Instagram para promover seu negócio local e atrair mais clientes.',
  },
  {
    id: 9,
    title: 'Oficina de Cardápio',
    date: '29 de abril',
    time: '8h às 12h / 14h às 18h',
    location: 'Rua Presidente Médici S/N, Feira do Produtor',
    image: '/fotos/OFICINA DE CARDÁPIO - FEED.png',
    instructor: 'Istefanny Cardoso',
    description: 'Crie cardápios atrativos e lucrativos com técnicas de precificação e apresentação.',
  },
  {
    id: 10,
    title: 'Treinamento de Vendas',
    date: '30 de abril',
    time: '8h às 12h / 14h às 18h',
    location: 'Avenida da Cooperativa, 496, São José',
    image: '/fotos/TREINAMENTO DE VENDAS - FEED.png',
    instructor: 'Istefanny Cardoso',
    description: 'Desenvolva habilidades de vendas para aumentar seus resultados e fidelizar clientes.',
  },
];

const CoursesCarousel = () => {
  const navigate = useNavigate();
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

  const handleInscrever = () => {
    navigate('/registro');
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
              10 cursos de aprendizado prático com a chef <strong className="text-blue-500">Istefanny Cardoso</strong>
            </p>
          </div>

          {/* Carousel */}
          <div className="relative">
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
                      {/* Course Image - formato original */}
                      <div className="w-full">
                        <img
                          src={course.image}
                          alt={course.title}
                          className="w-full h-auto object-contain"
                        />
                      </div>

                      {/* Course Info */}
                      <div className="p-4 md:p-5">
                        <h3 className="font-display text-lg md:text-xl font-bold text-slate-800 mb-2">
                          {course.title}
                        </h3>
                        
                        <p className="text-slate-500 mb-4 leading-relaxed text-sm">
                          {course.description}
                        </p>

                        <div className="flex flex-wrap gap-3 mb-6">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-lg">
                            <Calendar className="w-3.5 h-3.5 text-blue-500" />
                            <span className="text-xs md:text-sm text-slate-600 font-medium">{course.date}</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-lg">
                            <Clock className="w-3.5 h-3.5 text-blue-500" />
                            <span className="text-xs md:text-sm text-slate-600 font-medium">{course.time}</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-lg">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs md:text-sm text-slate-500 font-medium truncate max-w-[200px]">{course.location}</span>
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
          </div>


        </div>
      </div>
    </section>
  );
};

export default CoursesCarousel;
