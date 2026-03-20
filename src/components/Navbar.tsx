import { BookOpen, ClipboardList, Info, Sparkles } from 'lucide-react';
import { NavBar } from '@/components/ui/tubelight-navbar';

const Navbar = () => {
  const navItems = [
    { name: 'Sobre', url: '#sobre', icon: Info },
    { name: 'Cursos', url: '#cursos', icon: BookOpen },
    { name: 'Inscrição', url: '#inscricao', icon: ClipboardList },
    { name: 'Inscreva-se', url: '#inscricao', icon: Sparkles, isCta: true },
  ];

  return (
    <NavBar
      items={navItems}
      leadingImageSrc="/Design sem nome - 2026-03-20T153441.627.png"
      leadingImageAlt="Workshop de Vendas Online"
      leadingLabel="Workshop Vendas Online"
    />
  );
};

export default Navbar;
