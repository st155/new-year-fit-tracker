import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, Calendar, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    deadline: string | null;
    client: {
      username: string;
      full_name: string;
    };
  };
  onUpdate: () => void;
}

const PRIORITY_COLORS = {
  low: 'bg-blue-500',
  normal: 'bg-gray-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500'
};

export const TaskCard = ({ task, onUpdate }: TaskCardProps) => {
  const { toast } = useToast();
  const { t } = useTranslation('trainer');

  const STATUS_LABELS: Record<string, string> = {
    pending: t('tasks.status.pending'),
    in_progress: t('tasks.status.inProgress'),
    completed: t('tasks.status.completed'),
    cancelled: t('tasks.status.cancelled')
  };

  const handleToggleStatus = async () => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';

    try {
      const { error } = await supabase
        .from('client_tasks')
        .update({ status: newStatus })
        .eq('id', task.id);

      if (error) throw error;

      toast({
        title: newStatus === 'completed' ? t('tasks.taskCompleted') : t('tasks.taskResumed')
      });

      onUpdate();
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: t('tasks.error'),
        description: t('tasks.updateError'),
        variant: 'destructive'
      });
    }
  };

  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'completed';

  return (
    <Card className={`p-4 ${task.status === 'completed' ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="mt-1"
          onClick={handleToggleStatus}
        >
          {task.status === 'completed' ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
        </Button>

        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className={`font-medium ${task.status === 'completed' ? 'line-through' : ''}`}>
                {task.title}
              </h4>
              <p className="text-sm text-muted-foreground">
                {task.client.full_name} (@{task.client.username})
              </p>
            </div>
            <div className="flex gap-2">
              <div className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS]} mt-2`} />
              <Badge variant="outline">{STATUS_LABELS[task.status] || task.status}</Badge>
            </div>
          </div>

          {task.description && (
            <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
          )}

          {task.deadline && (
            <div className={`flex items-center gap-1 text-sm ${isOverdue ? 'text-red-600' : 'text-muted-foreground'}`}>
              {isOverdue && <AlertCircle className="h-4 w-4" />}
              <Calendar className="h-4 w-4" />
              <span>
                {new Date(task.deadline).toLocaleDateString('ru-RU')}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
