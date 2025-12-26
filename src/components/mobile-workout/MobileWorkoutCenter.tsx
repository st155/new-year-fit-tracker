/**
 * MobileWorkoutCenter - "Gym Companion" mobile workout interface
 * One-handed friendly design for gym use
 */

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { startOfWeek, isSameDay } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useWorkoutHistory } from "@/hooks/useWorkoutHistory";
import { useWorkoutStats } from "@/hooks/useWorkoutStats";
import { ManualWorkoutDialog } from "@/components/workout/manual/ManualWorkoutDialog";
import { WeeklyStrip } from "./WeeklyStrip";
import { WorkoutFAB } from "./WorkoutFAB";
import { LastWorkoutCard } from "./LastWorkoutCard";
import { CompactHistoryList } from "./CompactHistoryList";

export function MobileWorkoutCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { workouts, isLoading } = useWorkoutHistory("all");
  const stats = useWorkoutStats("week");

  const [manualDialogOpen, setManualDialogOpen] = useState(false);

  // Get workout dates for current week
  const thisWeekWorkoutDates = useMemo(() => {
    if (!workouts.length) return [];
    
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    return workouts
      .filter(w => w.date >= weekStart)
      .map(w => w.date);
  }, [workouts]);

  // Transform workout data for components
  const transformedWorkouts = useMemo(() => {
    return workouts.map(w => ({
      id: w.id,
      workout_type: w.workoutType || "strength",
      name: w.name,
      date: w.date,
      duration_minutes: w.duration,
      total_volume: w.volume,
      calories: w.calories,
      distance_km: w.distance,
      pr_count: 0, // Not available in WorkoutHistoryItem
    }));
  }, [workouts]);

  const lastWorkout = transformedWorkouts[0] || null;
  const historyWorkouts = transformedWorkouts.slice(1);

  const handleStartWorkout = () => {
    navigate("/workouts/live-logger");
  };

  const handleRepeatWorkout = (workout: typeof lastWorkout) => {
    if (workout) {
      sessionStorage.setItem("repeatWorkout", JSON.stringify(workout));
      navigate("/workouts/live-logger");
    }
  };

  const handleWorkoutClick = (workout: typeof lastWorkout) => {
    if (workout) {
      navigate(`/workouts/${workout.id}`);
    }
  };

  const handleDayClick = (date: Date) => {
    // Could show workouts for that day or navigate to detailed view
    const dayWorkouts = workouts.filter(w => isSameDay(w.date, date));
    if (dayWorkouts.length > 0) {
      navigate(`/workouts/${dayWorkouts[0].id}`);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background pb-40"
    >
      {/* Weekly Strip */}
      <WeeklyStrip
        workoutDates={thisWeekWorkoutDates}
        streak={stats?.data?.streak || 0}
        onDayClick={handleDayClick}
      />

      {/* Last Workout Card */}
      <LastWorkoutCard
        workout={lastWorkout}
        onRepeat={handleRepeatWorkout}
        onClick={handleWorkoutClick}
      />

      {/* Compact History */}
      <CompactHistoryList
        workouts={historyWorkouts}
        maxItems={5}
        onWorkoutClick={handleWorkoutClick}
        onViewAll={() => navigate("/workouts/logbook")}
      />

      {/* FAB */}
      <WorkoutFAB
        onStartWorkout={handleStartWorkout}
        onLogManual={() => setManualDialogOpen(true)}
      />

      {/* Manual Workout Dialog */}
      <ManualWorkoutDialog
        open={manualDialogOpen}
        onOpenChange={setManualDialogOpen}
        onSuccess={() => {}}
      />
    </motion.div>
  );
}
