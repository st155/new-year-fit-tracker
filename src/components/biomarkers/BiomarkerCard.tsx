import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface BiomarkerCardProps {
  biomarkerId: string;
  name: string;
  category: string;
  latestValue?: number;
  unit: string;
  trend?: 'increasing' | 'decreasing' | 'stable';
  status?: 'low' | 'normal' | 'optimal' | 'high';
  history?: Array<{ date: string; value: number }>;
}

export function BiomarkerCard({
  biomarkerId,
  name,
  category,
  latestValue,
  unit,
  trend = 'stable',
  status = 'normal',
  history = [],
}: BiomarkerCardProps) {
  const navigate = useNavigate();

  const statusColors = {
    low: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    normal: 'text-green-600 bg-green-50 border-green-200',
    optimal: 'text-blue-600 bg-blue-50 border-blue-200',
    high: 'text-red-600 bg-red-50 border-red-200',
  };

  const TrendIcon = trend === 'increasing' ? TrendingUp : trend === 'decreasing' ? TrendingDown : Minus;

  return (
    <Card
      className="p-4 cursor-pointer hover:shadow-md transition-all"
      onClick={() => navigate(`/biomarkers/${biomarkerId}`)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{name}</h3>
          <p className="text-sm text-muted-foreground capitalize">{category}</p>
        </div>
        <Badge variant="outline" className={cn('ml-2', statusColors[status])}>
          {status === 'optimal' && 'Оптимально'}
          {status === 'normal' && 'Норма'}
          {status === 'low' && 'Ниже нормы'}
          {status === 'high' && 'Выше нормы'}
        </Badge>
      </div>

      {latestValue !== undefined && (
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-2xl font-bold text-foreground">{latestValue}</span>
          <span className="text-sm text-muted-foreground">{unit}</span>
          <TrendIcon
            className={cn(
              'w-4 h-4',
              trend === 'increasing' && 'text-green-600',
              trend === 'decreasing' && 'text-red-600',
              trend === 'stable' && 'text-gray-400'
            )}
          />
        </div>
      )}

      {history.length > 0 && (
        <div className="h-8 flex items-end gap-0.5">
          {history.slice(-10).map((point, i) => {
            const maxValue = Math.max(...history.map(h => h.value));
            const height = (point.value / maxValue) * 100;
            return (
              <div
                key={i}
                className="flex-1 bg-primary/20 rounded-t"
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>
      )}
    </Card>
  );
}
