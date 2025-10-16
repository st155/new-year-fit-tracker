import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Target, Scale, Flame, Dumbbell, Heart, Activity, Timer, Footprints, Zap, LucideIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { ProgressWidget } from '@/pages/ProgressNew';
import { Badge } from '@/components/ui/badge';

interface ProgressWidgetCardProps {
  widget: ProgressWidget;
  onClick: () => void;
}

interface GoalTheme {
  icon: LucideIcon;
  color: string;
  gradient: string;
  borderColor: string;
}

const getGoalTheme = (goalName: string): GoalTheme => {
  const name = goalName.toLowerCase();
  
  if (name.includes('вес') || name.includes('weight')) {
    return {
      icon: Scale,
      color: '#10b981', // green
      gradient: 'from-green-500/20 to-green-500/5',
      borderColor: '#10b98130'
    };
  }
  if (name.includes('жир') || name.includes('fat')) {
    return {
      icon: Flame,
      color: '#f97316', // orange
      gradient: 'from-orange-500/20 to-orange-500/5',
      borderColor: '#f9731630'
    };
  }
  if (name.includes('подтяг') || name.includes('pull')) {
    return {
      icon: Dumbbell,
      color: '#8b5cf6', // purple
      gradient: 'from-purple-500/20 to-purple-500/5',
      borderColor: '#8b5cf630'
    };
  }
  if (name.includes('отжим') || name.includes('push')) {
    return {
      icon: Dumbbell,
      color: '#eab308', // yellow
      gradient: 'from-yellow-500/20 to-yellow-500/5',
      borderColor: '#eab30830'
    };
  }
  if (name.includes('жим') || name.includes('bench')) {
    return {
      icon: Dumbbell,
      color: '#ef4444', // red
      gradient: 'from-red-500/20 to-red-500/5',
      borderColor: '#ef444430'
    };
  }
  if (name.includes('планк') || name.includes('plank')) {
    return {
      icon: Timer,
      color: '#6366f1', // indigo
      gradient: 'from-indigo-500/20 to-indigo-500/5',
      borderColor: '#6366f130'
    };
  }
  if (name.includes('выпад') || name.includes('lunge')) {
    return {
      icon: Activity,
      color: '#84cc16', // lime
      gradient: 'from-lime-500/20 to-lime-500/5',
      borderColor: '#84cc1630'
    };
  }
  if (name.includes('vo2')) {
    return {
      icon: Zap,
      color: '#3b82f6', // blue
      gradient: 'from-blue-500/20 to-blue-500/5',
      borderColor: '#3b82f630'
    };
  }
  if (name.includes('бег') || name.includes('run')) {
    return {
      icon: Footprints,
      color: '#06b6d4', // cyan
      gradient: 'from-cyan-500/20 to-cyan-500/5',
      borderColor: '#06b6d430'
    };
  }
  
  return {
    icon: Target,
    color: '#64748b', // slate
    gradient: 'from-slate-500/20 to-slate-500/5',
    borderColor: '#64748b30'
  };
};

