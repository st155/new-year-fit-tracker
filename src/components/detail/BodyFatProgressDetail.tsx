import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingDown, TrendingUp, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';

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

      // Получаем данные о проценте жира из body_composition
      const { data: bodyData } = await supabase
        .from('body_composition')
        .select('measurement_date, body_fat_percentage')
        .eq('user_id', user.id)
        .gte('measurement_date', startDate.toISOString().split('T')[0])
        .order('measurement_date', { ascending: true });

      if (bodyData) {
        const formattedData = bodyData
          .filter(item => item.body_fat_percentage)
          .map((item, index, arr) => ({
            date: item.measurement_date,
            bodyFat: Number(item.body_fat_percentage),
            change: index > 0 ? Number(item.body_fat_percentage) - Number(arr[index - 1].body_fat_percentage) : 0
          }));

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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack} className="w-fit">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Прогресс процента жира
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Текущие показатели */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-primary/10 rounded-lg text-center">
            <div className={`text-2xl font-bold ${currentBodyFat ? getProgressColor(currentBodyFat, targetBodyFat) : 'text-primary'}`}>
              {currentBodyFat ? `${currentBodyFat.toFixed(1)}%` : '—'}
            </div>
            <div className="text-sm text-muted-foreground">Текущий %</div>
          </div>
          
          <div className="p-4 bg-muted/30 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 text-lg font-semibold">
              {weeklyChange !== null ? (
                <>
                  {getTrendIcon(weeklyChange)}
                  {weeklyChange > 0 ? '+' : ''}{weeklyChange.toFixed(1)}%
                </>
              ) : '—'}
            </div>
            <div className="text-sm text-muted-foreground">За неделю</div>
          </div>
          
          <div className="p-4 bg-success/10 rounded-lg text-center">
            <div className="text-lg font-bold text-success">{targetBodyFat}%</div>
            <div className="text-sm text-muted-foreground">Целевой %</div>
          </div>
        </div>

        {/* График */}
        {bodyFatData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bodyFatData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatTooltipDate}
                  className="text-xs"
                />
                <YAxis 
                  domain={['dataMin - 1', 'dataMax + 1']}
                  tickFormatter={(value) => `${value}%`}
                  className="text-xs"
                />
                <Tooltip 
                  labelFormatter={(value) => formatTooltipDate(value as string)}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Процент жира']}
                />
                <Line 
                  type="monotone" 
                  dataKey="bodyFat" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                />
                {/* Линия цели */}
                <Line 
                  type="monotone" 
                  dataKey={() => targetBodyFat}
                  stroke="hsl(var(--success))" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Нет данных о проценте жира за последние 30 дней</p>
            <p className="text-sm">Добавьте измерения для отслеживания прогресса</p>
          </div>
        )}

        {/* История изменений */}
        <div>
          <h3 className="text-lg font-semibold mb-4">История изменений</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {bodyFatData.slice(-10).reverse().map((item, index) => (
              <div key={item.date} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                <div>
                  <div className={`font-medium ${getProgressColor(item.bodyFat, targetBodyFat)}`}>
                    {item.bodyFat.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(item.date), 'd MMMM yyyy', { locale: ru })}
                  </div>
                </div>
                {item.change !== 0 && (
                  <div className="flex items-center gap-1 text-sm">
                    {getTrendIcon(item.change)}
                    <span className={item.change > 0 ? 'text-red-600' : 'text-green-600'}>
                      {item.change > 0 ? '+' : ''}{item.change.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}