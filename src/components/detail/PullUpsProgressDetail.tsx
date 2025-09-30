import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingDown, TrendingUp, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Chart3D } from '@/components/ui/3d-progress-chart';

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
          <h1 className="text-2xl font-bold text-foreground">Прогресс подтягиваний</h1>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* Current Max */}
        <div 
          className="p-5 rounded-2xl border-2 relative overflow-hidden"
          style={{
            background: "rgba(168, 85, 247, 0.1)",
            borderColor: "#A855F7",
            boxShadow: "0 0 20px rgba(168, 85, 247, 0.3)",
          }}
        >
          <div className="text-sm text-muted-foreground mb-1">Текущий максимум</div>
          <div className="text-4xl font-bold text-[#A855F7]">
            {currentPullUps || '—'}
          </div>
        </div>

        {/* Weekly Change */}
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
                <span className={weeklyChange >= 0 ? 'text-green-500' : 'text-red-500'}>
                  {weeklyChange > 0 ? '+' : ''}{weeklyChange}
                </span>
              </>
            ) : '—'}
          </div>
        </div>

        {/* Target */}
        <div 
          className="p-5 rounded-2xl border-2"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            borderColor: "rgba(255, 255, 255, 0.1)",
          }}
        >
          <div className="text-sm text-muted-foreground mb-1">Цель</div>
          <div className="text-3xl font-bold text-foreground">{targetPullUps}</div>
        </div>

        {/* Progress */}
        <div 
          className="p-5 rounded-2xl border-2"
          style={{
            background: "rgba(255, 107, 44, 0.1)",
            borderColor: "#FF6B2C",
            boxShadow: "0 0 20px rgba(255, 107, 44, 0.3)",
          }}
        >
          <div className="text-sm text-muted-foreground mb-1">Прогресс</div>
          <div className="text-3xl font-bold text-[#FF6B2C]">
            {getProgressPercentage().toFixed(0)}%
          </div>
        </div>
      </div>

      {/* 3D Chart */}
      {pullUpsData.length > 0 ? (
        <div className="mb-6">
          <Chart3D
            data={pullUpsData.map(d => ({
              date: d.date,
              value: d.pullUps,
              change: d.change
            }))}
            color="#06B6D4"
            targetValue={targetPullUps}
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
          <p className="text-muted-foreground">Нет данных о подтягиваниях</p>
          <p className="text-sm text-muted-foreground">Добавьте измерения для отслеживания прогресса</p>
        </div>
      )}

      {/* History */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-foreground">История тренировок</h3>
        <div className="space-y-2">
          {pullUpsData.slice(-10).reverse().map((item) => (
            <div 
              key={item.date} 
              className="flex items-center justify-between p-4 rounded-xl border"
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                borderColor: "rgba(255, 255, 255, 0.1)",
              }}
            >
              <div>
                <div className="font-semibold text-foreground text-lg">
                  {item.pullUps} подтягиваний
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(item.date), 'd MMMM yyyy', { locale: ru })}
                </div>
              </div>
              {item.change !== 0 && (
                <div 
                  className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold"
                  style={{
                    background: item.change > 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: item.change > 0 ? '#22C55E' : '#EF4444'
                  }}
                >
                  {getTrendIcon(item.change)}
                  <span>
                    {item.change > 0 ? '+' : ''}{item.change}
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