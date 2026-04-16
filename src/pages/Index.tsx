import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import CoursesCarousel from '@/components/CoursesCarousel';
import CTASection from '@/components/CTASection';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <CoursesCarousel />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
