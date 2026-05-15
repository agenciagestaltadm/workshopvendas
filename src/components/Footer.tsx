import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';

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
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-3 sm:px-4 pb-6 sm:pb-8 pt-12 sm:pt-16 lg:pt-20">
        <div className="max-w-7xl mx-auto">
          {/* Main Footer Content */}
          <div className="mb-10 sm:mb-14 grid grid-cols-1 gap-8 sm:gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-12">
            {/* Brand Section */}
            <div className="space-y-4 sm:space-y-6 lg:col-span-2">
              <h3 className="font-display text-xl sm:text-2xl font-bold md:text-3xl">
                Evento de Capacitação
              </h3>
              <p className="max-w-md text-xs sm:text-sm leading-6 sm:leading-7 text-background/70 md:text-base">
                Plataforma completa para gestão de inscrições e emissão de certificados.
                Transformando a experiência de eventos e workshops.
              </p>
            </div>

            {/* Quick Links */}
            <div className="space-y-4 sm:space-y-6">
              <h4 className="font-semibold text-base sm:text-lg">Links Rápidos</h4>
              <ul className="space-y-2 sm:space-y-3">
                <li>
                  <button
                    onClick={() => navigate('/registro')}
                    className="inline-block text-xs sm:text-sm text-background/70 transition-all hover:translate-x-1 hover:text-primary md:text-base"
                  >
                    Fazer Inscrição
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate('/#cursos')}
                    className="inline-block text-xs sm:text-sm text-background/70 transition-all hover:translate-x-1 hover:text-primary md:text-base"
                  >
                    Ver Cursos
                  </button>
                </li>
              </ul>
            </div>

            {/* Admin & Auth */}
            <div className="space-y-4 sm:space-y-6">
              <h4 className="font-semibold text-base sm:text-lg">Administração</h4>
              <ul className="space-y-2 sm:space-y-3">
                <li>
                  <button
                    onClick={() => setAdminOpen(true)}
                    className="inline-block text-xs sm:text-sm text-background/70 transition-all hover:translate-x-1 hover:text-primary md:text-base"
                  >
                    Acesso Restrito
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Divider & Bottom Bar */}
          <div className="flex flex-col items-center justify-between gap-4 border-t border-background/10 pt-6 sm:pt-8 md:flex-row">
            <p className="text-center text-xs sm:text-sm text-background/50 md:text-left">
              © {currentYear} Evento de Capacitação. Todos os direitos reservados.
            </p>
            <p className="flex items-center gap-1.5 rounded-full bg-background/5 px-3 sm:px-4 py-2 text-xs sm:text-sm text-background/50">
              Feito com <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-pulse fill-primary text-primary" /> para a comunidade
            </p>
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
