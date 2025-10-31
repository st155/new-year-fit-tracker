import { CheckCircle2, XCircle, Clock } from 'lucide-react';
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
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return 'Pending';
    }
  };

  return (
    <Card className={cn(
      "p-3 mb-3 border",
      action.status === 'success' && "bg-green-500/5 border-green-500/20",
      action.status === 'failed' && "bg-destructive/5 border-destructive/20",
      !action.status && "bg-muted/50"
    )}>
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          {getStatusIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs">
              {action.type}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {getStatusText()}
            </span>
          </div>
          <p className="text-sm">{action.description}</p>
          {action.result && (
            <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
              {JSON.stringify(action.result, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </Card>
  );
}
