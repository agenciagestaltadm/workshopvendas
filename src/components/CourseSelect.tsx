import { useMemo } from 'react';
import { Check, Calendar, Users } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export type CourseSelectOption = {
  course_id: string;
  name: string;
  starts_at: string;
  capacity: number;
  remaining: number;
  is_active?: boolean; // Adicionado para indicar se inscrições estão abertas
};

type CourseSelectProps = {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  options: CourseSelectOption[];
  disabled?: boolean;
};

const getCourseStatus = (remaining: number) => {
  if (remaining <= 0) return 'sold_out';
  if (remaining <= 3) return 'last_spots';
  return 'available';
};

const formatStartsAt = (startsAt: string): { dateLabel: string; timeLabel: string; fullDate: string } => {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) {
    return { dateLabel: startsAt, timeLabel: '', fullDate: startsAt };
  }
  const dateLabel = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  const timeLabel = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return { dateLabel, timeLabel, fullDate: `${dateLabel} · ${timeLabel}` };
};

export const CourseSelect = ({ selectedIds = [], onSelectionChange, options, disabled }: CourseSelectProps) => {
  const byId = useMemo(() => {
    const map = new Map<string, CourseSelectOption>();
    for (const option of options) map.set(option.course_id, option);
    return map;
  }, [options]);

  const toggleCourse = (courseId: string) => {
    if (disabled) return;
    
    const course = byId.get(courseId);
    // Não permite selecionar esgotados ou pausados
    if (!course || course.remaining <= 0 || course.is_active === false) return;

    const isSelected = selectedIds?.includes(courseId) ?? false;
    if (isSelected) {
      onSelectionChange(selectedIds.filter(id => id !== courseId));
    } else {
      onSelectionChange([...selectedIds, courseId]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((course) => {
          const isSelected = selectedIds.includes(course.course_id);
          const status = getCourseStatus(course.remaining);
          const isSoldOut = status === 'sold_out';
          const isPaused = course.is_active === false;
          const { fullDate } = formatStartsAt(course.starts_at);
          
          return (
            <button
              key={course.course_id}
              type="button"
              onClick={() => toggleCourse(course.course_id)}
              disabled={disabled || isSoldOut || isPaused}
              className={cn(
                'relative rounded-xl border-2 p-4 text-left transition-all duration-200',
                'hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isSelected 
                  ? 'border-[#7ED321] bg-[#7ED321]/10 shadow-md' 
                  : 'border-border bg-card hover:border-[#7ED321]/50',
                (disabled || isSoldOut || isPaused) && 'cursor-not-allowed opacity-60',
                isSoldOut && 'border-destructive/30',
                isPaused && 'border-gray-400 bg-gray-100'
              )}
            >
              {/* Checkmark quando selecionado */}
              {isSelected && (
                <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-[#7ED321] text-white shadow-sm">
                  <Check className="h-4 w-4" />
                </div>
              )}

              {/* Badge de status */}
              <div className="mb-3">
                <Badge
                  className={cn(
                    'border-transparent text-xs',
                    isPaused && 'bg-gray-500 text-white',
                    !isPaused && status === 'sold_out' && 'bg-destructive text-destructive-foreground',
                    !isPaused && status === 'last_spots' && 'bg-amber-500 text-black',
                    !isPaused && status === 'available' && 'bg-emerald-600 text-white'
                  )}
                >
                  {isPaused
                    ? 'Inscrições Pausadas'
                    : status === 'sold_out'
                      ? 'Esgotado'
                      : status === 'last_spots'
                        ? `Últimas ${course.remaining} vagas`
                        : `${course.remaining} vagas`
                  }
                </Badge>
              </div>

              {/* Nome do curso */}
              <h4 className={cn(
                'mb-2 text-sm font-semibold leading-tight',
                isSelected ? 'text-foreground' : 'text-foreground'
              )}>
                {course.name}
              </h4>

              {/* Data e hora */}
              <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>{fullDate}</span>
              </div>

              {/* Capacidade */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span>{course.remaining}/{course.capacity} vagas restantes</span>
              </div>

              {/* Barra de progresso */}
              {!isSoldOut && (
                <div className="mt-3">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div 
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        status === 'last_spots' ? 'bg-amber-500' : 'bg-[#7ED321]'
                      )}
                      style={{ 
                        width: `${Math.min(100, ((course.capacity - course.remaining) / course.capacity) * 100)}%` 
                      }}
                    />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Mensagem quando não há cursos */}
      {options.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">Nenhum curso disponível no momento.</p>
        </div>
      )}

      {/* Resumo da seleção */}
      {selectedIds.length > 0 && (
        <div className="rounded-xl border border-[#7ED321]/30 bg-[#7ED321]/5 p-4">
          <p className="text-sm font-medium text-foreground">
            {selectedIds.length} {selectedIds.length === 1 ? 'curso selecionado' : 'cursos selecionados'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Clique nos cards acima para adicionar ou remover cursos da sua inscrição.
          </p>
        </div>
      )}
    </div>
  );
};
