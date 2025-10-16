import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Target, Activity } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { ProgressWidget } from '@/pages/ProgressNew';

interface ProgressWidgetCardProps {
  widget: ProgressWidget;
  onClick: () => void;
}

const getColorForGoal = (goalName: string) => {
  const name = goalName.toLowerCase();
  if (name.includes('вес') || name.includes('weight')) return { border: 'border-green-500', bg: 'bg-green-500/10', text: 'text-green-500', progress: 'bg-green-500' };
  if (name.includes('жир') || name.includes('fat')) return { border: 'border-orange-500', bg: 'bg-orange-500/10', text: 'text-orange-500', progress: 'bg-orange-500' };
  if (name.includes('подтяг') || name.includes('pull')) return { border: 'border-purple-500', bg: 'bg-purple-500/10', text: 'text-purple-500', progress: 'bg-purple-500' };
  if (name.includes('отжим') || name.includes('push')) return { border: 'border-yellow-500', bg: 'bg-yellow-500/10', text: 'text-yellow-500', progress: 'bg-yellow-500' };
  if (name.includes('жим') || name.includes('bench')) return { border: 'border-red-500', bg: 'bg-red-500/10', text: 'text-red-500', progress: 'bg-red-500' };
  if (name.includes('планк') || name.includes('plank')) return { border: 'border-indigo-500', bg: 'bg-indigo-500/10', text: 'text-indigo-500', progress: 'bg-indigo-500' };
  if (name.includes('выпад') || name.includes('lunge')) return { border: 'border-lime-500', bg: 'bg-lime-500/10', text: 'text-lime-500', progress: 'bg-lime-500' };
  if (name.includes('vo2')) return { border: 'border-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-500', progress: 'bg-blue-500' };
  if (name.includes('бег') || name.includes('run')) return { border: 'border-cyan-500', bg: 'bg-cyan-500/10', text: 'text-cyan-500', progress: 'bg-cyan-500' };
  return { border: 'border-slate-500', bg: 'bg-slate-500/10', text: 'text-slate-500', progress: 'bg-slate-500' };
};

export function ProgressWidgetCard({ widget, onClick }: ProgressWidgetCardProps) {
  const { user } = useAuth();
  const [currentValue, setCurrentValue] = useState<number>(0);
  const [trend, setTrend] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const colors = getColorForGoal(widget.goal_name);

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
          .limit(2);

        if (inbodyData && inbodyData.length > 0 && inbodyData[0].percent_body_fat) {
          setCurrentValue(Number(inbodyData[0].percent_body_fat));
          
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
          .limit(2);

        if (withingsData && withingsData.length > 0) {
          setCurrentValue(Number(withingsData[0].value));
          
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
          .limit(2);

        if (inbodyData && inbodyData.length > 0 && inbodyData[0].weight) {
          setCurrentValue(Number(inbodyData[0].weight));
          
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
        .limit(2);

      if (measurements && measurements.length > 0) {
        setCurrentValue(Number(measurements[0].value) || 0);
        
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

  const progress = getProgressPercentage();
  const isNegativeTrend = trend < 0;
  const goalName = widget.goal_name.toLowerCase();
  const isLowerBetter = goalName.includes('жир') || goalName.includes('fat') || 
                        goalName.includes('вес') || goalName.includes('weight') ||
                        goalName.includes('бег') || goalName.includes('run');

  return (
    <Card
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105",
        "border-2 hover:shadow-lg",
        colors.border,
        colors.bg,
        "backdrop-blur-sm"
      )}
    >
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold truncate text-foreground">
              {widget.goal_name}
            </h3>
          </div>
          {trend !== 0 && (
            <div className={cn(
              "flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full",
              isLowerBetter
                ? (isNegativeTrend ? "text-green-600 bg-green-500/20" : "text-red-600 bg-red-500/20")
                : (isNegativeTrend ? "text-red-600 bg-red-500/20" : "text-green-600 bg-green-500/20")
            )}>
              {isLowerBetter ? (
                isNegativeTrend ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />
              ) : (
                isNegativeTrend ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />
              )}
              <span>{Math.abs(trend).toFixed(1)}%</span>
            </div>
          )}
        </div>

        {/* Value */}
        <div className="space-y-1">
          <div className="flex items-baseline gap-1">
            <span className={cn("text-2xl font-bold", colors.text)}>
              {loading ? "—" : formatValue(currentValue, widget.target_unit)}
            </span>
            <span className="text-xs text-muted-foreground">{widget.target_unit}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Target className="h-3 w-3" />
            <span>
              {formatValue(widget.target_value, widget.target_unit)} {widget.target_unit}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
            <div
              className={cn("h-full transition-all duration-500 rounded-full", colors.progress)}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{progress.toFixed(0)}%</span>
            {progress >= 100 && (
              <span className="text-green-500 font-medium">Достигнуто!</span>
            )}
          </div>
        </div>
      </div>

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </Card>
  );
}
