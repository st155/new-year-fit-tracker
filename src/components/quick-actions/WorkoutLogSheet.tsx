/**
 * WorkoutLogSheet - Quick workout type selection
 */

import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Dumbbell, Timer, Bike, PersonStanding, Waves, Mountain } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { cn } from "@/lib/utils";

interface WorkoutLogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const workoutTypes = [
  { id: "strength", icon: Dumbbell, label: "Strength", color: "bg-blue-500" },
  { id: "cardio", icon: Timer, label: "Cardio", color: "bg-red-500" },
  { id: "cycling", icon: Bike, label: "Cycling", color: "bg-amber-500" },
  { id: "yoga", icon: PersonStanding, label: "Yoga", color: "bg-purple-500" },
  { id: "swimming", icon: Waves, label: "Swimming", color: "bg-cyan-500" },
  { id: "hiking", icon: Mountain, label: "Hiking", color: "bg-emerald-500" },
];

export function WorkoutLogSheet({ open, onOpenChange }: WorkoutLogSheetProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSelectWorkout = (workoutType: string) => {
    onOpenChange(false);
    navigate(`/workouts?type=${workoutType}`);
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("quickActions.logWorkout", "Log Workout")}
      snapPoints={[55]}
    >
      <div className="space-y-4 pt-4">
        <p className="text-center text-muted-foreground">
          {t("quickActions.selectWorkoutType", "Select workout type to start")}
        </p>

        <div className="grid grid-cols-3 gap-3">
          {workoutTypes.map((workout) => (
            <button
              key={workout.id}
              onClick={() => handleSelectWorkout(workout.id)}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-2xl",
                "border border-border/50 bg-card",
                "hover:bg-accent/50 hover:scale-105 active:scale-95",
                "transition-all duration-200"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                workout.color
              )}>
                <workout.icon className="h-6 w-6 text-white" />
              </div>
              <span className="text-sm font-medium">
                {t(`workouts.types.${workout.id}`, workout.label)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </BottomSheet>
  );
}
