import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Activity } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface BodyCompositionTimelineProps {
  history: any[];
}

export function BodyCompositionTimeline({ history }: BodyCompositionTimelineProps) {
  if (!history || history.length === 0) {
    return (
      <EmptyState
        icon={<Activity className="h-12 w-12" />}
        title="No body composition data"
        description="Start tracking your body metrics to see trends"
      />
    );
  }

  const chartData = history
    .slice()
    .reverse()
    .map((entry) => ({
      date: new Date(entry.measurement_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      weight: entry.weight || 0,
      bodyFat: entry.body_fat_percentage || 0,
      muscle: entry.muscle_mass || 0,
    }));

  return (
    <Card>
      <CardContent className="pt-6">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis 
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              name="Weight (kg)"
            />
            <Line
              type="monotone"
              dataKey="bodyFat"
              stroke="hsl(var(--destructive))"
              strokeWidth={2}
              name="Body Fat (%)"
            />
            <Line
              type="monotone"
              dataKey="muscle"
              stroke="hsl(var(--success))"
              strokeWidth={2}
              name="Muscle (kg)"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
