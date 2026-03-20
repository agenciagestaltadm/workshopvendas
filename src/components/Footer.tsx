import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Instagram, Phone, Globe } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { isSupabaseConfigured, requireSupabase } from '@/lib/supabase';

const ADMIN_EMAIL = 'admgestalt@gmail.com';

const Footer = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminSubmitting, setAdminSubmitting] = useState(false);

  const canSubmitAdmin = useMemo(() => adminEmail.trim().length > 0 && adminPassword.length > 0, [adminEmail, adminPassword]);

  const handleAdminLogin = async () => {
    if (!isSupabaseConfigured) {
      toast({
        title: 'Admin indisponível',
        description: 'Supabase não configurado (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY).',
        variant: 'destructive',
      });
      return;
    }

    if (!canSubmitAdmin || adminSubmitting) return;

    setAdminSubmitting(true);
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: adminEmail.trim(),
        password: adminPassword,
      });

      if (error) throw error;

      const email = data.user?.email ?? '';
      if (email !== ADMIN_EMAIL) {
        await supabase.auth.signOut();
        toast({ title: 'Acesso negado', description: 'Credenciais inválidas.', variant: 'destructive' });
        return;
      }

      setAdminOpen(false);
      setAdminPassword('');
      navigate('/admin');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro inesperado';
      toast({ title: 'Falha no login', description: message, variant: 'destructive' });
    } finally {
      setAdminSubmitting(false);
    }
  };

  return (
    <footer className="bg-foreground text-background py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Main Content */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Logo & Description */}
            <div className="text-center md:text-left">
              <h3 className="font-display text-2xl font-bold mb-4">
                Workshop de Vendas Online
              </h3>
              <p className="text-background/70 text-sm leading-relaxed">
                Capacitação gratuita em vendas digitais em Parauapebas. 
                Aprenda a vender pela internet com cursos práticos e gratuitos.
              </p>
            </div>

            {/* Contact */}
            <div className="text-center">
              <h4 className="font-semibold mb-4">Contato</h4>
              <ul className="space-y-2 text-background/70 text-sm">
                <li className="flex items-center justify-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>Em breve</span>
                </li>
                <li className="flex items-center justify-center gap-2">
                  <Globe className="w-4 h-4" />
                  <a 
                    href="https://www.agenciagestalt.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-background transition-colors"
                  >
                    www.agenciagestalt.com
                  </a>
                </li>
                <li className="flex items-center justify-center gap-2">
                  <Instagram className="w-4 h-4" />
                  <span>@agenciagestalt</span>
                </li>
              </ul>
            </div>

            {/* Quick Links */}
            <div className="text-center md:text-right">
              <h4 className="font-semibold mb-4">Links Rápidos</h4>
              <ul className="space-y-2 text-background/70 text-sm">
                <li>
                  <button 
                    onClick={() => navigate('/registro')}
                    className="hover:text-background transition-colors"
                  >
                    Fazer Inscrição
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate('/#cursos')}
                    className="hover:text-background transition-colors"
                  >
                    Ver Cursos
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setAdminOpen(true)}
                    className="hover:text-background transition-colors"
                  >
                    Área Administrativa
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-background/20 pt-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-background/60 text-sm text-center md:text-left">
                © {currentYear} Workshop de Vendas Online. Todos os direitos reservados.
              </p>
              <p className="text-background/60 text-sm flex items-center gap-1">
                Realização com <Heart className="w-4 h-4 text-accent fill-accent" /> em Parauapebas
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Dialog */}
      <Dialog open={adminOpen} onOpenChange={setAdminOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Acesso Administrativo</DialogTitle>
            <DialogDescription>
              Entre com suas credenciais de administrador.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="admin-email" className="text-sm font-medium">
                E-mail
              </label>
              <Input
                id="admin-email"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@exemplo.com"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="admin-password" className="text-sm font-medium">
                Senha
              </label>
              <Input
                id="admin-password"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={handleAdminLogin}
              disabled={!canSubmitAdmin || adminSubmitting}
            >
              {adminSubmitting ? 'Entrando...' : 'Entrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </footer>
  );
};

export default Footer;
