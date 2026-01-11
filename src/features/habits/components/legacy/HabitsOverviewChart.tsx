import { Card, CardContent } from '@/components/ui/card';
import { Line, LineChart, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface HabitsOverviewChartProps {
  completionRate: number; // 0-100
  history: Array<{ date: string; rate: number }>;
}

export function HabitsOverviewChart({ completionRate, history }: HabitsOverviewChartProps) {
  const { t } = useTranslation('habits');
  
  const getColor = () => {
    if (completionRate >= 80) return 'text-habit-positive';
    if (completionRate >= 60) return 'text-yellow-500';
    return 'text-habit-negative';
  };

  const getStrokeColor = () => {
    if (completionRate >= 80) return 'hsl(var(--habit-positive))';
    if (completionRate >= 60) return 'hsl(var(--warning))';
    return 'hsl(var(--habit-negative))';
  };

  const trend = history.length >= 2 
    ? history[history.length - 1].rate - history[0].rate 
    : 0;

  const circumference = 2 * Math.PI * 86;
  const strokeDasharray = `${(completionRate / 100) * circumference} ${circumference}`;

  return (
    <Card className="glass-card border-white/10 overflow-hidden">
      <CardContent className="p-8">
        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Radial Progress */}
          <div className="relative w-48 h-48 flex-shrink-0">
            <svg className="transform -rotate-90" width="192" height="192">
              {/* Background circle */}
              <circle
                cx="96"
                cy="96"
                r="86"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className="text-muted/20"
              />
              {/* Progress circle */}
              <circle
                cx="96"
                cy="96"
                r="86"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                strokeDasharray={strokeDasharray}
                className={getColor()}
                strokeLinecap="round"
                style={{
                  transition: 'stroke-dasharray 0.5s ease'
                }}
              />
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className={`text-5xl font-bold ${getColor()}`}>
                {Math.round(completionRate)}%
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                {t('chart.completion', 'Completion')}
              </div>
            </div>
          </div>

          {/* Right side - Trend and Chart */}
          <div className="flex-1 w-full space-y-4">
            {/* Trend indicator */}
            <div className="flex items-center justify-center lg:justify-start gap-2">
              {trend >= 0 ? (
                <TrendingUp className="h-5 w-5 text-habit-positive" />
              ) : (
                <TrendingDown className="h-5 w-5 text-habit-negative" />
              )}
              <span className={trend >= 0 ? 'text-habit-positive' : 'text-habit-negative'}>
                {trend >= 0 ? '+' : ''}{t('chart.trendPeriod', '{{trend}}% for period', { trend: Math.abs(trend).toFixed(1) })}
              </span>
            </div>

            {/* Sparkline */}
            {history.length > 0 && (
              <div className="w-full h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value: any) => [`${value.toFixed(1)}%`, t('chart.completion', 'Completion')]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="rate" 
                      stroke={getStrokeColor()}
                      strokeWidth={3}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Description */}
            <p className="text-sm text-muted-foreground text-center lg:text-left">
              {completionRate >= 80 
                ? t('chart.excellent', 'Great work! Keep it up! 🎉')
                : completionRate >= 60 
                ? t('chart.good', 'Good! A little more effort and it will be perfect 💪')
                : t('chart.needsImprovement', "There's room for improvement. You can do better! 🚀")
              }
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
