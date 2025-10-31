import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { LineChart as LineChartIcon } from 'lucide-react';
import { formatMeasurement } from '@/lib/units';

interface Goal {
  id: string;
  goal_name: string;
  target_value: number;
  target_unit: string;
}

interface Measurement {
  id: string;
  goal_id: string;
  value: number;
  measurement_date: string;
  unit: string;
}

interface GoalProgressChartProps {
  goal: Goal;
  measurements: Measurement[];
}

export function GoalProgressChart({ goal, measurements }: GoalProgressChartProps) {
  const chartData = useMemo(() => {
    const sorted = [...measurements]
      .filter(m => m.goal_id === goal.id)
      .sort((a, b) => new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime());

    return sorted.map(m => ({
      date: format(new Date(m.measurement_date), 'dd MMM', { locale: ru }),
      value: m.value,
      target: goal.target_value
    }));
  }, [goal, measurements]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{goal.goal_name} - График прогресса</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <LineChartIcon className="h-12 w-12 mb-2" />
            <p className="text-sm">Нет данных для графика</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{goal.goal_name} - График прогресса</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              domain={[0, 'auto']}
            />
            <Tooltip 
              formatter={(value: number) => formatMeasurement(value, goal.target_unit)}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              name="Текущее"
              dot={{ r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="target" 
              stroke="hsl(var(--muted-foreground))" 
              strokeWidth={1}
              strokeDasharray="5 5"
              name="Цель"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
