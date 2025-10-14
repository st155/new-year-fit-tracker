import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Scale, Activity, Zap } from "lucide-react";

interface CurrentMetricsProps {
  current: any;
  isLoading: boolean;
}

export function CurrentMetrics({ current, isLoading }: CurrentMetricsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (!current) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No body composition data yet. Add your first measurement!
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Weight</CardTitle>
          <Scale className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{current.weight || 0} kg</div>
          <p className="text-xs text-muted-foreground">
            {new Date(current.measurement_date).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Body Fat</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{current.body_fat_percentage || 0}%</div>
          <p className="text-xs text-muted-foreground">
            {new Date(current.measurement_date).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Muscle Mass</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{current.muscle_mass || 0} kg</div>
          <p className="text-xs text-muted-foreground">
            {new Date(current.measurement_date).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
