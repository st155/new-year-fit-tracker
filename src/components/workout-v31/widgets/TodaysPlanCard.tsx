import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AdjustedExercise } from "@/hooks/useDailyWorkout";

interface TodaysPlanCardProps {
  exercises: AdjustedExercise[];
  workoutName?: string;
}

export function TodaysPlanCard({ exercises, workoutName }: TodaysPlanCardProps) {
  const navigate = useNavigate();
  
  return (
    <Card className="bg-neutral-900 border border-neutral-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {workoutName || "План на сегодня"} 
            <span className="text-sm text-cyan-400 ml-2">(AI Скорректирован)</span>
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/workouts/manage')}
            className="border-neutral-700 hover:border-neutral-600"
          >
            <Settings className="w-4 h-4 mr-2" />
            Управить
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {exercises.map((exercise, idx) => (
            <div key={idx} className="border-l-2 border-neutral-700 pl-4 py-2">
              <div className="font-semibold text-foreground">{exercise.name}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {exercise.sets} x {exercise.reps} повторений
                {exercise.weight && (
                  <span className={exercise.was_modified ? "text-cyan-400 ml-2 font-medium" : "ml-2"}>
                    @ {exercise.weight} кг
                    {exercise.was_modified && (
                      <Sparkles className="w-3 h-3 inline ml-1 text-cyan-400" />
                    )}
                  </span>
                )}
              </div>
              {exercise.rir && (
                <div className="text-xs text-muted-foreground mt-1">
                  RIR: {exercise.rir}
                </div>
              )}
              {exercise.adjustment_reason && exercise.was_modified && (
                <div className="text-xs text-cyan-400/70 mt-1 italic">
                  {exercise.adjustment_reason}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
