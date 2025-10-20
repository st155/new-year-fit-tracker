import { useState, useEffect } from "react";
import { ArrowLeft, TrendingUp, TrendingDown, Calendar, Target, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { QuickMeasurementDialog } from "@/components/goals/QuickMeasurementDialog";
import { useQueryClient } from "@tanstack/react-query";

interface GoalData {
  date: string;
  value: number;
  change?: number;
}

interface Goal {
  id: string;
  goal_name: string;
  goal_type: string;
  target_value: number;
  target_unit: string;
}

interface GoalProgressDetailProps {
  goal: Goal;
  onBack: () => void;
}

const GoalProgressDetail = ({ goal, onBack }: GoalProgressDetailProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [goalData, setGoalData] = useState<GoalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentValue, setCurrentValue] = useState<number | null>(null);
  const [weeklyChange, setWeeklyChange] = useState<number | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  useEffect(() => {
    if (user && goal) {
      fetchGoalData();
    }
  }, [user, goal]);

  const fetchGoalData = async () => {
    if (!user || !goal) return;

    try {
      const { data: measurements, error } = await supabase
        .from('measurements')
        .select('value, measurement_date')
        .eq('user_id', user.id)
        .eq('goal_id', goal.id)
        .order('measurement_date', { ascending: true });

      if (error) throw error;

      if (measurements && measurements.length > 0) {
        const formattedData = measurements.map((item, index) => {
          const change = index > 0 ? item.value - measurements[index - 1].value : 0;
          return {
            date: item.measurement_date,
            value: item.value,
            change: index > 0 ? change : undefined
          };
        });

        setGoalData(formattedData);
        setCurrentValue(measurements[measurements.length - 1].value);

        // Вычисляем недельное изменение
        if (measurements.length >= 2) {
          const latest = measurements[measurements.length - 1].value;
          const weekAgo = measurements.length >= 7 ? 
            measurements[measurements.length - 7].value : 
            measurements[0].value;
          setWeeklyChange(latest - weekAgo);
        }
      }
    } catch (error) {
      console.error('Error fetching goal data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (change: number | null) => {
    if (!change) return null;
    return change > 0 ? 
      <TrendingUp className="h-4 w-4 text-success" /> : 
      <TrendingDown className="h-4 w-4 text-destructive" />;
  };

  const formatTooltipDate = (dateStr: string) => {
    return format(new Date(dateStr), 'd MMM yyyy', { locale: ru });
  };

  const getGoalTypeColor = (goalType: string) => {
    const colors = {
      strength: 'bg-primary/10 text-primary border-primary/20',
      cardio: 'bg-accent/10 text-accent border-accent/20',
      endurance: 'bg-success/10 text-success border-success/20',
      body_composition: 'bg-secondary/10 text-secondary-foreground border-secondary/20'
    };
    return colors[goalType as keyof typeof colors] || 'bg-muted text-muted-foreground';
  };

  const getProgressPercentage = () => {
    if (!currentValue || !goal.target_value) return 0;
    return Math.min(100, Math.max(0, (currentValue / goal.target_value) * 100));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загружаем данные прогресса...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок с навигацией */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack} className="shrink-0">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад
          </Button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{goal.goal_name}</h2>
            <Badge className={`mt-2 ${getGoalTypeColor(goal.goal_type)}`}>
              {goal.goal_type === 'strength' ? 'Сила' :
               goal.goal_type === 'cardio' ? 'Кардио' :
               goal.goal_type === 'endurance' ? 'Выносливость' :
               'Состав тела'}
            </Badge>
          </div>
        </div>
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          size="icon"
          className="rounded-full bg-gradient-primary hover:opacity-90 shrink-0"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {/* Ключевые метрики */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {currentValue ? `${currentValue} ${goal.target_unit}` : 'Нет данных'}
            </div>
            <p className="text-xs text-muted-foreground">Текущий результат</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {weeklyChange !== null ? `${weeklyChange > 0 ? '+' : ''}${weeklyChange.toFixed(1)}` : 'N/A'}
              </span>
              {getTrendIcon(weeklyChange)}
            </div>
            <p className="text-xs text-muted-foreground">Изменение за период</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {goal.target_value} {goal.target_unit}
            </div>
            <p className="text-xs text-muted-foreground">Целевое значение</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {getProgressPercentage().toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Прогресс к цели</p>
          </CardContent>
        </Card>
      </div>

      {/* График прогресса */}
      {goalData.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              График прогресса
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={goalData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => format(new Date(date), 'd MMM', { locale: ru })}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(date) => formatTooltipDate(date)}
                    formatter={(value: number) => [`${value} ${goal.target_unit}`, 'Значение']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: "hsl(var(--primary))", strokeWidth: 2 }}
                  />
                  {/* Линия цели */}
                  <Line 
                    type="monotone" 
                    dataKey={() => goal.target_value}
                    stroke="hsl(var(--destructive))" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Цель"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Нет данных для отображения</h3>
              <p className="text-muted-foreground">
                Добавьте измерения, чтобы увидеть график прогресса
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* История изменений */}
      {goalData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>История измерений</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {goalData.slice().reverse().map((entry, index) => (
                <div key={entry.date} className="flex items-center justify-between p-2 border rounded-lg">
                  <div>
                    <p className="font-medium">{entry.value} {goal.target_unit}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(entry.date), 'd MMMM yyyy', { locale: ru })}
                    </p>
                  </div>
                  {entry.change !== undefined && (
                    <div className="flex items-center gap-1">
                      <span className={`text-sm font-medium ${
                        entry.change > 0 ? 'text-success' : entry.change < 0 ? 'text-destructive' : 'text-muted-foreground'
                      }`}>
                        {entry.change > 0 ? '+' : ''}{entry.change.toFixed(1)}
                      </span>
                      {getTrendIcon(entry.change)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Measurement Dialog */}
      <QuickMeasurementDialog
        goal={goal}
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onMeasurementAdded={() => {
          fetchGoalData();
          queryClient.invalidateQueries({ queryKey: ['goals', user?.id] });
        }}
      />
    </div>
  );
};

export default GoalProgressDetail;