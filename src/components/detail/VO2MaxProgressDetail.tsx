import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingDown, TrendingUp, Heart } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';

interface VO2MaxData {
  date: string;
  vo2max: number;
  change?: number;
}

interface VO2MaxProgressDetailProps {
  onBack: () => void;
}

export function VO2MaxProgressDetail({ onBack }: VO2MaxProgressDetailProps) {
  const { user } = useAuth();
  const [vo2maxData, setVO2MaxData] = useState<VO2MaxData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentVO2Max, setCurrentVO2Max] = useState<number | null>(null);
  const [weeklyChange, setWeeklyChange] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      fetchVO2MaxData();
    }
  }, [user]);

  const fetchVO2MaxData = async () => {
    if (!user) return;

    try {
      const endDate = new Date();
      const startDate = subDays(endDate, 90); // Последние 90 дней для VO2Max

      // Получаем данные VO2Max из metric_values
      const { data: vo2maxMetrics } = await supabase
        .from('metric_values')
        .select(`
          value,
          measurement_date,
          user_metrics!inner(metric_name, unit, source)
        `)
        .eq('user_id', user.id)
        .or('user_metrics.metric_name.ilike.%vo2%,user_metrics.metric_name.ilike.%кардио%,user_metrics.metric_name.ilike.%cardiovascular%')
        .gte('measurement_date', startDate.toISOString().split('T')[0])
        .order('measurement_date', { ascending: true });

      let formattedData: VO2MaxData[] = [];
      
      if (vo2maxMetrics && vo2maxMetrics.length > 0) {
        formattedData = vo2maxMetrics
          .map((item, index, arr) => ({
            date: item.measurement_date,
            vo2max: Number(item.value),
            change: index > 0 ? Number(item.value) - Number(arr[index - 1].value) : 0
          }));
      }

      setVO2MaxData(formattedData);
      
      if (formattedData.length > 0) {
        const latest = formattedData[formattedData.length - 1];
        setCurrentVO2Max(latest.vo2max);
        
        // Вычисляем недельное изменение
        const weekAgo = formattedData.find(item => {
          const itemDate = new Date(item.date);
          const weekAgoDate = subDays(new Date(), 7);
          return itemDate >= weekAgoDate;
        });
        
        if (weekAgo) {
          setWeeklyChange(latest.vo2max - weekAgo.vo2max);
        }
      }
    } catch (error) {
      console.error('Error fetching VO2Max data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (change: number | null) => {
    if (!change) return null;
    return change > 0 ? 
      <TrendingUp className="w-4 h-4 text-green-500" /> : 
      <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  const formatTooltipDate = (dateStr: string) => {
    return format(new Date(dateStr), 'd MMM', { locale: ru });
  };

  const getVO2MaxCategory = (value: number) => {
    // Примерная классификация VO2Max для взрослых
    if (value >= 60) return { label: 'Превосходный', color: 'text-green-600' };
    if (value >= 50) return { label: 'Отличный', color: 'text-green-500' };
    if (value >= 40) return { label: 'Хороший', color: 'text-blue-500' };
    if (value >= 30) return { label: 'Удовлетворительный', color: 'text-yellow-500' };
    return { label: 'Требует улучшения', color: 'text-red-500' };
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack} className="w-fit">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            Прогресс VO2Max
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Текущие показатели */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {currentVO2Max ? `${currentVO2Max.toFixed(1)}` : '—'}
              {currentVO2Max && <span className="text-sm ml-1">мл/кг/мин</span>}
            </div>
            <div className="text-sm text-muted-foreground">Текущий VO2Max</div>
            {currentVO2Max && (
              <div className={`text-xs mt-1 ${getVO2MaxCategory(currentVO2Max).color}`}>
                {getVO2MaxCategory(currentVO2Max).label}
              </div>
            )}
          </div>
          
          <div className="p-4 bg-muted/30 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 text-lg font-semibold">
              {weeklyChange !== null ? (
                <>
                  {getTrendIcon(weeklyChange)}
                  {weeklyChange > 0 ? '+' : ''}{weeklyChange.toFixed(1)}
                </>
              ) : '—'}
            </div>
            <div className="text-sm text-muted-foreground">За неделю</div>
          </div>
          
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {vo2maxData.length}
            </div>
            <div className="text-sm text-muted-foreground">Измерений</div>
          </div>
        </div>

        {/* График */}
        {vo2maxData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={vo2maxData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatTooltipDate}
                  className="text-xs"
                />
                <YAxis 
                  domain={['dataMin - 2', 'dataMax + 2']}
                  tickFormatter={(value) => `${value}`}
                  className="text-xs"
                />
                <Tooltip 
                  labelFormatter={(value) => formatTooltipDate(value as string)}
                  formatter={(value: number) => [`${value.toFixed(1)} мл/кг/мин`, 'VO2Max']}
                />
                <Line 
                  type="monotone" 
                  dataKey="vo2max" 
                  stroke="#ef4444" 
                  strokeWidth={3}
                  dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Нет данных VO2Max</p>
            <p className="text-sm">Загрузите скриншоты из Whoop для отслеживания прогресса</p>
          </div>
        )}

        {/* История изменений */}
        <div>
          <h3 className="text-lg font-semibold mb-4">История измерений</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {vo2maxData.slice(-10).reverse().map((item, index) => (
              <div key={item.date} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                <div>
                  <div className="font-medium">{item.vo2max.toFixed(1)} мл/кг/мин</div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(item.date), 'd MMMM yyyy', { locale: ru })}
                  </div>
                  <div className={`text-xs ${getVO2MaxCategory(item.vo2max).color}`}>
                    {getVO2MaxCategory(item.vo2max).label}
                  </div>
                </div>
                {item.change !== 0 && (
                  <div className="flex items-center gap-1 text-sm">
                    {getTrendIcon(item.change)}
                    <span className={item.change > 0 ? 'text-green-600' : 'text-red-600'}>
                      {item.change > 0 ? '+' : ''}{item.change.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Информация о VO2Max */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            📊 Что такое VO2Max?
          </h4>
          <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
            <p>
              VO2Max — максимальное потребление кислорода, ключевой показатель сердечно-сосудистой выносливости.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <strong>Превосходный:</strong> 60+ мл/кг/мин
              </div>
              <div>
                <strong>Отличный:</strong> 50-59 мл/кг/мин
              </div>
              <div>
                <strong>Хороший:</strong> 40-49 мл/кг/мин
              </div>
              <div>
                <strong>Удовлетв.:</strong> 30-39 мл/кг/мин
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}