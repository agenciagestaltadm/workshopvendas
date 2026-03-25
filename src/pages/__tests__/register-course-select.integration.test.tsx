import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Register from '@/pages/Register';
import { TooltipProvider } from '@/components/ui/tooltip';

const rpcMock = vi.fn();
const fromMock = vi.fn();

// Mock do Supabase
vi.mock('@/lib/supabase', () => {
  return {
    isSupabaseConfigured: true,
    requireSupabase: () => ({
      rpc: rpcMock,
      from: fromMock.mockReturnValue({
        select: vi.fn().mockReturnValue({
          count: 'exact',
          head: true,
          single: vi.fn().mockResolvedValue({ data: { count: 5 }, error: null }),
        }),
      }),
      auth: {
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
        getSession: vi.fn(),
      },
    }),
  };
});

describe('Register + CourseSelect (integração)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup padrão do mock from().select()
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        count: 'exact',
        head: true,
        single: vi.fn().mockResolvedValue({ data: { count: 5 }, error: null }),
      }),
    });
  });

  it('renderiza cursos disponíveis corretamente', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    rpcMock.mockImplementation(async (fnName: string) => {
      if (fnName === 'get_course_availability') {
        return {
          data: [
            {
              course_id: 'workshop-1',
              name: 'Produtos Digitais e Seus Fornecedores',
              category: 'Curso',
              starts_at: '2026-04-06T15:00:00.000Z',
              capacity: 40,
              filled: 10,
              remaining: 30,
            },
            {
              course_id: 'workshop-2',
              name: 'Páginas de Vendas',
              category: 'Curso',
              starts_at: '2026-04-07T15:00:00.000Z',
              capacity: 40,
              filled: 20,
              remaining: 20,
            },
          ],
          error: null,
        };
      }

      return { data: null, error: null };
    });

    render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <MemoryRouter initialEntries={['/registro']}>
            <Register />
          </MemoryRouter>
        </TooltipProvider>
      </QueryClientProvider>,
    );

    // Verificar se os cursos são renderizados
    await waitFor(() => {
      expect(screen.getByText('Produtos Digitais e Seus Fornecedores')).toBeInTheDocument();
      expect(screen.getByText('Páginas de Vendas')).toBeInTheDocument();
    });
  });

  it('mostra mensagem quando não há cursos disponíveis', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    rpcMock.mockImplementation(async (fnName: string) => {
      if (fnName === 'get_course_availability') {
        return {
          data: [],
          error: null,
        };
      }

      return { data: null, error: null };
    });

    render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <MemoryRouter initialEntries={['/registro']}>
            <Register />
          </MemoryRouter>
        </TooltipProvider>
      </QueryClientProvider>,
    );

    // Verificar se a mensagem de "nenhum curso" é exibida
    await waitFor(() => {
      expect(screen.getByText('Nenhum curso disponível no momento.')).toBeInTheDocument();
    });
  });

  it('bloqueia confirmação quando o curso selecionado fica lotado em tempo real', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    rpcMock.mockImplementation(async (fnName: string) => {
      if (fnName === 'get_course_availability') {
        return {
          data: [
            {
              course_id: 'workshop-1',
              name: 'Produtos Digitais',
              category: 'Curso',
              starts_at: '2026-04-06T15:00:00.000Z',
              capacity: 40,
              filled: 10,
              remaining: 30,
            },
          ],
          error: null,
        };
      }

      return { data: null, error: null };
    });

    render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <MemoryRouter initialEntries={['/registro']}>
            <Register />
          </MemoryRouter>
        </TooltipProvider>
      </QueryClientProvider>,
    );

    // Aguardar o curso ser renderizado
    const courseButton = await screen.findByText('Produtos Digitais');
    fireEvent.click(courseButton);

    // Verificar se o botão está habilitado
    const submit = screen.getByRole('button', { name: /Confirmar inscrição/i });
    expect(submit).toBeEnabled();

    // Simular atualização em tempo real onde o curso fica lotado
    queryClient.setQueryData(['course_availability', 'vendas-online'], [
      {
        course_id: 'workshop-1',
        name: 'Produtos Digitais',
        category: 'Curso',
        starts_at: '2026-04-06T15:00:00.000Z',
        capacity: 40,
        filled: 40,
        remaining: 0,
      },
    ]);

    await waitFor(() => {
      expect(screen.getByText(/Um ou mais cursos selecionados estão lotados/i)).toBeInTheDocument();
    });
  });
});
