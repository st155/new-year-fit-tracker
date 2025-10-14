import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface MetricsTrendsProps {
  userId?: string;
}

export function MetricsTrends({ userId }: MetricsTrendsProps) {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["metrics-trends", userId],
    queryFn: async () => {
      if (!userId) return [];

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from("metric_values")
        .select(`
          *,
          user_metrics(metric_name, unit)
        `)
        .eq("user_id", userId)
        .gte("measurement_date", thirtyDaysAgo.toISOString().split("T")[0])
        .order("measurement_date", { ascending: true });

      if (error) throw error;

      // Group by metric name
      const grouped = data.reduce((acc: any, item: any) => {
        const name = item.user_metrics?.metric_name || "Unknown";
        if (!acc[name]) acc[name] = [];
        acc[name].push({
          date: new Date(item.measurement_date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          value: item.value,
        });
        return acc;
      }, {});

      return Object.entries(grouped).map(([name, values]) => ({
        name,
        data: values,
      }));
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    );
  }

  if (!metrics || metrics.length === 0) {
    return (
      <EmptyState
        icon={<TrendingUp className="h-12 w-12" />}
        title="No trends data"
        description="Metrics will appear here as you track your fitness data"
      />
    );
  }

  return (
    <div className="space-y-4">
      {metrics.map((metric: any) => (
        <Card key={metric.name}>
          <CardHeader>
            <CardTitle className="text-lg">{metric.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={metric.data}>
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
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
