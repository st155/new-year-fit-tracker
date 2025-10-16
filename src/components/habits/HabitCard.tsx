import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check, Flame, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { DurationCounter } from "./DurationCounter";
import { NumericCounter } from "./NumericCounter";
import { DailyMeasurement } from "./DailyMeasurement";

interface HabitCardProps {
  habit: {
    id: string;
    name: string;
    description: string | null;
    category: string;
    color: string | null;
    habit_type?: string;
    icon?: string;
    start_date?: string;
    target_value?: number;
    measurement_unit?: string;
    custom_settings?: any;
    stats?: {
      current_streak: number;
      total_completions: number;
      completion_rate: number;
    };
    completed_today: boolean;
  };
  onCompleted: () => void;
}

export function HabitCard({ habit, onCompleted }: HabitCardProps) {
  const { user } = useAuth();

  // Route to custom habit cards based on type
  if (habit.habit_type === "duration_counter") {
    return <DurationCounter habit={habit} userId={user?.id} />;
  }

  if (habit.habit_type === "numeric_counter") {
    return <NumericCounter habit={habit} userId={user?.id} />;
  }

  if (habit.habit_type === "daily_measurement") {
    return <DailyMeasurement habit={habit} userId={user?.id} />;
  }

  // Default: daily_check habit card
  const [isCompleting, setIsCompleting] = useState(false);

  const handleComplete = async () => {
    if (!user || habit.completed_today) return;

    setIsCompleting(true);
    try {
      const { error } = await supabase.from("habit_completions").insert({
        habit_id: habit.id,
        user_id: user.id,
        completed_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success("Привычка выполнена! 🎉");
      onCompleted();
    } catch (error) {
      console.error("Error completing habit:", error);
      toast.error("Ошибка при отметке привычки");
    } finally {
      setIsCompleting(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      fitness: "bg-blue-500",
      nutrition: "bg-green-500",
      sleep: "bg-purple-500",
      mindfulness: "bg-yellow-500",
      custom: "bg-gray-500",
    };
    return colors[category] || colors.custom;
  };

  return (
    <Card className={habit.completed_today ? "border-green-500" : ""}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div
                className={`w-3 h-3 rounded-full ${habit.color || getCategoryColor(habit.category)}`}
              />
              <h3 className="font-semibold text-lg">{habit.name}</h3>
            </div>
            {habit.description && (
              <p className="text-sm text-muted-foreground">{habit.description}</p>
            )}
          </div>
          <Button
            size="sm"
            variant={habit.completed_today ? "outline" : "default"}
            onClick={handleComplete}
            disabled={isCompleting || habit.completed_today}
            className="ml-4"
          >
            {habit.completed_today ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Готово
              </>
            ) : (
              "Отметить"
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {habit.stats && (
            <>
              <div className="flex items-center gap-4">
                {habit.stats.current_streak > 0 && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Flame className="h-3 w-3 text-orange-500" />
                    {habit.stats.current_streak} дней подряд
                  </Badge>
                )}
                <Badge variant="outline" className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {habit.stats.total_completions} выполнений
                </Badge>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Процент выполнения</span>
                  <span className="font-medium">{Math.round(habit.stats.completion_rate)}%</span>
                </div>
                <Progress value={habit.stats.completion_rate} className="h-2" />
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
