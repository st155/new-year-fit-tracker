import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Droplet, Flame, Scale, TrendingDown, TrendingUp } from "lucide-react";

interface BodyCompositionData {
  weight: number;
  body_fat_percentage: number;
  muscle_mass: number;
  measurement_date: string;
}

interface BodyCompositionMetricsProps {
  latestData: BodyCompositionData | null | undefined;
}

export function BodyCompositionMetrics({ latestData }: BodyCompositionMetricsProps) {
  if (!latestData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            No measurements yet. Add your first measurement to get started!
          </p>
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    {
      title: "Weight",
      value: latestData.weight,
      unit: "kg",
      icon: Scale,
      color: "text-primary",
    },
    {
      title: "Body Fat",
      value: latestData.body_fat_percentage,
      unit: "%",
      icon: TrendingDown,
      color: "text-orange-500",
    },
    {
      title: "Muscle Mass",
      value: latestData.muscle_mass,
      unit: "kg",
      icon: Activity,
      color: "text-green-500",
    },
    {
      title: "Lean Mass",
      value: (latestData.weight - (latestData.weight * latestData.body_fat_percentage / 100)).toFixed(1),
      unit: "kg",
      icon: TrendingUp,
      color: "text-blue-500",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Last measured: {new Date(latestData.measurement_date).toLocaleDateString()}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${metric.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metric.value} <span className="text-sm font-normal text-muted-foreground">{metric.unit}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
