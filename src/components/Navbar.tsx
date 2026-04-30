import { useNavigate } from 'react-router-dom';
import { BookOpen, Sparkles } from 'lucide-react';
import { NavBar } from '@/components/ui/tubelight-navbar';
import { SiteSettings, defaultSiteSettings, getSiteAssetUrl } from '@/lib/site-settings';

type Props = {
  settings?: SiteSettings;
};

const Navbar = ({ settings = defaultSiteSettings }: Props) => {
  const navigate = useNavigate();

  const navItems = [
    { name: 'Cursos', url: '#cursos', icon: BookOpen },
    { name: 'Inscreva-se', url: '/registro', icon: Sparkles, isCta: true },
  ];

  const handleItemClick = (event: React.MouseEvent, item: typeof navItems[0]) => {
    if (item.url.startsWith('#')) {
      event.preventDefault();
      const element = document.querySelector(item.url);
      element?.scrollIntoView({ behavior: 'smooth' });
    } else {
      event.preventDefault();
      navigate(item.url);
    }
  };

  return (
    <NavBar
      items={navItems}
      onItemClick={handleItemClick}
      leadingImageSrc={getSiteAssetUrl(settings.logo_nav_path) ?? '/LogoCanaãGastronomia.png'}
      leadingImageAlt="Logo do evento"
    />
  );
};

export default Navbar;
