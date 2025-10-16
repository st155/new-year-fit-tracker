import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, Minus } from "lucide-react";
import { useHabitMeasurements } from "@/hooks/useHabitMeasurements";

interface NumericCounterProps {
  habit: any;
  userId?: string;
}

export function NumericCounter({ habit, userId }: NumericCounterProps) {
  const { stats, addMeasurement, isAdding } = useHabitMeasurements(habit.id, userId);

  const currentValue = stats?.total || 0;
  const targetValue = habit.target_value || 0;
  const progress = targetValue > 0 ? Math.min((currentValue / targetValue) * 100, 100) : 0;

  const handleIncrement = () => {
    addMeasurement({ value: 1 });
  };

  const handleDecrement = () => {
    if (currentValue > 0) {
      addMeasurement({ value: -1 });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">{habit.icon || "📊"}</span>
          {habit.name}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Progress */}
        <div className="text-center py-4">
          <div className="text-4xl font-bold text-primary">
            {currentValue}
            {targetValue > 0 && (
              <span className="text-2xl text-muted-foreground"> / {targetValue}</span>
            )}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {habit.measurement_unit || "items"}
          </div>
        </div>

        {/* Progress Bar */}
        {targetValue > 0 && (
          <div className="space-y-2">
            <Progress value={progress} />
            <div className="text-xs text-center text-muted-foreground">
              {progress.toFixed(0)}% Complete
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleDecrement}
            disabled={isAdding || currentValue === 0}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            className="flex-1"
            onClick={handleIncrement}
            disabled={isAdding}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add One
          </Button>
        </div>

        {/* Stats */}
        {stats && stats.count > 0 && (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Total Entries</div>
              <div className="font-semibold">{stats.count}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Avg per Entry</div>
              <div className="font-semibold">{stats.average.toFixed(1)}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
