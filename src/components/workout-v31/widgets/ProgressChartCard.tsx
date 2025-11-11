import { Card, LineChart, Metric } from "@tremor/react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo } from "react";
import { format, subDays, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";

interface WorkoutHistoryItem {
  id: string;
  date: Date;
  name: string;
  duration: number;
  calories: number;
  volume?: number;
  source: string;
  heartRate?: number;
}

interface ProgressMetrics {
  start: number;
  current: number;
  min: number;
  max: number;
  avg: number;
}

interface ProgressChartCardProps {
  selectedMetric: string;
  onMetricChange: (metric: string) => void;
  chartData: Array<{ date: string; value: number }>;
  metrics: ProgressMetrics;
  availableMetrics: Array<{ value: string; label: string }>;
  workouts?: WorkoutHistoryItem[];
}

export function ProgressChartCard({ 
  selectedMetric, 
  onMetricChange, 
  chartData, 
  metrics,
  availableMetrics,
  workouts = []
}: ProgressChartCardProps) {
  // Generate last 7 days
  const last7Days = useMemo(() => 
    Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i)),
    []
  );

  // Process workout data based on selected metric
  const processedChartData = useMemo(() => {
    if (!workouts.length) return chartData;

    const metricMap: Record<string, string> = {
      'calories': 'Калории',
      'duration': 'Длительность',
      'count': 'Количество',
      'heartRate': 'Средний пульс'
    };

    // Check if current metric is one of the new workout metrics
    const isWorkoutMetric = Object.values(metricMap).includes(selectedMetric);
    if (!isWorkoutMetric) return chartData;

    return last7Days.map((day, index) => {
      const dayWorkouts = workouts.filter(w => isSameDay(new Date(w.date), day));
      
      let value = 0;
      let workoutNames: string[] = [];
      
      if (selectedMetric === metricMap.calories) {
        value = dayWorkouts.reduce((sum, w) => sum + (w.calories || 0), 0);
      } else if (selectedMetric === metricMap.duration) {
        value = dayWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0);
      } else if (selectedMetric === metricMap.count) {
        value = dayWorkouts.length;
      } else if (selectedMetric === metricMap.heartRate) {
        const hrWorkouts = dayWorkouts.filter(w => w.heartRate);
        value = hrWorkouts.length > 0
          ? hrWorkouts.reduce((sum, w) => sum + (w.heartRate || 0), 0) / hrWorkouts.length
          : 0;
      }

      workoutNames = dayWorkouts.map(w => w.name);

      // Calculate percent change from previous day
      let percentChange = 0;
      if (index > 0) {
        const prevDay = last7Days[index - 1];
        const prevDayWorkouts = workouts.filter(w => isSameDay(new Date(w.date), prevDay));
        
        let prevValue = 0;
        if (selectedMetric === metricMap.calories) {
          prevValue = prevDayWorkouts.reduce((sum, w) => sum + (w.calories || 0), 0);
        } else if (selectedMetric === metricMap.duration) {
          prevValue = prevDayWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0);
        } else if (selectedMetric === metricMap.count) {
          prevValue = prevDayWorkouts.length;
        } else if (selectedMetric === metricMap.heartRate) {
          const prevHrWorkouts = prevDayWorkouts.filter(w => w.heartRate);
          prevValue = prevHrWorkouts.length > 0
            ? prevHrWorkouts.reduce((sum, w) => sum + (w.heartRate || 0), 0) / prevHrWorkouts.length
            : 0;
        }

        if (prevValue > 0) {
          percentChange = ((value - prevValue) / prevValue) * 100;
        }
      }
      
      return {
        date: format(day, 'EEE', { locale: ru }),
        value,
        fullDate: format(day, 'd MMM', { locale: ru }),
        workoutCount: dayWorkouts.length,
        workoutNames: workoutNames.join(', ') || 'Нет тренировок',
        percentChange: percentChange.toFixed(1)
      };
    });
  }, [workouts, selectedMetric, chartData, last7Days]);

  // Calculate metrics based on processed data
  const calculatedMetrics = useMemo(() => {
    if (!workouts.length || !processedChartData.some(d => d.value > 0)) {
      return metrics;
    }

    const values = processedChartData.map(d => d.value).filter(v => v > 0);
    if (values.length === 0) return metrics;

    return {
      start: values[0] || 0,
      current: values[values.length - 1] || 0,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((sum, v) => sum + v, 0) / values.length
    };
  }, [processedChartData, workouts.length, metrics]);

  // Dynamic value formatter based on metric
  const getValueFormatter = (value: number) => {
    if (selectedMetric === 'Калории') return `${value.toFixed(0)} ккал`;
    if (selectedMetric === 'Длительность') return `${value.toFixed(0)} мин`;
    if (selectedMetric === 'Количество') return `${value.toFixed(0)} трен.`;
    if (selectedMetric === 'Средний пульс') return `${value.toFixed(0)} bpm`;
    return `${value.toFixed(1)} кг`;
  };

  // Dynamic unit for metrics display
  const getUnit = () => {
    if (selectedMetric === 'Калории') return 'ккал';
    if (selectedMetric === 'Длительность') return 'мин';
    if (selectedMetric === 'Количество') return 'трен.';
    if (selectedMetric === 'Средний пульс') return 'bpm';
    return 'кг';
  };

  // Enhanced available metrics with workout data
  const enhancedMetrics = useMemo(() => {
    const workoutMetrics = [
      { value: 'Калории', label: 'Калории за 7 дней' },
      { value: 'Длительность', label: 'Длительность тренировок' },
      { value: 'Количество', label: 'Количество тренировок' },
      { value: 'Средний пульс', label: 'Средний пульс' }
    ];
    
    return [...availableMetrics, ...workoutMetrics];
  }, [availableMetrics]);

  // Custom tooltip
  const customTooltip = ({ payload, active }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    
    const data = payload[0].payload;
    const change = parseFloat(data.percentChange);
    const changeColor = change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-gray-400';
    const changeIcon = change > 0 ? '↑' : change < 0 ? '↓' : '→';
    
    return (
      <div className="bg-neutral-900/95 border border-cyan-500/50 rounded-lg p-3 shadow-lg">
        <p className="text-sm font-semibold text-cyan-400 mb-1">{data.fullDate}</p>
        <p className="text-lg font-bold text-white mb-1">
          {getValueFormatter(data.value)}
        </p>
        {data.workoutCount > 0 && (
          <>
            <p className="text-xs text-gray-400 mb-1">
              Тренировок: {data.workoutCount}
            </p>
            <p className="text-xs text-gray-400 mb-1 max-w-[200px] truncate">
              {data.workoutNames}
            </p>
          </>
        )}
        {change !== 0 && (
          <p className={`text-xs font-semibold ${changeColor}`}>
            {changeIcon} {Math.abs(change).toFixed(1)}% от предыдущего дня
          </p>
        )}
      </div>
    );
  };

  return (
    <Card className="bg-neutral-900 border-2 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Прогресс</h3>
        <Select value={selectedMetric} onValueChange={onMetricChange}>
          <SelectTrigger className="w-[200px] bg-neutral-800 border-neutral-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {enhancedMetrics.map(metric => (
              <SelectItem key={metric.value} value={metric.value}>
                {metric.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <LineChart
        className="h-56 mt-4"
        data={processedChartData}
        index="date"
        categories={["value"]}
        colors={["cyan"]}
        valueFormatter={getValueFormatter}
        showLegend={false}
        showGridLines={false}
        customTooltip={customTooltip}
      />

      <div className="grid grid-cols-3 gap-4 mt-6">
        <div>
          <p className="text-xs text-muted-foreground">Старт</p>
          <Metric className="text-foreground">{calculatedMetrics.start.toFixed(1)} {getUnit()}</Metric>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Текущий</p>
          <Metric className="text-cyan-400">{calculatedMetrics.current.toFixed(1)} {getUnit()}</Metric>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Мин/Макс/Сред</p>
          <Metric className="text-foreground text-sm">
            {calculatedMetrics.min.toFixed(0)}/{calculatedMetrics.max.toFixed(0)}/{calculatedMetrics.avg.toFixed(0)}
          </Metric>
        </div>
      </div>
    </Card>
  );
}
