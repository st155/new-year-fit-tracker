import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { HabitCard } from "./HabitCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface Habit {
  id: string;
  name: string;
  description: string | null;
  category: string;
  frequency: string;
  target_count: number;
  icon: string | null;
  color: string | null;
  is_active: boolean;
}

interface HabitWithStats extends Habit {
  stats?: {
    current_streak: number;
    total_completions: number;
    completion_rate: number;
  };
  completed_today: boolean;
}

export function HabitsList() {
  const { t } = useTranslation('habits');
  const { user } = useAuth();
  const [habits, setHabits] = useState<HabitWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadHabits();
    }
  }, [user]);

  const loadHabits = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch habits
      const { data: habitsData, error: habitsError } = await supabase
        .from("habits")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (habitsError) throw habitsError;

      // Fetch stats for all habits
      const { data: statsData, error: statsError } = await supabase
        .from("habit_stats")
        .select("*")
        .eq("user_id", user.id);

      if (statsError) throw statsError;

      // Check which habits are completed today
      const today = new Date().toISOString().split("T")[0];
      const { data: completionsData, error: completionsError } = await supabase
        .from("habit_completions")
        .select("habit_id")
        .eq("user_id", user.id)
        .gte("completed_at", `${today}T00:00:00`)
        .lte("completed_at", `${today}T23:59:59`);

      if (completionsError) throw completionsError;

      const completedHabitIds = new Set(completionsData?.map(c => c.habit_id) || []);

      // Combine data
      const habitsWithStats = (habitsData || []).map(habit => ({
        ...habit,
        stats: statsData?.find(s => s.habit_id === habit.id),
        completed_today: completedHabitIds.has(habit.id),
      }));

      setHabits(habitsWithStats);
    } catch (error) {
      console.error("Error loading habits:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleHabitCompleted = () => {
    loadHabits();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (habits.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {t('legacy.noHabits')}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {habits.map(habit => (
        <HabitCard
          key={habit.id}
          habit={habit}
          onCompleted={handleHabitCompleted}
        />
      ))}
    </div>
  );
}
