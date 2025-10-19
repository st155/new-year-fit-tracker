import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar, User, Dumbbell, MoreVertical, Eye, Edit, Copy, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrainingPlanCardProps {
  plan: {
    id: string;
    name: string;
    description: string | null;
    duration_weeks: number;
    created_at: string;
    assigned_count: number;
    workout_count?: number;
  };
  onClick: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
}

export const TrainingPlanCard = ({
  plan,
  onClick,
  onEdit,
  onDuplicate,
  onDelete
}: TrainingPlanCardProps) => {
  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <Card
      className={cn(
        "p-4 cursor-pointer transition-all duration-300",
        "hover:shadow-glow hover:-translate-y-1",
        "border-border/50 hover:border-primary/50"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="p-2 rounded-lg bg-primary/10">
            <Dumbbell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-lg mb-1 truncate">{plan.name}</h4>
            {plan.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {plan.description}
              </p>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={(e) => handleAction(e as any, onClick)}>
              <Eye className="h-4 w-4 mr-2" />
              Просмотр
            </DropdownMenuItem>
            {onEdit && (
              <DropdownMenuItem onClick={(e) => handleAction(e as any, onEdit)}>
                <Edit className="h-4 w-4 mr-2" />
                Редактировать
              </DropdownMenuItem>
            )}
            {onDuplicate && (
              <DropdownMenuItem onClick={(e) => handleAction(e as any, onDuplicate)}>
                <Copy className="h-4 w-4 mr-2" />
                Дублировать
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                onClick={(e) => handleAction(e as any, onDelete)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Удалить
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-3">
        <div className="flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          {plan.duration_weeks} {plan.duration_weeks === 1 ? 'неделя' : 'недели'}
        </div>
        <div className="flex items-center gap-1">
          <User className="h-4 w-4" />
          Назначен: {plan.assigned_count}
        </div>
        {plan.workout_count !== undefined && (
          <div className="flex items-center gap-1">
            <Dumbbell className="h-4 w-4" />
            Тренировок: {plan.workout_count}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-xs">
          {new Date(plan.created_at).toLocaleDateString('ru-RU')}
        </Badge>
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          Нажмите для просмотра
          <Eye className="h-3 w-3" />
        </div>
      </div>
    </Card>
  );
};
