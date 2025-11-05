import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check, Flame } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis, CartesianGrid, XAxis } from "recharts";
import { format, subDays, startOfWeek } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useHabitProgress } from "@/hooks/useHabitProgress";
import { HabitEditDialog } from "./HabitEditDialog";
import { HabitCelebration } from "./HabitCelebration";
import { HabitOptionsMenu } from "./HabitOptionsMenu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getHabitSentiment,
  getHabitIcon,
  getHabitNeonColor,
} from "@/lib/habit-utils";
import { cn } from "@/lib/utils";

interface EnhancedHabitCardProps {
  habit: {
    id: string;
    name: string;
    description: string | null;
    category: string;
    color: string | null;
    habit_type?: string;
    icon?: string;
    user_id?: string;
    stats?: {
      current_streak: number;
      total_completions: number;
      completion_rate: number;
    };
    completed_today: boolean;
  };
  onCompleted: () => void;
}

const habitThemes = {
  health: { color: 'hsl(var(--habit-positive))', gradient: 'from-habit-positive/20 to-success/5' },
  fitness: { color: 'hsl(var(--habit-negative))', gradient: 'from-habit-negative/20 to-secondary/5' },
  nutrition: { color: 'hsl(var(--habit-neutral))', gradient: 'from-habit-neutral/20 to-primary/5' },
  custom: { color: 'hsl(var(--primary))', gradient: 'from-primary/20 to-primary/5' },
};

