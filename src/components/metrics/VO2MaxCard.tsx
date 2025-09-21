import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';

interface VO2MaxData {
  value: number;
  measurement_date: string;
  source: string;
}

interface VO2MaxCardProps {
  selectedDate?: Date;
  showTrend?: boolean;
}

export function VO2MaxCard({ selectedDate = new Date(), showTrend = true }: VO2MaxCardProps) {
  const { user } = useAuth();
  const [vo2MaxData, setVO2MaxData] = useState<VO2MaxData | null>(null);
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchVO2MaxData();
    }
  }, [user, selectedDate]);

  const fetchVO2MaxData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const today = format(selectedDate, 'yyyy-MM-dd');
      
      // Получаем VO2Max данные за выбранную дату
      const { data: todayData } = await supabase
        .from('metric_values')
        .select(`
          value,
          measurement_date,
          user_metrics!inner (
            metric_name,
            source
          )
        `)
        .eq('user_id', user.id)
        .eq('measurement_date', today)
        .eq('user_metrics.metric_name', 'VO2 Max')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (todayData) {
        setVO2MaxData({
          value: todayData.value,
          measurement_date: todayData.measurement_date,
          source: todayData.user_metrics.source
        });
      }

      // Получаем предыдущее значение для тренда
      if (showTrend) {
        const { data: previousData } = await supabase
          .from('metric_values')
          .select(`
            value,
            user_metrics!inner (
              metric_name
            )
          `)
          .eq('user_id', user.id)
          .eq('user_metrics.metric_name', 'VO2 Max')
          .lt('measurement_date', today)
          .order('measurement_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (previousData) {
          setPreviousValue(previousData.value);
        }
      }

    } catch (error) {
      console.error('Error fetching VO2Max data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getVO2MaxCategory = (value: number) => {
    // Стандартные категории VO2Max для взрослых
    if (value >= 55) return { label: 'Превосходно', color: 'text-green-500' };
    if (value >= 45) return { label: 'Отлично', color: 'text-green-400' };
    if (value >= 35) return { label: 'Хорошо', color: 'text-yellow-500' };
    if (value >= 25) return { label: 'Удовлетворительно', color: 'text-orange-500' };
    return { label: 'Плохо', color: 'text-red-500' };
  };

  const getTrendPercentage = () => {
    if (!vo2MaxData || !previousValue) return null;
    return ((vo2MaxData.value - previousValue) / previousValue * 100);
  };

  const getProgressValue = (value: number) => {
    // Конвертируем VO2Max в процент (максимум 70 мл/кг/мин)
    return Math.min(100, (value / 70) * 100);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-500" />
            VO2 Max
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded mb-2"></div>
            <div className="h-2 bg-muted rounded mb-2"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!vo2MaxData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-500" />
            VO2 Max
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <span className="text-2xl text-muted-foreground">—</span>
            <p className="text-xs text-muted-foreground mt-2">
              Нет данных за выбранную дату
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const category = getVO2MaxCategory(vo2MaxData.value);
  const trendPercentage = getTrendPercentage();

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-500" />
            VO2 Max
          </CardTitle>
          {vo2MaxData.source === 'whoop' && (
            <Badge variant="secondary" className="text-xs">
              Whoop
            </Badge>
          )}
          {vo2MaxData.source === 'apple_health' && (
            <Badge variant="secondary" className="text-xs">
              🍎 Apple Health
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{vo2MaxData.value.toFixed(1)}</span>
            <span className="text-sm text-muted-foreground">мл/кг/мин</span>
            {showTrend && trendPercentage !== null && (
              <div className="flex items-center gap-1 text-xs">
                {trendPercentage > 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span className={trendPercentage > 0 ? 'text-green-500' : 'text-red-500'}>
                  {Math.abs(trendPercentage).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          
          <Progress 
            value={getProgressValue(vo2MaxData.value)} 
            className="h-2" 
          />
          
          <div className="flex justify-between items-center">
            <p className={`text-xs font-medium ${category.color}`}>
              {category.label}
            </p>
            <p className="text-xs text-muted-foreground">
              Цель: 50+ мл/кг/мин
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}