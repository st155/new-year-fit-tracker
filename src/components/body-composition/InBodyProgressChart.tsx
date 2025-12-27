import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";

interface InBodyAnalysis {
  id: string;
  test_date: string;
  weight: number | null;
  skeletal_muscle_mass: number | null;
  body_fat_mass: number | null;
  percent_body_fat: number | null;
  visceral_fat_area: number | null;
}

interface InBodyProgressChartProps {
  analyses: InBodyAnalysis[];
}

export function InBodyProgressChart({ analyses }: InBodyProgressChartProps) {
  const { t } = useTranslation('bodyComposition');
  
  const chartData = useMemo(() => {
    return analyses
      .sort((a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime())
      .map(analysis => ({
        date: format(new Date(analysis.test_date), 'MMM dd'),
        weight: analysis.weight,
        muscle: analysis.skeletal_muscle_mass,
        fat: analysis.percent_body_fat,
        visceralFat: analysis.visceral_fat_area,
      }));
  }, [analyses]);

  if (analyses.length < 2) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        <p>{t('inbody.minMeasurements')}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold metric-glow">{t('inbody.progressTitle')}</h2>
      
      {/* Weight & Muscle Mass Chart */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-4 text-primary">{t('inbody.weightMuscle')}</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="weight" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              name={t('inbody.charts.weight')}
              dot={{ fill: 'hsl(var(--primary))' }}
            />
            <Line 
              type="monotone" 
              dataKey="muscle" 
              stroke="hsl(var(--chart-2))" 
              strokeWidth={2}
              name={t('inbody.charts.muscle')}
              dot={{ fill: 'hsl(var(--chart-2))' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Body Fat Chart */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-4 text-primary">{t('inbody.bodyFat')}</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="fat" 
              stroke="hsl(var(--destructive))" 
              strokeWidth={2}
              name={t('inbody.charts.fat')}
              dot={{ fill: 'hsl(var(--destructive))' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Visceral Fat Chart */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-4 text-primary">{t('inbody.visceralFat')}</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="visceralFat" 
              stroke="hsl(var(--chart-4))" 
              strokeWidth={2}
              name={t('inbody.charts.visceralFat')}
              dot={{ fill: 'hsl(var(--chart-4))' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}