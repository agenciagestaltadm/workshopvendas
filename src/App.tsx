import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Register from "./pages/Register";
import Thanks from "./pages/Thanks";
import Admin from "./pages/Admin";
import Certificate from "./pages/Certificate";
import NotFound from "./pages/NotFound";
import { useApplySiteTheme, useSiteSettings } from "./lib/site-settings";

const queryClient = new QueryClient();

const ThemeSync = () => {
  const settingsQuery = useSiteSettings();
  useApplySiteTheme(settingsQuery.data);
  return null;
};

const AppRoutes = () => (
  <>
    <ThemeSync />
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/registro" element={<Register />} />
      <Route path="/obrigado" element={<Thanks />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/certificado" element={<Certificate />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
