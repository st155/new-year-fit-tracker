import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Activity } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useInBodyAnalyses } from "@/hooks/useInBodyAnalyses";
import { Skeleton } from "@/components/ui/skeleton";

export const DocumentTrends = () => {
  const { user } = useAuth();
  const { data: inbodyAnalyses, isLoading } = useInBodyAnalyses(user?.id);

  const trendData = useMemo(() => {
    if (!inbodyAnalyses?.length) return [];
    
    return inbodyAnalyses
      .map(analysis => ({
        date: analysis.test_date 
          ? new Date(analysis.test_date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) 
          : 'N/A',
        timestamp: analysis.test_date ? new Date(analysis.test_date).getTime() : 0,
        weight: analysis.weight || null,
        bodyFat: analysis.percent_body_fat || null,
        muscleMass: analysis.skeletal_muscle_mass || null,
      }))
      .filter(item => item.timestamp > 0)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [inbodyAnalyses]);

  const stats = useMemo(() => {
    if (trendData.length < 2) return null;

    const first = trendData[0];
    const last = trendData[trendData.length - 1];

    const calcChange = (start: number | null, end: number | null) => {
      if (!start || !end) return null;
      const change = end - start;
      const percent = (change / start) * 100;
      return { value: change, percent };
    };

    return {
      weight: calcChange(first.weight, last.weight),
      bodyFat: calcChange(first.bodyFat, last.bodyFat),
      muscleMass: calcChange(first.muscleMass, last.muscleMass),
    };
  }, [trendData]);

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  if (!inbodyAnalyses || inbodyAnalyses.length === 0) {
    return null;
  }

  if (trendData.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Тренды метрик
          </CardTitle>
          <CardDescription>
            Недостаточно данных для построения трендов. Загрузите минимум 2 обработанных документа.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Тренды метрик
          </CardTitle>
          <CardDescription>
            Изменение ключевых показателей за период
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {stats.weight && (
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Вес</div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold ${stats.weight.value > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                      {stats.weight.value > 0 ? '+' : ''}{stats.weight.value.toFixed(1)} кг
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({stats.weight.percent > 0 ? '+' : ''}{stats.weight.percent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              )}
              
              {stats.bodyFat && (
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Жир</div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold ${stats.bodyFat.value > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                      {stats.bodyFat.value > 0 ? '+' : ''}{stats.bodyFat.value.toFixed(1)}%
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({stats.bodyFat.percent > 0 ? '+' : ''}{stats.bodyFat.percent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              )}
              
              {stats.muscleMass && (
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Мышцы</div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold ${stats.muscleMass.value < 0 ? 'text-orange-500' : 'text-green-500'}`}>
                      {stats.muscleMass.value > 0 ? '+' : ''}{stats.muscleMass.value.toFixed(1)} кг
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({stats.muscleMass.percent > 0 ? '+' : ''}{stats.muscleMass.percent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
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
                  name="Вес (кг)"
                  connectNulls
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="bodyFat" 
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2}
                  name="Жир (%)"
                  connectNulls
                  dot={{ fill: 'hsl(var(--destructive))' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="muscleMass" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  name="Мышцы (кг)"
                  connectNulls
                  dot={{ fill: 'hsl(var(--chart-2))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            История измерений
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {trendData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="font-medium">{item.date}</div>
                <div className="flex gap-4 text-sm">
                  {item.weight && <span>Вес: {item.weight} кг</span>}
                  {item.bodyFat && <span>Жир: {item.bodyFat}%</span>}
                  {item.muscleMass && <span>Мышцы: {item.muscleMass} кг</span>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
