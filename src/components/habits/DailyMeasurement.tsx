import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Check, TrendingUp, TrendingDown } from "lucide-react";
import { useHabitMeasurements } from "@/hooks/useHabitMeasurements";

interface DailyMeasurementProps {
  habit: any;
  userId?: string;
}

export function DailyMeasurement({ habit, userId }: DailyMeasurementProps) {
  const [value, setValue] = useState("");
  const { measurements, stats, addMeasurement, isAdding } = useHabitMeasurements(habit.id, userId);

  const today = new Date().toISOString().split('T')[0];
  const todayMeasurement = measurements?.find(m => m.measurement_date === today);
  const yesterdayMeasurement = measurements?.[1];

  const handleSubmit = () => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) return;

    addMeasurement({ value: numValue });
    setValue("");
  };

  const targetValue = habit.target_value || 0;
  const currentValue = todayMeasurement?.value || 0;
  const progress = targetValue > 0 ? Math.min((currentValue / targetValue) * 100, 100) : 0;

  // Calculate trend
  const trend = yesterdayMeasurement && todayMeasurement
    ? todayMeasurement.value - yesterdayMeasurement.value
    : 0;

  // Last 7 days average
  const last7Days = measurements?.slice(0, 7) || [];
  const weekAverage = last7Days.length > 0
    ? last7Days.reduce((sum, m) => sum + m.value, 0) / last7Days.length
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">{habit.icon || "📈"}</span>
          {habit.name}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Today's Progress */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-3xl font-bold text-primary">
                {currentValue || 0}
              </div>
              <div className="text-sm text-muted-foreground">
                {habit.measurement_unit || "units"} today
              </div>
            </div>
            {targetValue > 0 && (
              <div className="text-right">
                <div className="text-sm font-semibold">
                  Goal: {targetValue}
                </div>
                <div className="text-xs text-muted-foreground">
                  {progress.toFixed(0)}%
                </div>
              </div>
            )}
          </div>

          {targetValue > 0 && (
            <Progress value={progress} />
          )}
        </div>

        {/* Input Section */}
        {!todayMeasurement && (
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Enter value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
            <Button onClick={handleSubmit} disabled={isAdding || !value}>
              <Check className="h-4 w-4" />
            </Button>
          </div>
        )}

        {todayMeasurement && (
          <div className="p-3 rounded-lg bg-primary/10 text-center">
            <div className="text-sm font-medium">Today's measurement recorded!</div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          {trend !== 0 && (
            <div className="flex items-center gap-2">
              {trend > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <div>
                <div className="text-xs text-muted-foreground">vs Yesterday</div>
                <div className="font-semibold">
                  {trend > 0 ? '+' : ''}{trend.toFixed(1)}
                </div>
              </div>
            </div>
          )}

          <div>
            <div className="text-xs text-muted-foreground">7-day Avg</div>
            <div className="font-semibold">
              {weekAverage.toFixed(1)} {habit.measurement_unit || ""}
            </div>
          </div>
        </div>

        {/* Recent History */}
        {measurements && measurements.length > 0 && (
          <div className="space-y-1 pt-2 border-t">
            <div className="text-xs text-muted-foreground mb-2">Recent entries</div>
            {measurements.slice(0, 5).map((m) => (
              <div key={m.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {new Date(m.measurement_date).toLocaleDateString()}
                </span>
                <span className="font-medium">
                  {m.value} {habit.measurement_unit || ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
