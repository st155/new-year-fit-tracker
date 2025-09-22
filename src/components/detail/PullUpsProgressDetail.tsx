import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingDown, TrendingUp, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';

interface PullUpsData {
  date: string;
  pullUps: number;
  change?: number;
}

interface PullUpsProgressDetailProps {
  onBack: () => void;
}

export function PullUpsProgressDetail({ onBack }: PullUpsProgressDetailProps) {
  const { user } = useAuth();
  const [pullUpsData, setPullUpsData] = useState<PullUpsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPullUps, setCurrentPullUps] = useState<number | null>(null);
  const [weeklyChange, setWeeklyChange] = useState<number | null>(null);
  const [targetPullUps, setTargetPullUps] = useState<number>(17);

  useEffect(() => {
    if (user) {
      fetchPullUpsData();
    }
  }, [user]);

  const fetchPullUpsData = async () => {
    if (!user) return;

    try {
      const endDate = new Date();
      const startDate = subDays(endDate, 30);

      // Получаем цель по подтягиваниям
      const { data: pullUpGoal } = await supabase
        .from('goals')
        .select('id, target_value')
        .eq('user_id', user.id)
        .ilike('goal_name', '%подтяг%')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pullUpGoal?.target_value) {
        setTargetPullUps(Number(pullUpGoal.target_value));
      }

      if (pullUpGoal) {
        // Получаем измерения подтягиваний
        const { data: measurements } = await supabase
          .from('measurements')
          .select('measurement_date, value')
          .eq('goal_id', pullUpGoal.id)
          .eq('user_id', user.id)
          .gte('measurement_date', startDate.toISOString().split('T')[0])
          .order('measurement_date', { ascending: true });

        if (measurements) {
          const formattedData = measurements.map((item, index, arr) => ({
            date: item.measurement_date,
            pullUps: Number(item.value),
            change: index > 0 ? Number(item.value) - Number(arr[index - 1].value) : 0
          }));

          setPullUpsData(formattedData);
          
          if (formattedData.length > 0) {
            const latest = formattedData[formattedData.length - 1];
            setCurrentPullUps(latest.pullUps);
            
            // Вычисляем недельное изменение
            const weekAgo = formattedData.find(item => {
              const itemDate = new Date(item.date);
              const weekAgoDate = subDays(new Date(), 7);
              return itemDate >= weekAgoDate;
            });
            
            if (weekAgo) {
              setWeeklyChange(latest.pullUps - weekAgo.pullUps);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching pull-ups data:', error);
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

  const getProgressColor = (current: number, target: number) => {
    const progress = current / target;
    if (progress >= 1) return 'text-green-600';
    if (progress >= 0.8) return 'text-yellow-500';
    if (progress >= 0.6) return 'text-orange-500';
    return 'text-red-600';
  };

  const getProgressPercentage = () => {
    if (!currentPullUps || !targetPullUps) return 0;
    return Math.min(100, (currentPullUps / targetPullUps) * 100);
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
            Прогресс подтягиваний
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Текущие показатели */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-primary/10 rounded-lg text-center">
            <div className={`text-2xl font-bold ${currentPullUps ? getProgressColor(currentPullUps, targetPullUps) : 'text-primary'}`}>
              {currentPullUps || '—'}
            </div>
            <div className="text-sm text-muted-foreground">Текущий максимум</div>
          </div>
          
          <div className="p-4 bg-muted/30 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 text-lg font-semibold">
              {weeklyChange !== null ? (
                <>
                  {getTrendIcon(weeklyChange)}
                  {weeklyChange > 0 ? '+' : ''}{weeklyChange}
                </>
              ) : '—'}
            </div>
            <div className="text-sm text-muted-foreground">За неделю</div>
          </div>
          
          <div className="p-4 bg-success/10 rounded-lg text-center">
            <div className="text-lg font-bold text-success">{targetPullUps}</div>
            <div className="text-sm text-muted-foreground">Цель</div>
          </div>

          <div className="p-4 bg-accent/10 rounded-lg text-center">
            <div className="text-lg font-bold text-accent">
              {getProgressPercentage().toFixed(0)}%
            </div>
            <div className="text-sm text-muted-foreground">Прогресс</div>
          </div>
        </div>

        {/* График */}
        {pullUpsData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pullUpsData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatTooltipDate}
                  className="text-xs"
                />
                <YAxis 
                  domain={[0, 'dataMax + 2']}
                  tickFormatter={(value) => value.toString()}
                  className="text-xs"
                />
                <Tooltip 
                  labelFormatter={(value) => formatTooltipDate(value as string)}
                  formatter={(value: number) => [value, 'Подтягивания']}
                />
                <Bar 
                  dataKey="pullUps" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                />
                {/* Линия цели */}
                <Line 
                  type="monotone" 
                  dataKey={() => targetPullUps}
                  stroke="hsl(var(--success))" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Нет данных о подтягиваниях за последние 30 дней</p>
            <p className="text-sm">Добавьте измерения для отслеживания прогресса</p>
          </div>
        )}

        {/* История изменений */}
        <div>
          <h3 className="text-lg font-semibold mb-4">История тренировок</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {pullUpsData.slice(-10).reverse().map((item, index) => (
              <div key={item.date} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                <div>
                  <div className={`font-medium ${getProgressColor(item.pullUps, targetPullUps)}`}>
                    {item.pullUps} подтягиваний
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(item.date), 'd MMMM yyyy', { locale: ru })}
                  </div>
                </div>
                {item.change !== 0 && (
                  <div className="flex items-center gap-1 text-sm">
                    {getTrendIcon(item.change)}
                    <span className={item.change > 0 ? 'text-green-600' : 'text-red-600'}>
                      {item.change > 0 ? '+' : ''}{item.change}
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