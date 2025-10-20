import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingDown, TrendingUp, Target, Plus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { QuickMeasurementDialog } from '@/components/goals/QuickMeasurementDialog';
import { useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();
  const [pullUpsData, setPullUpsData] = useState<PullUpsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPullUps, setCurrentPullUps] = useState<number | null>(null);
  const [weeklyChange, setWeeklyChange] = useState<number | null>(null);
  const [targetPullUps, setTargetPullUps] = useState<number>(17);
  const [pullUpGoal, setPullUpGoal] = useState<any>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

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
      const { data: pullUpGoalData } = await supabase
        .from('goals')
        .select('id, goal_name, goal_type, target_value, target_unit')
        .eq('user_id', user.id)
        .ilike('goal_name', '%подтяг%')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pullUpGoalData) {
        setPullUpGoal(pullUpGoalData);
        if (pullUpGoalData.target_value) {
          setTargetPullUps(Number(pullUpGoalData.target_value));
        }
      }

      if (pullUpGoalData) {
        // Получаем измерения подтягиваний
        const { data: measurements } = await supabase
          .from('measurements')
          .select('measurement_date, value')
          .eq('goal_id', pullUpGoalData.id)
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
    <div className="h-full pb-6 px-4 pt-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
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
        {pullUpGoal && (
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            size="icon"
            className="rounded-full bg-gradient-primary hover:opacity-90 shrink-0"
          >
            <Plus className="w-5 h-5" />
          </Button>
        )}
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

      {/* Chart */}
      {pullUpsData.length > 0 ? (
        <div 
          className="p-4 rounded-2xl border-2 mb-6"
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            borderColor: "rgba(255, 255, 255, 0.1)",
          }}
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pullUpsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="pullupGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06B6D4" stopOpacity={1} />
                    <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="rgba(255, 255, 255, 0.1)" 
                  vertical={false}
                />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatTooltipDate}
                  stroke="rgba(255, 255, 255, 0.3)"
                  tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                />
                <YAxis 
                  domain={[0, Math.max(targetPullUps + 2, Math.max(...pullUpsData.map(d => d.pullUps)) + 2)]}
                  stroke="rgba(255, 255, 255, 0.3)"
                  tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                />
                <Tooltip 
                  contentStyle={{
                    background: 'rgba(0, 0, 0, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '8px 12px'
                  }}
                  labelStyle={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }}
                  itemStyle={{ color: '#06B6D4', fontSize: 14, fontWeight: 'bold' }}
                  labelFormatter={(value) => formatTooltipDate(value as string)}
                  formatter={(value: number) => [value, 'Подтягивания']}
                />
                <Bar 
                  dataKey="pullUps" 
                  fill="url(#pullupGradient)"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={40}
                />
                <Line 
                  type="monotone" 
                  dataKey={() => targetPullUps}
                  stroke="#FF6B2C" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
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

      {/* Quick Measurement Dialog */}
      {pullUpGoal && (
      <QuickMeasurementDialog
        goal={pullUpGoal}
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onMeasurementAdded={() => {
          fetchPullUpsData();
          queryClient.invalidateQueries({ queryKey: ['goals', user?.id] });
        }}
      />
      )}
    </div>
  );
}