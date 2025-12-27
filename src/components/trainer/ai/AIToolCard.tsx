import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('trainerDashboard');
  
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
        return t('aiTool.success');
      case 'failed':
        return t('aiTool.failed');
      default:
        return t('aiTool.pending');
    }
  };

  const ActionIcon = getActionIcon();

  return (
    <Card className={cn(
      "p-4 mb-4 border-2 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2",
      action.status === 'success' && "bg-green-500/10 border-green-500/30 shadow-lg shadow-green-500/20",
      action.status === 'failed' && "bg-destructive/10 border-destructive/30 shadow-lg shadow-destructive/20",
      !action.status && "bg-muted/50 border-muted"
    )}>
      <div className="flex items-start gap-4">
        <div className={cn(
          "shrink-0 mt-0.5 p-3 rounded-xl transition-transform hover:scale-110",
          action.status === 'success' && "bg-green-500/20 ring-2 ring-green-500/30",
          action.status === 'failed' && "bg-destructive/20 ring-2 ring-destructive/30",
          !action.status && "bg-muted"
        )}>
          <ActionIcon className={cn(
            "h-5 w-5",
            action.status === 'success' && "text-green-600 dark:text-green-400",
            action.status === 'failed' && "text-destructive",
            !action.status && "text-muted-foreground"
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="outline" className={cn(
              "text-xs font-semibold",
              action.status === 'success' && "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
              action.status === 'failed' && "bg-destructive/10 text-destructive border-destructive/30"
            )}>
              {action.type}
            </Badge>
            <div className="flex items-center gap-1.5">
              {getStatusIcon()}
              <span className={cn(
                "text-xs font-medium",
                action.status === 'success' && "text-green-600 dark:text-green-400",
                action.status === 'failed' && "text-destructive",
                !action.status && "text-muted-foreground"
              )}>
                {getStatusText()}
              </span>
            </div>
          </div>
          <p className="text-sm font-medium mb-2">{action.description}</p>
          {action.result && (
            <details className="mt-3 text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-medium flex items-center gap-1">
                <span>{t('aiTool.result')}</span>
              </summary>
              <pre className="mt-2 p-3 bg-muted rounded-lg overflow-x-auto max-h-40 text-xs">
                {JSON.stringify(action.result, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    </Card>
  );
}
