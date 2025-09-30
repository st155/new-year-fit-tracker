import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingDown, TrendingUp, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Chart3D } from '@/components/ui/3d-progress-chart';
interface BodyFatData {
  date: string;
  bodyFat: number;
  change?: number;
}

interface BodyFatProgressDetailProps {
  onBack: () => void;
}

export function BodyFatProgressDetail({ onBack }: BodyFatProgressDetailProps) {
  const { user } = useAuth();
  const [bodyFatData, setBodyFatData] = useState<BodyFatData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentBodyFat, setCurrentBodyFat] = useState<number | null>(null);
  const [weeklyChange, setWeeklyChange] = useState<number | null>(null);
  const [targetBodyFat, setTargetBodyFat] = useState<number>(11);

  useEffect(() => {
    if (user) {
      fetchBodyFatData();
    }
  }, [user]);

  const fetchBodyFatData = async () => {
    if (!user) return;

    try {
      const endDate = new Date();
      const startDate = subDays(endDate, 30);

      // Получаем цель по жиру
      const { data: bodyFatGoal } = await supabase
        .from('goals')
        .select('target_value')
        .eq('user_id', user.id)
        .ilike('goal_name', '%жир%')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (bodyFatGoal?.target_value) {
        setTargetBodyFat(Number(bodyFatGoal.target_value));
      }

      // Сначала получаем данные из Withings (metric_values)
      const { data: withingsBodyFat } = await supabase
        .from('metric_values')
        .select(`
          value,
          measurement_date,
          user_metrics!inner(metric_name, unit, source)
        `)
        .eq('user_id', user.id)
        .eq('user_metrics.metric_name', 'Процент жира')
        .eq('user_metrics.source', 'withings')
        .gte('measurement_date', startDate.toISOString().split('T')[0])
        .order('measurement_date', { ascending: true });

      // Fallback к данным из body_composition если нет Withings данных
      const { data: bodyData } = await supabase
        .from('body_composition')
        .select('measurement_date, body_fat_percentage')
        .eq('user_id', user.id)
        .gte('measurement_date', startDate.toISOString().split('T')[0])
        .order('measurement_date', { ascending: true });

      // Используем данные Withings если есть, иначе body_composition
      let formattedData: BodyFatData[] = [];
      
      if (withingsBodyFat && withingsBodyFat.length > 0) {
        formattedData = withingsBodyFat
          .map((item, index, arr) => ({
            date: item.measurement_date,
            bodyFat: Number(item.value),
            change: index > 0 ? Number(item.value) - Number(arr[index - 1].value) : 0
          }));
      } else if (bodyData) {
        formattedData = bodyData
          .filter(item => item.body_fat_percentage)
          .map((item, index, arr) => ({
            date: item.measurement_date,
            bodyFat: Number(item.body_fat_percentage),
            change: index > 0 ? Number(item.body_fat_percentage) - Number(arr[index - 1].body_fat_percentage) : 0
          }));
      }

      setBodyFatData(formattedData);
      
      if (formattedData.length > 0) {
        const latest = formattedData[formattedData.length - 1];
        setCurrentBodyFat(latest.bodyFat);
        
        // Вычисляем недельное изменение
        const weekAgo = formattedData.find(item => {
          const itemDate = new Date(item.date);
          const weekAgoDate = subDays(new Date(), 7);
          return itemDate >= weekAgoDate;
        });
        
        if (weekAgo) {
          setWeeklyChange(latest.bodyFat - weekAgo.bodyFat);
        }
      }
    } catch (error) {
      console.error('Error fetching body fat data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (change: number | null) => {
    if (!change) return null;
    return change > 0 ? 
      <TrendingUp className="w-4 h-4 text-red-500" /> : 
      <TrendingDown className="w-4 h-4 text-green-500" />;
  };

  const formatTooltipDate = (dateStr: string) => {
    return format(new Date(dateStr), 'd MMM', { locale: ru });
  };

  const getProgressColor = (current: number, target: number) => {
    const progress = Math.max(0, (current - target) / current);
    if (progress > 0.8) return 'text-red-600';
    if (progress > 0.5) return 'text-orange-500';
    if (progress > 0.2) return 'text-yellow-500';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Button variant="ghost" onClick={onBack} className="w-fit">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen pb-24 px-4 pt-4 overflow-y-auto bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onBack}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Прогресс процента жира</h1>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div 
          className="p-5 rounded-2xl border-2 relative overflow-hidden"
          style={{
            background: "rgba(255, 107, 44, 0.1)",
            borderColor: "#FF6B2C",
            boxShadow: "0 0 20px rgba(255, 107, 44, 0.3)",
          }}
        >
          <div className="text-sm text-muted-foreground mb-1">Текущий %</div>
          <div className={`text-4xl font-bold ${currentBodyFat ? getProgressColor(currentBodyFat, targetBodyFat) : 'text-[#FF6B2C]'}`}>
            {currentBodyFat ? `${currentBodyFat.toFixed(1)}` : '—'}
          </div>
          {currentBodyFat && <div className="text-sm text-muted-foreground">%</div>}
        </div>

        <div 
          className="p-5 rounded-2xl border-2"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            borderColor: "rgba(255, 255, 255, 0.1)",
          }}
        >
          <div className="text-sm text-muted-foreground mb-1">За неделю</div>
          <div className="flex items-center gap-2 text-2xl font-bold">
            {weeklyChange !== null ? (
              <>
                {getTrendIcon(weeklyChange)}
                <span className={weeklyChange <= 0 ? 'text-green-500' : 'text-red-500'}>
                  {weeklyChange > 0 ? '+' : ''}{weeklyChange.toFixed(1)}
                </span>
              </>
            ) : '—'}
          </div>
        </div>

        <div 
          className="p-5 rounded-2xl border-2 col-span-2"
          style={{
            background: "rgba(34, 197, 94, 0.1)",
            borderColor: "#22C55E",
            boxShadow: "0 0 20px rgba(34, 197, 94, 0.3)",
          }}
        >
          <div className="text-sm text-muted-foreground mb-1">Целевой %</div>
          <div className="text-3xl font-bold text-[#22C55E]">{targetBodyFat}%</div>
        </div>
      </div>

      {/* 3D Chart */}
      {bodyFatData.length > 0 ? (
        <div className="mb-6">
          <Chart3D
            data={bodyFatData.map(d => ({
              date: d.date,
              value: d.bodyFat,
              change: d.change
            }))}
            color="#FF6B2C"
            targetValue={targetBodyFat}
            height="400px"
          />
        </div>
      ) : (
        <div 
          className="text-center py-12 rounded-2xl border-2 mb-6"
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            borderColor: "rgba(255, 255, 255, 0.1)",
          }}
        >
          <Target className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-muted-foreground">Нет данных о проценте жира</p>
          <p className="text-sm text-muted-foreground">Добавьте измерения для отслеживания прогресса</p>
        </div>
      )}

      {/* History */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-foreground">История изменений</h3>
        <div className="space-y-2">
          {bodyFatData.slice(-10).reverse().map((item) => (
            <div 
              key={item.date} 
              className="flex items-center justify-between p-4 rounded-xl border"
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                borderColor: "rgba(255, 255, 255, 0.1)",
              }}
            >
              <div>
                <div className={`font-semibold text-lg ${getProgressColor(item.bodyFat, targetBodyFat)}`}>
                  {item.bodyFat.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(item.date), 'd MMMM yyyy', { locale: ru })}
                </div>
              </div>
              {item.change !== 0 && (
                <div 
                  className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold"
                  style={{
                    background: item.change <= 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: item.change <= 0 ? '#22C55E' : '#EF4444'
                  }}
                >
                  {getTrendIcon(item.change)}
                  <span>
                    {item.change > 0 ? '+' : ''}{item.change.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}