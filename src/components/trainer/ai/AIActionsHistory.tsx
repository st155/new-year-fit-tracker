import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAIActionsHistory } from '@/hooks/useAIActionsHistory';
import { 
  Target, 
  TrendingUp, 
  CheckSquare, 
  Dumbbell, 
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIActionsHistoryProps {
  userId: string | undefined;
}

const getActionIcon = (actionType: string) => {
  const type = actionType.toLowerCase();
  if (type.includes('goal')) return Target;
  if (type.includes('measurement') || type.includes('metric')) return TrendingUp;
  if (type.includes('task')) return CheckSquare;
  if (type.includes('training') || type.includes('plan')) return Dumbbell;
  return Activity;
};

const getActionTypeLabel = (actionType: string) => {
  const type = actionType.toLowerCase();
  if (type.includes('create_goal')) return 'Создание цели';
  if (type.includes('update_goal')) return 'Обновление цели';
  if (type.includes('delete_goal')) return 'Удаление цели';
  if (type.includes('add_measurement')) return 'Добавление измерения';
  if (type.includes('create_task')) return 'Создание задачи';
  if (type.includes('update_task')) return 'Обновление задачи';
  if (type.includes('create_training_plan')) return 'Создание тренировочного плана';
  if (type.includes('assign_training_plan')) return 'Назначение плана';
  return actionType;
};

const goalTypeLabels: Record<string, string> = {
  'body_fat': 'Процент жира',
  'vo2max': 'VO2max',
  'hanging_leg_raises': 'Подъем ног в висе',
  'pushups': 'Отжимания',
  'plank': 'Планка',
  'weight': 'Вес',
  'muscle_mass': 'Мышечная масса',
  'steps': 'Шаги',
  'water_intake': 'Потребление воды',
  'sleep_hours': 'Часы сна',
  'workouts': 'Тренировки',
  'calories_burned': 'Сожженные калории'
};

const getActionDescription = (action: any) => {
  const details = action.action_details || {};
  const type = action.action_type.toLowerCase();
  
  if (type.includes('create_goal')) {
    const goalName = details.goal_name || goalTypeLabels[details.goal_type] || 'Цель';
    const targetValue = details.target_value;
    const targetUnit = details.target_unit || '';
    return `Создана цель "${goalName}": достичь ${targetValue}${targetUnit}`;
  }
  
  if (type.includes('update_goal')) {
    const goalName = details.goal_name || goalTypeLabels[details.goal_type] || 'Цель';
    if (details.target_value) {
      return `Обновлена цель "${goalName}": новое значение ${details.target_value}${details.target_unit || ''}`;
    }
    return `Обновлена цель "${goalName}"`;
  }
  
  if (type.includes('delete_goal')) {
    const goalName = details.goal_name || 'Цель';
    return `Удалена цель "${goalName}"`;
  }
  
  if (type.includes('add_measurement')) {
    const metricName = details.metric_name || details.goal_name || 'Показатель';
    const value = details.value;
    const unit = details.unit || '';
    return `Добавлено измерение "${metricName}": ${value}${unit}`;
  }
  
  if (type.includes('create_task')) {
    return `Создана задача: ${details.title || details.description || 'Новая задача'}`;
  }
  
  if (type.includes('update_task')) {
    return `Обновлена задача: ${details.title || details.description || 'Задача'}`;
  }
  
  if (type.includes('create_training_plan')) {
    return `Создан план тренировок: ${details.plan_name || details.name || 'Новый план'}`;
  }
  
  if (type.includes('assign') && type.includes('plan')) {
    return `Назначен план: ${details.plan_name || details.name || 'План тренировок'}`;
  }
  
  return JSON.stringify(details).substring(0, 100);
};

export function AIActionsHistory({ userId }: AIActionsHistoryProps) {
  const { actions, loading } = useAIActionsHistory(userId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-medium mb-2">История пуста</h3>
        <p className="text-sm">
          Здесь будут отображаться все действия, выполненные AI помощником
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">История действий AI</h2>
        <Badge variant="outline">
          {actions.length} {actions.length === 1 ? 'действие' : 'действий'}
        </Badge>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-3">
          {actions.map((action) => {
            const Icon = getActionIcon(action.action_type);
            
            return (
              <Card 
                key={action.id} 
                className={cn(
                  "p-4 border transition-colors",
                  action.success 
                    ? "bg-green-500/5 border-green-500/20 hover:bg-green-500/10" 
                    : "bg-destructive/5 border-destructive/20 hover:bg-destructive/10"
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={cn(
                    "shrink-0 mt-0.5 p-2 rounded-lg",
                    action.success ? "bg-green-500/10" : "bg-destructive/10"
                  )}>
                    <Icon className={cn(
                      "h-4 w-4",
                      action.success ? "text-green-500" : "text-destructive"
                    )} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {getActionTypeLabel(action.action_type)}
                      </Badge>
                      
                      {action.client_name && (
                        <Badge variant="secondary" className="text-xs flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {action.client_name}
                        </Badge>
                      )}
                      
                      <div className="flex items-center gap-1.5">
                        {action.success ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-destructive" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {action.success ? 'Успешно' : 'Ошибка'}
                        </span>
                      </div>
                      
                      <span className="text-xs text-muted-foreground">
                        {(() => {
                          const actionDate = new Date(action.created_at);
                          const now = new Date();
                          const diffHours = (now.getTime() - actionDate.getTime()) / (1000 * 60 * 60);
                          
                          if (diffHours < 24) {
                            return actionDate.toLocaleTimeString('ru-RU', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            });
                          } else if (diffHours < 168) { // less than 7 days
                            return actionDate.toLocaleDateString('ru-RU', { 
                              day: '2-digit', 
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            });
                          } else {
                            return actionDate.toLocaleDateString('ru-RU', { 
                              day: '2-digit', 
                              month: '2-digit',
                              year: 'numeric'
                            });
                          }
                        })()}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-sm mb-2 font-medium">
                      {getActionDescription(action)}
                    </p>

                    {/* Error message */}
                    {!action.success && action.error_message && (
                      <div className="text-xs text-destructive bg-destructive/5 p-2 rounded">
                        {action.error_message}
                      </div>
                    )}

                    {/* Details */}
                    <details className="text-xs mt-2">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Технические детали
                      </summary>
                      <div className="mt-2 p-3 bg-muted rounded text-xs space-y-1">
                        {Object.entries(action.action_details || {}).map(([key, value]) => (
                          <div key={key} className="flex gap-2">
                            <span className="text-muted-foreground font-mono min-w-[120px]">{key}:</span>
                            <span className="font-mono break-all">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