export function EnhancedHabitCard({ habit, onCompleted }: EnhancedHabitCardProps) {
  const navigate = useNavigate();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [milestoneType, setMilestoneType] = useState<'completion' | 'milestone' | 'streak'>('completion');
  const [isCompleting, setIsCompleting] = useState(false);

  const sentiment = getHabitSentiment(habit);
  const IconComponent = getHabitIcon(habit);
  const theme = habitThemes[habit.category as keyof typeof habitThemes] || habitThemes.custom;

  // Fetch last 30 days for chart
  const last30Days = useMemo(() => {
    const end = new Date();
    const start = subDays(end, 30);
    return { start, end };
  }, []);

  const { data: progressData } = useHabitProgress(habit.id, last30Days);

  // Prepare chart data (group by weeks for completion rate)
  const chartData = useMemo(() => {
    if (!progressData || progressData.length === 0) return [];

    const weeklyData: Record<string, { completed: number; total: number }> = {};

    progressData.forEach(d => {
      const weekStart = format(startOfWeek(new Date(d.date)), 'yyyy-MM-dd');
      if (!weeklyData[weekStart]) {
        weeklyData[weekStart] = { completed: 0, total: 0 };
      }
      weeklyData[weekStart].total++;
      if (d.completed) weeklyData[weekStart].completed++;
    });

    return Object.entries(weeklyData).map(([date, data]) => ({
      date,
      completionRate: (data.completed / data.total) * 100,
      formattedDate: format(new Date(date), 'dd MMM', { locale: ru })
    }));
  }, [progressData]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return { min: 0, avg: 0, max: 0 };
    }

    const rates = chartData.map(d => d.completionRate);
    return {
      min: Math.round(Math.min(...rates)),
      max: Math.round(Math.max(...rates)),
      avg: Math.round(rates.reduce((a, b) => a + b, 0) / rates.length),
    };
  }, [chartData]);

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (habit.completed_today) return;

    setIsCompleting(true);
    try {
      const { error } = await supabase.from("habit_completions").insert({
        habit_id: habit.id,
        user_id: habit.user_id,
        completed_at: new Date().toISOString(),
      });

      if (error) throw error;

      const newStreak = (habit.stats?.current_streak || 0) + 1;
      const milestones = [7, 30, 100, 365];
      const achievedMilestone = milestones.find(m => newStreak === m);

      if (achievedMilestone) {
        setMilestoneType('milestone');
        setCelebrate(true);
        setTimeout(() => setCelebrate(false), 100);

        const messages = {
          7: "Отличное начало! 7 дней подряд! 🎉",
          30: "Целый месяц! Вы молодец! 🎊",
          100: "Невероятно! 100 дней подряд! 🏆",
          365: "ГОД БЕЗ ПРОПУСКОВ! ЛЕГЕНДА! 🌟"
        };

        toast.success(messages[achievedMilestone as keyof typeof messages]);
      } else if (newStreak > 1 && newStreak % 5 === 0) {
        setMilestoneType('streak');
        setCelebrate(true);
        setTimeout(() => setCelebrate(false), 100);
        toast.success(`${newStreak} дней подряд! 🔥`);
      } else {
        setMilestoneType('completion');
        setCelebrate(true);
        setTimeout(() => setCelebrate(false), 100);
        toast.success("Привычка выполнена! 🎉");
      }

      onCompleted();
    } catch (error) {
      console.error("Error completing habit:", error);
      toast.error("Ошибка при отметке привычки");
    } finally {
      setIsCompleting(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("habits")
        .update({ is_active: false })
        .eq("id", habit.id);

      if (error) throw error;

      toast.success("Привычка архивирована");
      onCompleted?.();
    } catch (error) {
      console.error("Error archiving habit:", error);
      toast.error("Ошибка при архивировании");
    }
  };

  return (
    <>
      <HabitCelebration trigger={celebrate} type={milestoneType} />

      <div
        className={cn(
          "inbody-card neon-border overflow-hidden hover:shadow-lg transition-all group relative",
          "cursor-pointer p-5 space-y-3"
        )}
        onClick={() => navigate(`/habits/${habit.id}`)}
      >
        <div className={`h-1 absolute top-0 left-0 right-0 bg-gradient-to-r ${theme.gradient} pulse-glow`} />

        {/* Header */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <IconComponent className="h-5 w-5 flex-shrink-0" style={{ color: theme.color }} />
            <h3 className="font-semibold text-lg truncate">{habit.name}</h3>
          </div>

          <HabitOptionsMenu
            onEdit={() => setShowEditDialog(true)}
            onDelete={() => setShowDeleteDialog(true)}
          />
        </div>

        {/* Category Badge */}
        <div className="flex gap-2">
          <Badge variant="outline" className="text-xs capitalize">
            {habit.category === 'health' ? 'Здоровье' :
             habit.category === 'fitness' ? 'Фитнес' :
             habit.category === 'nutrition' ? 'Питание' :
             'Прочее'}
          </Badge>
        </div>

        {/* Main Value */}
        {habit.stats && (
          <div>
            <div className="text-3xl font-bold" style={{ color: theme.color }}>
              {Math.round(habit.stats.completion_rate)}%
            </div>
            <div className="text-sm text-muted-foreground">
              {habit.stats.total_completions} выполнений
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {habit.stats && (
          <div>
            <Progress
              value={habit.stats.completion_rate}
              autoColor={true}
              className="h-2"
            />
            <div className="text-xs text-muted-foreground mt-1">
              {habit.stats.completion_rate.toFixed(0)}% выполнено
            </div>
          </div>
        )}

        {/* Line Chart */}
        {chartData.length > 1 && (
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="formattedDate" tick={false} axisLine={false} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload[0]) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded px-2 py-1 text-xs shadow-lg">
                          <div className="font-medium">{data.formattedDate}</div>
                          <div className="text-muted-foreground">
                            {Math.round(payload[0].value as number)}% выполнено
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="completionRate"
                  stroke={theme.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Statistics */}
        {chartData.length > 0 && (
          <div className="grid grid-cols-4 gap-2 text-xs pt-3 border-t border-border/50">
            <div>
              <div className="text-muted-foreground mb-0.5">Мин</div>
              <div className="font-semibold">{stats.min}%</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-0.5">Средн</div>
              <div className="font-semibold">{stats.avg}%</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-0.5">Макс</div>
              <div className="font-semibold">{stats.max}%</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-0.5">Streak</div>
              <div className="font-semibold flex items-center gap-1">
                <Flame className="h-3 w-3 text-habit-negative" />
                {habit.stats?.current_streak || 0}
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button
          onClick={handleComplete}
          disabled={isCompleting || habit.completed_today}
          className={cn(
            "w-full mt-2",
            habit.completed_today
              ? "bg-success/20 border-success/50 text-success hover:bg-success/30"
              : "glass-strong"
          )}
          variant={habit.completed_today ? "outline" : "default"}
        >
          {habit.completed_today ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Готово
            </>
          ) : (
            "Отметить выполненной"
          )}
        </Button>
      </div>

      <HabitEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        habit={habit}
        onSuccess={onCompleted}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="glass-strong border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle>Архивировать привычку?</AlertDialogTitle>
            <AlertDialogDescription>
              Привычка "{habit.name}" будет перемещена в архив. Вы сможете восстановить её позже.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="glass-card border-white/20">
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Архивировать
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
