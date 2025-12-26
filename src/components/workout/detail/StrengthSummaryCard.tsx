import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell, Target, Layers, Trophy } from "lucide-react";

interface StrengthSummaryProps {
  totalVolume: number;
  totalExercises: number;
  totalSets: number;
  bestLift: { exercise: string; weight: number; reps: number } | null;
}

export default function StrengthSummaryCard({
  totalVolume,
  totalExercises,
  totalSets,
  bestLift,
}: StrengthSummaryProps) {
  const formatVolume = (kg: number) => {
    if (kg >= 1000) {
      return `${(kg / 1000).toFixed(1)}т`;
    }
    return `${kg.toFixed(0)}кг`;
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-primary" />
          Итоги тренировки
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Total Volume */}
          <div className="bg-primary/10 rounded-lg p-4 text-center">
            <Layers className="w-5 h-5 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold text-foreground">
              {formatVolume(totalVolume)}
            </p>
            <p className="text-xs text-muted-foreground">Общий объём</p>
          </div>

          {/* Total Exercises */}
          <div className="bg-secondary/50 rounded-lg p-4 text-center">
            <Target className="w-5 h-5 mx-auto mb-2 text-secondary-foreground" />
            <p className="text-2xl font-bold text-foreground">{totalExercises}</p>
            <p className="text-xs text-muted-foreground">Упражнений</p>
          </div>

          {/* Total Sets */}
          <div className="bg-secondary/50 rounded-lg p-4 text-center">
            <Dumbbell className="w-5 h-5 mx-auto mb-2 text-secondary-foreground" />
            <p className="text-2xl font-bold text-foreground">{totalSets}</p>
            <p className="text-xs text-muted-foreground">Подходов</p>
          </div>

          {/* Best Lift */}
          {bestLift && (
            <div className="bg-amber-500/10 rounded-lg p-4 text-center">
              <Trophy className="w-5 h-5 mx-auto mb-2 text-amber-500" />
              <p className="text-2xl font-bold text-foreground">
                {bestLift.weight}кг
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {bestLift.exercise}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
