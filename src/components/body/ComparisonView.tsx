import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ComparisonViewProps {
  history: any[];
  isLoading: boolean;
}

export function ComparisonView({ history, isLoading }: ComparisonViewProps) {
  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  if (!history || history.length < 2) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          You need at least 2 measurements to compare progress
        </CardContent>
      </Card>
    );
  }

  const latest = history[0];
  const oldest = history[history.length - 1];

  const weightChange = latest.weight - oldest.weight;
  const fatChange = latest.body_fat_percentage - oldest.body_fat_percentage;

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="font-semibold">Latest</h3>
            <p className="text-sm text-muted-foreground">
              {new Date(latest.measurement_date).toLocaleDateString()}
            </p>
            <div className="space-y-1">
              <p>Weight: {latest.weight} kg</p>
              <p>Body Fat: {latest.body_fat_percentage}%</p>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">First</h3>
            <p className="text-sm text-muted-foreground">
              {new Date(oldest.measurement_date).toLocaleDateString()}
            </p>
            <div className="space-y-1">
              <p>Weight: {oldest.weight} kg</p>
              <p>Body Fat: {oldest.body_fat_percentage}%</p>
            </div>
          </div>
        </div>
        <div className="pt-4 border-t space-y-2">
          <h3 className="font-semibold">Changes</h3>
          <p className={weightChange > 0 ? "text-red-500" : "text-green-500"}>
            Weight: {weightChange > 0 ? "+" : ""}{weightChange.toFixed(1)} kg
          </p>
          <p className={fatChange > 0 ? "text-red-500" : "text-green-500"}>
            Body Fat: {fatChange > 0 ? "+" : ""}{fatChange.toFixed(1)}%
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
