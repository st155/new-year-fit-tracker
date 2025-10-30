import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, RefreshCw } from 'lucide-react';
import { useDataQuality } from '@/hooks/useDataQuality';
import { useDataQualityHistory } from '@/hooks/useDataQualityHistory';
import { useConfidenceRecalculation } from '@/hooks/useConfidenceRecalculation';
import { useAuth } from '@/hooks/useAuth';
import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

interface CompactDataQualityLineProps {
  userId?: string;
}

export function CompactDataQualityLine({ userId }: CompactDataQualityLineProps) {
  const { user } = useAuth();
  const { averageConfidence, metricsByQuality, isLoading } = useDataQuality();
  const { data: history } = useDataQualityHistory(userId);
  const { recalculate, isRecalculating } = useConfidenceRecalculation();
  
  if (isLoading) return <Skeleton className="h-[70px] w-full" />;
  if (!metricsByQuality) return null;

  // Цвет на основе общего балла
  const getQualityColor = (score: number) => {
    if (score >= 80) return 'hsl(var(--success))';
    if (score >= 60) return 'hsl(var(--primary))';
    if (score >= 40) return 'hsl(var(--warning))';
    return 'hsl(var(--destructive))';
  };

  const qualityColor = getQualityColor(averageConfidence);
  
  const zones = [
    { icon: '✓', label: 'Отлично', count: metricsByQuality.excellent.length, color: 'hsl(var(--success))' },
    { icon: '↗', label: 'Хорошо', count: metricsByQuality.good.length, color: 'hsl(var(--primary))' },
    { icon: '⚠', label: 'Средне', count: metricsByQuality.fair.length, color: 'hsl(var(--warning))' },
    { icon: '✗', label: 'Плохо', count: metricsByQuality.poor.length, color: 'hsl(var(--destructive))' },
  ];

  const handleRecalculate = () => {
    if (user?.id) {
      recalculate({ user_id: user.id });
    }
  };

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Качество данных</h3>
          </div>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-7 w-7"
            onClick={handleRecalculate}
            disabled={isRecalculating}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRecalculating ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          {/* Левая часть: Балл */}
          <div className="flex flex-col items-center justify-center min-w-[60px]">
            <div className="text-2xl font-bold" style={{ color: qualityColor }}>
              {Math.round(averageConfidence)}%
            </div>
            <div className="text-[10px] text-muted-foreground">балл</div>
          </div>

          {/* Центр: График тренда с градиентом */}
          <div className="flex-1 h-[45px] relative">
            {history && history.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="qualityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={qualityColor} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={qualityColor} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload?.[0]) {
                        const point = payload[0].payload;
                        return (
                          <div className="bg-background/95 backdrop-blur-sm border rounded-md px-3 py-2 text-xs shadow-lg">
                            <div className="text-muted-foreground mb-1">
                              {format(parseISO(point.date), 'd MMMM', { locale: ru })}
                            </div>
                            <div className="font-semibold text-base" style={{ color: qualityColor }}>
                              {point.avgConfidence}%
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1.5">
                              <span style={{ color: zones[0].color }}>{zones[0].icon}{zones[0].count}</span>
                              <span>·</span>
                              <span style={{ color: zones[1].color }}>{zones[1].icon}{zones[1].count}</span>
                              <span>·</span>
                              <span style={{ color: zones[2].color }}>{zones[2].icon}{zones[2].count}</span>
                              <span>·</span>
                              <span style={{ color: zones[3].color }}>{zones[3].icon}{zones[3].count}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="avgConfidence" 
                    stroke={qualityColor}
                    strokeWidth={2}
                    fill="url(#qualityGradient)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                Недостаточно данных
              </div>
            )}
          </div>

          {/* Правая часть: Компактные зоны */}
          <div className="flex items-center gap-2 text-xs min-w-[120px]">
            {zones.map((zone, i) => (
              <div 
                key={i} 
                className="flex items-center gap-0.5"
                title={`${zone.label}: ${zone.count}`}
              >
                <span style={{ color: zone.color }}>{zone.icon}</span>
                <span className="font-medium">{zone.count}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