export function ProgressWidgetCard({ widget, onClick }: ProgressWidgetCardProps) {
  const { user } = useAuth();
  const [currentValue, setCurrentValue] = useState<number>(0);
  const [trend, setTrend] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'inbody' | 'withings' | 'manual'>('manual');
  const [lastMeasurementDate, setLastMeasurementDate] = useState<string>('');
  const [sparklineData, setSparklineData] = useState<number[]>([]);

  const theme = getGoalTheme(widget.goal_name);
  const Icon = theme.icon;

  useEffect(() => {
    fetchData();
  }, [widget.goal_id, user?.id]);

  const fetchData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Для процента жира проверяем сначала InBody
      if (widget.goal_name.toLowerCase().includes('жир') || widget.goal_name.toLowerCase().includes('fat')) {
        // 1. InBody данные
        const { data: inbodyData } = await supabase
          .from('inbody_analyses')
          .select('percent_body_fat, test_date')
          .eq('user_id', user.id)
          .order('test_date', { ascending: false })
          .limit(10);

        if (inbodyData && inbodyData.length > 0 && inbodyData[0].percent_body_fat) {
          setCurrentValue(Number(inbodyData[0].percent_body_fat));
          setDataSource('inbody');
          setLastMeasurementDate(inbodyData[0].test_date);
          setSparklineData(inbodyData.slice(0, 7).reverse().map(d => Number(d.percent_body_fat)));
          
          if (inbodyData.length > 1 && inbodyData[1].percent_body_fat) {
            const oldValue = Number(inbodyData[1].percent_body_fat);
            const change = ((Number(inbodyData[0].percent_body_fat) - oldValue) / oldValue) * 100;
            setTrend(change);
          }
          setLoading(false);
          return;
        }

        // 2. Withings данные
        const { data: withingsData } = await supabase
          .from('metric_values')
          .select(`value, measurement_date, user_metrics!inner(metric_name, source)`)
          .eq('user_id', user.id)
          .eq('user_metrics.metric_name', 'Процент жира')
          .eq('user_metrics.source', 'withings')
          .order('measurement_date', { ascending: false })
          .limit(10);

        if (withingsData && withingsData.length > 0) {
          setCurrentValue(Number(withingsData[0].value));
          setDataSource('withings');
          setLastMeasurementDate(withingsData[0].measurement_date);
          setSparklineData(withingsData.slice(0, 7).reverse().map(d => Number(d.value)));
          
          if (withingsData.length > 1) {
            const oldValue = Number(withingsData[1].value);
            const change = ((Number(withingsData[0].value) - oldValue) / oldValue) * 100;
            setTrend(change);
          }
          setLoading(false);
          return;
        }
      }

      // Для веса проверяем InBody сначала
      if (widget.goal_name.toLowerCase().includes('вес') || widget.goal_name.toLowerCase().includes('weight')) {
        const { data: inbodyData } = await supabase
          .from('inbody_analyses')
          .select('weight, test_date')
          .eq('user_id', user.id)
          .order('test_date', { ascending: false })
          .limit(10);

        if (inbodyData && inbodyData.length > 0 && inbodyData[0].weight) {
          setCurrentValue(Number(inbodyData[0].weight));
          setDataSource('inbody');
          setLastMeasurementDate(inbodyData[0].test_date);
          setSparklineData(inbodyData.slice(0, 7).reverse().map(d => Number(d.weight)));
          
          if (inbodyData.length > 1 && inbodyData[1].weight) {
            const oldValue = Number(inbodyData[1].weight);
            const change = ((Number(inbodyData[0].weight) - oldValue) / oldValue) * 100;
            setTrend(change);
          }
          setLoading(false);
          return;
        }
      }

      // Обычные измерения из measurements
      const { data: measurements } = await supabase
        .from('measurements')
        .select('value, measurement_date')
        .eq('goal_id', widget.goal_id)
        .eq('user_id', user.id)
        .order('measurement_date', { ascending: false })
        .limit(10);

      if (measurements && measurements.length > 0) {
        setCurrentValue(Number(measurements[0].value) || 0);
        setDataSource('manual');
        setLastMeasurementDate(measurements[0].measurement_date);
        setSparklineData(measurements.slice(0, 7).reverse().map(m => Number(m.value)));
        
        if (measurements.length > 1) {
          const oldValue = Number(measurements[1].value) || 0;
          if (oldValue !== 0) {
            const change = ((Number(measurements[0].value) - oldValue) / oldValue) * 100;
            setTrend(change);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching widget data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercentage = () => {
    if (!widget.target_value || currentValue === 0) return 0;
    
    const goalName = widget.goal_name.toLowerCase();
    // For metrics where lower is better
    if (goalName.includes('жир') || goalName.includes('fat') || 
        goalName.includes('вес') || goalName.includes('weight') ||
        goalName.includes('бег') || goalName.includes('run')) {
      if (currentValue <= widget.target_value) return 100;
      return Math.max(0, Math.min(100, (1 - (currentValue - widget.target_value) / widget.target_value) * 100));
    }
    // For metrics where higher is better
    return Math.min(100, (currentValue / widget.target_value) * 100);
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === "min") {
      const minutes = Math.floor(value);
      const seconds = Math.round((value % 1) * 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return value % 1 === 0 ? value.toString() : value.toFixed(1);
  };

  const getSourceBadge = () => {
    const badges = {
      inbody: { label: 'InBody', variant: 'default' as const },
      withings: { label: 'Withings', variant: 'secondary' as const },
      manual: { label: 'Вручную', variant: 'outline' as const }
    };
    return badges[dataSource];
  };

  const progress = getProgressPercentage();
  const isNegativeTrend = trend < 0;
  const goalName = widget.goal_name.toLowerCase();
  const isLowerBetter = goalName.includes('жир') || goalName.includes('fat') || 
                        goalName.includes('вес') || goalName.includes('weight') ||
                        goalName.includes('бег') || goalName.includes('run');

  const trendColor = isLowerBetter
    ? (isNegativeTrend ? '#10b981' : '#ef4444')
    : (isNegativeTrend ? '#ef4444' : '#10b981');

  const sourceBadge = getSourceBadge();

  return (
    <Card
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl",
        "border-2 bg-gradient-to-br",
        theme.gradient
      )}
      style={{
        borderColor: theme.borderColor
      }}
    >
      <div className="p-6 space-y-4">
        {/* Header with Icon and Source */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="p-3 rounded-xl transition-transform group-hover:scale-110"
              style={{ 
                backgroundColor: `${theme.color}15`,
              }}
            >
              <Icon className="h-6 w-6" style={{ color: theme.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-foreground mb-1">
                {widget.goal_name}
              </h3>
              <Badge variant={sourceBadge.variant} className="text-xs">
                {sourceBadge.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Main Value */}
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span 
              className="text-4xl font-bold"
              style={{ color: theme.color }}
            >
              {loading ? "—" : formatValue(currentValue, widget.target_unit)}
            </span>
            <span className="text-sm text-muted-foreground">{widget.target_unit}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Target className="h-3.5 w-3.5" />
              <span>
                Цель: {formatValue(widget.target_value, widget.target_unit)} {widget.target_unit}
              </span>
            </div>
            
            {trend !== 0 && (
              <div 
                className="flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded-full"
                style={{ 
                  color: trendColor,
                  backgroundColor: `${trendColor}15`
                }}
              >
                {isLowerBetter ? (
                  isNegativeTrend ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  isNegativeTrend ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />
                )}
                <span>{Math.abs(trend).toFixed(1)}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Sparkline */}
        {sparklineData.length > 1 && (
          <div className="h-12 flex items-end gap-0.5">
            {sparklineData.map((value, idx) => {
              const maxVal = Math.max(...sparklineData);
              const minVal = Math.min(...sparklineData);
              const range = maxVal - minVal || 1;
              const heightPercent = ((value - minVal) / range) * 100;
              
              return (
                <div
                  key={idx}
                  className="flex-1 rounded-t transition-all"
                  style={{
                    height: `${heightPercent}%`,
                    backgroundColor: theme.color,
                    opacity: 0.3 + (idx / sparklineData.length) * 0.7,
                    minHeight: '4px'
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Прогресс</span>
            <span className="font-semibold">{progress.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-500 rounded-full"
              style={{ 
                width: `${progress}%`,
                backgroundColor: theme.color
              }}
            />
          </div>
          {progress >= 100 && (
            <p className="text-xs text-center font-semibold" style={{ color: theme.color }}>
              🎉 Цель достигнута!
            </p>
          )}
        </div>

        {/* Footer - Last Measurement */}
        {lastMeasurementDate && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              Последнее: {new Date(lastMeasurementDate).toLocaleDateString('ru-RU', { 
                day: 'numeric', 
                month: 'short',
                year: 'numeric'
              })}
            </p>
          </div>
        )}
      </div>

      {/* Hover Gradient Overlay */}
      <div 
        className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" 
      />
    </Card>
  );
}
