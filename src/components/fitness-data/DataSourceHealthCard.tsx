import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DataSource {
  name: string;
  status: 'active' | 'stale' | 'error';
  lastSync: Date;
  dataFreshness: number; // hours
  confidence: number; // 0-100
  metricsCount: number;
}

interface DataSourceHealthCardProps {
  source: DataSource;
  onForceSync?: () => void;
}

export function DataSourceHealthCard({ source, onForceSync }: DataSourceHealthCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-success';
      case 'stale': return 'text-warning';
      case 'error': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success/20 text-success border-success/50">Активно</Badge>;
      case 'stale':
        return <Badge className="bg-warning/20 text-warning border-warning/50">Устарело</Badge>;
      case 'error':
        return <Badge variant="destructive">Ошибка</Badge>;
      default:
        return <Badge variant="outline">Неизвестно</Badge>;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-success';
    if (confidence >= 60) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <Card className="glass-card hover-lift group">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className={cn(
              "h-2 w-2 rounded-full",
              source.status === 'active' ? 'bg-success animate-pulse' :
              source.status === 'stale' ? 'bg-warning' :
              'bg-destructive'
            )} />
            {source.name}
          </CardTitle>
          {getStatusBadge(source.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Метрик</p>
            <p className="text-xl font-bold text-foreground">{source.metricsCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Качество данных</p>
            <p className={cn("text-xl font-bold", getConfidenceColor(source.confidence))}>
              {source.confidence}%
            </p>
          </div>
        </div>

        {/* Last Sync */}
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Последний sync:</span>
          <span className="font-medium text-foreground">
            {formatDistanceToNow(source.lastSync, { addSuffix: true, locale: ru })}
          </span>
        </div>

        {/* Data Freshness */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Свежесть данных:</span>
          <span className={cn(
            "font-medium",
            source.dataFreshness < 24 ? 'text-success' :
            source.dataFreshness < 48 ? 'text-warning' :
            'text-destructive'
          )}>
            {source.dataFreshness < 24 
              ? `${Math.round(source.dataFreshness)}ч`
              : `${Math.round(source.dataFreshness / 24)}д`
            }
          </span>
        </div>

        {/* Action */}
        {onForceSync && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full gap-2"
            onClick={onForceSync}
          >
            <RefreshCw className="h-4 w-4" />
            Force Sync
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
