import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import CoursesCarousel from '@/components/CoursesCarousel';
import CTASection from '@/components/CTASection';
import Footer from '@/components/Footer';
import { useSiteSettings } from '@/lib/site-settings';

const Index = () => {
  const settingsQuery = useSiteSettings();

  return (
    <div className="min-h-screen bg-background">
      <Navbar settings={settingsQuery.data} />
      <main>
        <HeroSection settings={settingsQuery.data} />
        <CoursesCarousel />
        <CTASection settings={settingsQuery.data} />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
