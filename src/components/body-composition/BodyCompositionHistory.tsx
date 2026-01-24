import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface BodyCompositionHistoryProps {
  userId?: string;
}

export function BodyCompositionHistory({ userId }: BodyCompositionHistoryProps) {
  const { t } = useTranslation('bodyComposition');
  const { data: history, isLoading } = useQuery({
    queryKey: ['body-composition-history', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('body_composition')
        .select('*')
        .eq('user_id', userId)
        .order('measurement_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">{t('loading', 'Loading...')}</p>
        </CardContent>
      </Card>
    );
  }

  if (!history?.length) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            {t('noHistory', 'No history available yet. Add measurements to see your progress!')}
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = history.map((item) => ({
    date: new Date(item.measurement_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: item.weight,
    bodyFat: item.body_fat_percentage,
    muscle: item.muscle_mass,
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('weightTrend', 'Weight & Body Fat Trend')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="weight"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                name={t('weightKg', 'Weight (kg)')}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="bodyFat"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                name={t('bodyFatPercent', 'Body Fat (%)')}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('muscleTrend', 'Muscle Mass Trend')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="muscle"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                name={t('muscleKg', 'Muscle Mass (kg)')}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('measurementHistory', 'Measurement History')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {history.reverse().map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="font-medium">
                  {new Date(item.measurement_date).toLocaleDateString()}
                </div>
                <div className="text-sm text-muted-foreground space-x-4">
                  <span>{item.weight} {t('common:units.kg', 'kg')}</span>
                  <span>{item.body_fat_percentage}% {t('fat', 'fat')}</span>
                  <span>{item.muscle_mass} {t('common:units.kg', 'kg')} {t('muscle', 'muscle')}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
