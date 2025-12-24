import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { OptimizedChart } from '@/components/charts/OptimizedChart';

interface ProgressData {
  date: string;
  weight: number;
  reps: number;
  volume: number;
  isPR: boolean;
  isBodyweight?: boolean;
}

interface ProgressChartProps {
  data: ProgressData[];
  trend: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
  };
  isBodyweight?: boolean;
}

export default function ProgressChart({ data, trend, isBodyweight = false }: ProgressChartProps) {
  if (data.length === 0) {
    return (
      <div className="glass-card p-6 rounded-lg text-center">
        <p className="text-sm text-muted-foreground">
          Недостаточно данных для отображения прогресса
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Выполните упражнение несколько раз, чтобы увидеть график
        </p>
      </div>
    );
  }

  // For bodyweight: show reps; for weighted: show weight
  const primaryValue = isBodyweight ? 'Повторы' : 'Вес';
  const primaryUnit = isBodyweight ? 'повт' : 'кг';
  
  const chartData = data.map(entry => ({
    date: format(new Date(entry.date), 'dd MMM', { locale: ru }),
    [primaryValue]: isBodyweight ? entry.reps : entry.weight,
    Объем: entry.volume,
  }));

  const maxPrimaryValue = Math.max(...data.map(d => isBodyweight ? d.reps : d.weight));
  const prCount = data.filter(d => d.isPR).length;

  const TrendIcon = trend.direction === 'up' ? TrendingUp : 
                    trend.direction === 'down' ? TrendingDown : Minus;
  
  const trendColor = trend.direction === 'up' ? 'text-success' : 
                     trend.direction === 'down' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant="secondary" className="flex items-center gap-1">
          <Trophy className="w-3 h-3" />
          {prCount} PR
        </Badge>
        <Badge variant="secondary" className="flex items-center gap-1">
          Макс: {maxPrimaryValue}{primaryUnit}
        </Badge>
        {trend.direction !== 'stable' && (
          <Badge variant="outline" className={`flex items-center gap-1 ${trendColor}`}>
            <TrendIcon className="w-3 h-3" />
            {trend.percentage.toFixed(1)}%
          </Badge>
        )}
      </div>

      {/* Chart */}
      <div className="glass-card p-4 rounded-lg">
        <OptimizedChart
          type="line"
          data={chartData}
          config={{
            xKey: 'date',
            yKey: primaryValue,
            color: 'hsl(var(--primary))',
            showGrid: true,
            showTooltip: true,
            showLegend: false,
          }}
          height={200}
        />
      </div>

      {/* Recent PRs */}
      {prCount > 0 && (
        <div className="glass-card p-4 rounded-lg">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            Личные рекорды
          </h4>
          <div className="space-y-2">
            {data
              .filter(d => d.isPR)
              .slice(-3)
              .reverse()
              .map((pr, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">
                    {format(new Date(pr.date), 'dd MMM yyyy', { locale: ru })}
                  </span>
                  <span className="font-semibold text-primary">
                    {isBodyweight 
                      ? `${pr.reps} повт` 
                      : `${pr.weight}кг × ${pr.reps}`}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
