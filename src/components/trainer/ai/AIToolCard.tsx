import { CheckCircle2, XCircle, Clock, Target, TrendingUp, CheckSquare, Dumbbell, Activity } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AIToolCardProps {
  action: {
    type: string;
    description: string;
    status?: 'pending' | 'success' | 'failed';
    result?: any;
  };
}

export function AIToolCard({ action }: AIToolCardProps) {
  const getActionIcon = () => {
    const type = action.type.toLowerCase();
    if (type.includes('goal')) return Target;
    if (type.includes('measurement') || type.includes('metric')) return TrendingUp;
    if (type.includes('task')) return CheckSquare;
    if (type.includes('training') || type.includes('plan')) return Dumbbell;
    return Activity;
  };

  const getStatusIcon = () => {
    switch (action.status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (action.status) {
      case 'success':
        return 'Выполнено';
      case 'failed':
        return 'Ошибка';
      default:
        return 'Ожидание';
    }
  };

  const ActionIcon = getActionIcon();

  return (
    <Card className={cn(
      "p-3 mb-3 border",
      action.status === 'success' && "bg-green-500/5 border-green-500/20",
      action.status === 'failed' && "bg-destructive/5 border-destructive/20",
      !action.status && "bg-muted/50"
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "shrink-0 mt-0.5 p-2 rounded-lg",
          action.status === 'success' && "bg-green-500/10",
          action.status === 'failed' && "bg-destructive/10",
          !action.status && "bg-muted"
        )}>
          <ActionIcon className={cn(
            "h-4 w-4",
            action.status === 'success' && "text-green-500",
            action.status === 'failed' && "text-destructive",
            !action.status && "text-muted-foreground"
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {action.type}
            </Badge>
            <div className="flex items-center gap-1.5">
              {getStatusIcon()}
              <span className="text-xs text-muted-foreground">
                {getStatusText()}
              </span>
            </div>
          </div>
          <p className="text-sm">{action.description}</p>
          {action.result && (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Результат
              </summary>
              <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto max-h-40">
                {JSON.stringify(action.result, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    </Card>
  );
}
