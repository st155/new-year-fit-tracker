import { useState, useEffect } from "react";
import { Flame, Moon, Zap, Scale } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DashboardData {
  readiness: {
    score: number;
    status: string;
  };
  strain: {
    value: number;
    description: string;
  };
  sleep: {
    duration: string;
    quality: number;
  };
  bodyComposition: {
    fatPercentage: number;
    trend: string;
  };
}

type TimeFilter = 'today' | 'week' | 'month';

export default function FitnessData() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<TimeFilter>('today');
  const [data, setData] = useState<DashboardData>({
    readiness: { score: 0, status: '' },
    strain: { value: 0, description: '' },
    sleep: { duration: '0ч 0м', quality: 0 },
    bodyComposition: { fatPercentage: 0, trend: '' }
  });

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, selectedFilter]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch latest metrics from user_metrics and metric_values
      const { data: metrics, error } = await supabase
        .from('user_metrics')
        .select(`
          id,
          metric_name,
          metric_category,
          unit,
          metric_values (
            value,
            measurement_date
          )
        `)
        .eq('user_id', user?.id)
        .eq('is_active', true);

      if (error) throw error;

      // Process metrics to populate dashboard
      const processed = processMetrics(metrics);
      setData(processed);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить данные',
        variant: 'destructive'
      });
      setLoading(false);
    }
  };

  const processMetrics = (metrics: any[]): DashboardData => {
    const result: DashboardData = {
      readiness: { score: 85, status: 'Оптимально' },
      strain: { value: 14.8, description: 'Высокая нагрузка' },
      sleep: { duration: '8ч 15м', quality: 92 },
      bodyComposition: { fatPercentage: 12.5, trend: '-0.2%' }
    };

    if (!metrics) return result;

    metrics.forEach(metric => {
      const values = (metric as any).metric_values || [];
      if (values.length === 0) return;
      
      // Get the latest value
      const sortedValues = [...values].sort((a, b) => 
        new Date(b.measurement_date).getTime() - new Date(a.measurement_date).getTime()
      );
      const latestValue = sortedValues[0]?.value;

      // Map metrics to dashboard fields
      if (metric.metric_name === 'Recovery Score' || metric.metric_name === 'Recovery') {
        result.readiness.score = Math.round(latestValue);
        result.readiness.status = latestValue > 70 ? 'Оптимально' : latestValue > 40 ? 'Нормально' : 'Низкий';
      }
      
      if (metric.metric_name === 'Workout Strain' || metric.metric_name === 'Day Strain') {
        result.strain.value = Math.round(latestValue * 10) / 10;
        result.strain.description = latestValue > 15 ? 'Очень высокая' : latestValue > 10 ? 'Высокая нагрузка' : 'Умеренная';
      }
      
      if (metric.metric_name === 'Sleep Duration') {
        const hours = Math.floor(latestValue);
        const minutes = Math.round((latestValue - hours) * 60);
        result.sleep.duration = `${hours}ч ${minutes}м`;
      }
      
      if (metric.metric_name === 'Sleep Quality' || metric.metric_name === 'Sleep Performance') {
        result.sleep.quality = Math.round(latestValue);
      }

      if (metric.metric_name === 'Body Fat %' || metric.metric_category === 'body_composition') {
        if (sortedValues.length >= 2) {
          const current = sortedValues[0]?.value;
          const previous = sortedValues[1]?.value;
          const diff = current - previous;
          result.bodyComposition.fatPercentage = Math.round(current * 10) / 10;
          result.bodyComposition.trend = diff > 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`;
        } else {
          result.bodyComposition.fatPercentage = Math.round(latestValue * 10) / 10;
        }
      }
    });

    return result;
  };

  const getReadinessColor = (score: number) => {
    if (score > 70) return { color: '#10B981', label: 'Отлично' };
    if (score > 40) return { color: '#F59E0B', label: 'Нормально' };
    return { color: '#EF4444', label: 'Низкий' };
  };

  const readinessColor = getReadinessColor(data.readiness.score);

  if (loading) {
    return (
      <div className="min-h-screen pb-24 px-4 pt-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 px-4 pt-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground tracking-wider mb-4">
          ДАННЫЕ ТРЕКЕРОВ
        </h1>
        
        {/* Filter Pills */}
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedFilter('today')}
            className="px-6 py-2 rounded-full text-sm font-medium transition-all duration-300"
            style={{
              background: selectedFilter === 'today' 
                ? 'linear-gradient(135deg, #F97316, #FB923C)'
                : 'rgba(255, 255, 255, 0.05)',
              color: 'white',
              border: '2px solid',
              borderColor: selectedFilter === 'today' ? '#F97316' : 'rgba(255, 255, 255, 0.1)',
              boxShadow: selectedFilter === 'today' ? '0 0 20px rgba(249, 115, 22, 0.5)' : 'none'
            }}
          >
            Сегодня
          </button>
          <button
            onClick={() => setSelectedFilter('week')}
            className="px-6 py-2 rounded-full text-sm font-medium transition-all duration-300"
            style={{
              background: selectedFilter === 'week' 
                ? 'linear-gradient(135deg, #F97316, #FB923C)'
                : 'rgba(255, 255, 255, 0.05)',
              color: 'white',
              border: '2px solid',
              borderColor: selectedFilter === 'week' ? '#F97316' : 'rgba(255, 255, 255, 0.1)',
              boxShadow: selectedFilter === 'week' ? '0 0 20px rgba(249, 115, 22, 0.5)' : 'none'
            }}
          >
            Неделя
          </button>
          <button
            onClick={() => setSelectedFilter('month')}
            className="px-6 py-2 rounded-full text-sm font-medium transition-all duration-300"
            style={{
              background: selectedFilter === 'month' 
                ? 'linear-gradient(135deg, #F97316, #FB923C)'
                : 'rgba(255, 255, 255, 0.05)',
              color: 'white',
              border: '2px solid',
              borderColor: selectedFilter === 'month' ? '#F97316' : 'rgba(255, 255, 255, 0.1)',
              boxShadow: selectedFilter === 'month' ? '0 0 20px rgba(249, 115, 22, 0.5)' : 'none'
            }}
          >
            Месяц
          </button>
        </div>
      </div>

      {/* Hero Card: Readiness */}
      <div 
        className="relative rounded-3xl p-8 mb-6 transition-all duration-300"
        style={{
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '2px solid',
          borderColor: readinessColor.color,
          boxShadow: `0 0 30px ${readinessColor.color}66`
        }}
      >
        <h2 className="text-2xl font-bold text-white mb-6">Готовность</h2>
        
        <div className="flex items-center justify-center">
          {/* Donut Chart */}
          <div className="relative w-48 h-48">
            <svg className="w-full h-full transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="96"
                cy="96"
                r="80"
                fill="none"
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="16"
              />
              {/* Progress circle */}
              <circle
                cx="96"
                cy="96"
                r="80"
                fill="none"
                stroke={readinessColor.color}
                strokeWidth="16"
                strokeDasharray={`${2 * Math.PI * 80 * (data.readiness.score / 100)} ${2 * Math.PI * 80}`}
                strokeLinecap="round"
                style={{
                  filter: `drop-shadow(0 0 8px ${readinessColor.color})`
                }}
              />
            </svg>
            
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-5xl font-bold text-white">{data.readiness.score}%</div>
              <div className="text-sm text-white/80 mt-1">{data.readiness.status}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Strain Card */}
        <div
          className="relative rounded-3xl p-6 transition-all duration-300"
          style={{
            background: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '2px solid #F97316',
            boxShadow: '0 0 20px rgba(249, 115, 22, 0.4)'
          }}
        >
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
            style={{
              background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(249, 115, 22, 0.4))'
            }}
          >
            <Flame className="h-6 w-6" style={{ color: '#F97316' }} />
          </div>
          
          <h3 className="text-white text-lg font-bold mb-2">Нагрузка</h3>
          <div className="text-white text-3xl font-bold mb-1">{data.strain.value}</div>
          <div className="text-white/70 text-sm">{data.strain.description}</div>
        </div>

        {/* Sleep Card */}
        <div
          className="relative rounded-3xl p-6 transition-all duration-300"
          style={{
            background: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '2px solid #6366F1',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)'
          }}
        >
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 0.4))'
            }}
          >
            <Moon className="h-6 w-6" style={{ color: '#6366F1' }} />
          </div>
          
          <h3 className="text-white text-lg font-bold mb-2">Сон</h3>
          <div className="text-white text-3xl font-bold mb-1">{data.sleep.duration}</div>
          <div className="text-white/70 text-sm">Качество: {data.sleep.quality}%</div>
        </div>

        {/* Body Composition Card */}
        <div
          className="relative rounded-3xl p-6 col-span-2 transition-all duration-300"
          style={{
            background: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '2px solid #10B981',
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)'
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.4))'
                }}
              >
                <Scale className="h-6 w-6" style={{ color: '#10B981' }} />
              </div>
              
              <h3 className="text-white text-lg font-bold mb-2">Состав Тела</h3>
              <div className="text-white text-3xl font-bold mb-1">
                Жир: {data.bodyComposition.fatPercentage}%
              </div>
            </div>
            
            <div 
              className="px-4 py-2 rounded-full"
              style={{
                background: data.bodyComposition.trend.startsWith('-') 
                  ? 'rgba(16, 185, 129, 0.2)'
                  : 'rgba(239, 68, 68, 0.2)',
                border: '1px solid',
                borderColor: data.bodyComposition.trend.startsWith('-') 
                  ? '#10B981'
                  : '#EF4444'
              }}
            >
              <span 
                className="text-sm font-bold"
                style={{
                  color: data.bodyComposition.trend.startsWith('-') ? '#10B981' : '#EF4444'
                }}
              >
                {data.bodyComposition.trend}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
