import { useNavigate } from 'react-router-dom';
import { BookOpen, Sparkles } from 'lucide-react';
import { NavBar } from '@/components/ui/tubelight-navbar';

const Navbar = () => {
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
      leadingImageSrc="/logo-canaa-gastronomia.png"
      leadingImageAlt="Canaã Gastronomia 2026"
      leadingLabel="Canaã Gastronomia"
    />
  );
};

export default Navbar;
