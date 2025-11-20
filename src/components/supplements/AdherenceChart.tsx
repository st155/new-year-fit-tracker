import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ComponentLoader } from "@/components/ui/page-loader";

interface AdherenceChartProps {
  userId: string;
}

export function AdherenceChart({ userId }: AdherenceChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["adherence-chart", userId],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from("supplement_logs")
        .select("status, scheduled_time")
        .eq("user_id", userId)
        .gte("scheduled_time", thirtyDaysAgo.toISOString())
        .order("scheduled_time", { ascending: true });

      if (error) throw error;

      // Group by date and calculate daily adherence
      const groupedByDate = data.reduce((acc: any, log) => {
        const date = new Date(log.scheduled_time).toISOString().split("T")[0];
        if (!acc[date]) {
          acc[date] = { date, total: 0, taken: 0 };
        }
        acc[date].total++;
        if (log.status === "taken") {
          acc[date].taken++;
        }
        return acc;
      }, {});

      return Object.values(groupedByDate).map((day: any) => ({
        date: new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        adherence: Math.round((day.taken / day.total) * 100),
      }));
    },
  });

  if (isLoading) return <ComponentLoader />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>30-Day Adherence</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              domain={[0, 100]}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px"
              }}
            />
            <Line 
              type="monotone" 
              dataKey="adherence" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
