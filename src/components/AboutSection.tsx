import { useEffect, useRef } from 'react';
import { Clock, MapPin, Monitor, Calendar } from 'lucide-react';

const AboutSection = () => {
  const features = [
    {
      icon: Calendar,
      title: '06 a 10 de Abril',
      description: '5 dias de capacitação intensiva',
    },
    {
      icon: Clock,
      title: '20 Horas',
      description: 'Carga horária total do workshop',
    },
    {
      icon: MapPin,
      title: 'Sebrae - Parauapebas',
      description: 'Local presencial do evento',
    },
    {
      icon: Monitor,
      title: 'Traga seu Notebook',
      description: 'Pré-requisito para participar',
    },
  ];

  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (nodes.length === 0) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      nodes.forEach((node) => node.setAttribute('data-revealed', 'true'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).setAttribute('data-revealed', 'true');
          observer.unobserve(entry.target);
        }
      },
      { root: null, rootMargin: '0px 0px -10% 0px', threshold: 0.15 },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="sobre"
      aria-labelledby="sobre-title"
      className="relative overflow-hidden bg-gradient-section py-20 sm:py-24 lg:py-28"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-28 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div ref={rootRef} className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          <header className="text-center">
            <span
              data-reveal
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-4 py-2 text-sm font-medium text-foreground shadow-soft backdrop-blur-sm"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
              Sobre o Workshop
            </span>
            <h2
              id="sobre-title"
              data-reveal
              style={{ transitionDelay: '80ms' }}
              className="mt-6 font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl md:text-5xl"
            >
              Aprenda a <span className="text-gradient">Vender Online</span>
            </h2>
            <p
              data-reveal
              style={{ transitionDelay: '140ms' }}
              className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg"
            >
              O <strong className="text-foreground">Workshop de Vendas Online</strong> é uma capacitação gratuita 
              que vai transformar sua forma de fazer negócios na internet.{' '}
              <strong className="text-foreground">5 cursos práticos</strong> para você dominar o mundo digital.
            </p>
          </header>

          {/* Features Grid */}
          <div
            data-reveal
            style={{ transitionDelay: '200ms' }}
            className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/70 p-6 shadow-soft backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-card"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Description Cards */}
          <div
            data-reveal
            style={{ transitionDelay: '260ms' }}
            className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2"
          >
            <div className="rounded-2xl border border-border/60 bg-card/70 p-8 shadow-soft backdrop-blur-sm">
              <h3 className="font-display text-xl font-semibold text-foreground mb-4">
                Para quem é este workshop?
              </h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-accent">✓</span>
                  <span>Empreendedores que querem vender pela internet</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent">✓</span>
                  <span>Donos de pequenos negócios locais</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent">✓</span>
                  <span>Profissionais liberais e autônomos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent">✓</span>
                  <span>Quem quer iniciar um negócio digital do zero</span>
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/70 p-8 shadow-soft backdrop-blur-sm">
              <h3 className="font-display text-xl font-semibold text-foreground mb-4">
                O que você vai aprender?
              </h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-accent">✓</span>
                  <span>Produtos digitais e fornecedores confiáveis</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent">✓</span>
                  <span>Criação de páginas de vendas profissionais</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent">✓</span>
                  <span>Produção de criativos para redes sociais</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent">✓</span>
                  <span>Gestão de tráfego pago e técnicas de vendas</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
