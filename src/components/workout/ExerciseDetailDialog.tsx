import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Zap, Activity, Timer, Weight, Sparkles } from "lucide-react";
import { AdjustedExercise } from "@/hooks/useDailyWorkout";

interface ExerciseDetailDialogProps {
  exercise: AdjustedExercise | null;
  open: boolean;
  onClose: () => void;
  onStart: (exercise: AdjustedExercise) => void;
}

export default function ExerciseDetailDialog({
  exercise,
  open,
  onClose,
  onStart
}: ExerciseDetailDialogProps) {
  if (!exercise) return null;

  const handleStart = () => {
    onStart(exercise);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md backdrop-blur-xl bg-background/95">
        <DialogHeader>
          <DialogTitle className="text-2xl">{exercise.name}</DialogTitle>
          <DialogDescription>Exercise Details</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {exercise.was_modified && (
            <Badge variant="secondary" className="w-fit">
              <Sparkles className="w-3 h-3 mr-1" />
              AI Modified
            </Badge>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="w-4 h-4" />
                Sets × Reps
              </div>
              <p className="text-2xl font-bold">
                {exercise.sets} × {exercise.reps}
              </p>
            </div>
            
            {exercise.weight && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Weight className="w-4 h-4" />
                  Weight
                </div>
                <p className="text-2xl font-bold">{exercise.weight} kg</p>
              </div>
            )}
            
            {exercise.rir !== undefined && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Zap className="w-4 h-4" />
                  RIR
                </div>
                <p className="text-2xl font-bold">{exercise.rir}</p>
              </div>
            )}
            
            {exercise.rpe !== undefined && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity className="w-4 h-4" />
                  RPE
                </div>
                <p className="text-2xl font-bold">{exercise.rpe}</p>
              </div>
            )}
            
            {exercise.rest_seconds && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Timer className="w-4 h-4" />
                  Rest Time
                </div>
                <p className="text-2xl font-bold">
                  {Math.floor(exercise.rest_seconds / 60)}:{(exercise.rest_seconds % 60).toString().padStart(2, '0')}
                </p>
              </div>
            )}
          </div>
          
          {exercise.adjustment_reason && (
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm font-medium mb-1">AI Adjustment:</p>
              <p className="text-sm text-muted-foreground italic">
                {exercise.adjustment_reason}
              </p>
            </div>
          )}
        </div>
        
        <Button
          size="lg"
          onClick={handleStart}
          className="w-full bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600"
        >
          <Play className="w-5 h-5 mr-2" />
          Start Exercise
        </Button>
      </DialogContent>
    </Dialog>
  );
}
