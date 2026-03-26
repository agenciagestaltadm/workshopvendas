import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import AboutSection from '@/components/AboutSection';
import CoursesSection from '@/components/CoursesSection';
import CTASection from '@/components/CTASection';
import Footer from '@/components/Footer';
import { InfiniteSlider } from '@/components/ui/infinite-slider';

const Index = () => {
  const sponsors = [
    { src: '/Logo%20Sebrae%202.png', alt: 'Sebrae' },
    { src: '/GG_logo-BLUE.png', alt: 'Global Gateway' },
    { src: '/alinvestverdecorrigida.PNG', alt: 'AL-INVEST Verde' },
    { src: '/logoUEportuvertical.jpg.jpeg', alt: 'União Europeia' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <AboutSection />
        <CoursesSection />
        <section id="patrocinadores" className="py-16 bg-background border-t border-border">
          <div className="container mx-auto px-4">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">
                  Realização
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Instituições que apoiam e fortalecem esta iniciativa de capacitação em vendas digitais.
                </p>
              </div>

              <InfiniteSlider gap={48} duration={28} durationOnHover={60} className="w-full">
                {sponsors.map((sponsor) => (
                  <div
                    key={sponsor.src}
                    className="flex items-center justify-center h-20 md:h-24 w-[220px] md:w-[260px] px-6"
                  >
                    <img
                      src={sponsor.src}
                      alt={sponsor.alt}
                      className="h-14 sm:h-16 md:h-20 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
                      loading="lazy"
                    />
                  </div>
                ))}
              </InfiniteSlider>
            </div>
          </div>
        </section>
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
