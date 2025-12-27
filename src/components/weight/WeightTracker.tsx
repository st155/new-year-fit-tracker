import { useState, useEffect } from "react";
import { Scale, Plus, TrendingUp, TrendingDown, Edit3, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AIPhotoUpload } from "@/components/ui/ai-photo-upload";
import { PhotoUpload } from "@/components/ui/photo-upload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ru, enUS } from "date-fns/locale";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { useTranslation } from "react-i18next";
interface WeightEntry {
  id: string;
  weight: number;
  measurement_date: string;
  photo_url?: string;
  created_at: string;
}

interface WeightTrackerProps {
  targetWeight?: number;
  className?: string;
}

export function WeightTracker({ targetWeight, className }: WeightTrackerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentWeight, setCurrentWeight] = useState('');
  const [measurementDate, setMeasurementDate] = useState(new Date().toISOString().split('T')[0]);
  const [photoUrl, setPhotoUrl] = useState('');

  useEffect(() => {
    if (user) {
      fetchWeightData();
    }
  }, [user]);

  const fetchWeightData = async () => {
    if (!user) return;

    try {
      // Сначала проверяем данные Withings из metric_values
      const { data: withingsData } = await supabase
        .from('metric_values')
        .select(`
          value,
          measurement_date,
          user_metrics!inner(metric_name, unit, source)
        `)
        .eq('user_id', user.id)
        .eq('user_metrics.metric_name', 'Вес')
        .eq('user_metrics.source', 'withings')
        .order('measurement_date', { ascending: false })
        .limit(30);

      if (withingsData && withingsData.length > 0) {
        const entries = withingsData.map(item => ({
          id: crypto.randomUUID(),
          weight: item.value,
          measurement_date: item.measurement_date,
          created_at: new Date().toISOString()
        }));
        setWeightEntries(entries);
        return;
      }

      // Fallback к body_composition
      const { data: bodyCompositionData } = await supabase
        .from('body_composition')
        .select('id, weight, measurement_date, created_at')
        .eq('user_id', user.id)
        .not('weight', 'is', null)
        .order('measurement_date', { ascending: false })
        .limit(30);

      if (bodyCompositionData && bodyCompositionData.length > 0) {
        const entries = bodyCompositionData.map(item => ({
          id: item.id,
          weight: item.weight,
          measurement_date: item.measurement_date,
          created_at: item.created_at
        }));
        setWeightEntries(entries);
        return;
      }

      // Fallback к daily_health_summary
      const { data, error } = await supabase
        .from('daily_health_summary')
        .select('id, weight, date, created_at')
        .eq('user_id', user.id)
        .not('weight', 'is', null)
        .order('date', { ascending: false })
        .limit(30);

      if (error) throw error;

      const entries = data?.map(item => ({
        id: item.id,
        weight: item.weight,
        measurement_date: item.date,
        created_at: item.created_at
      })) || [];

      setWeightEntries(entries);
    } catch (error) {
      console.error('Error fetching weight data:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные о весе",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addWeightEntry = async () => {
    if (!currentWeight || !user) {
      toast({
        title: "Ошибка",
        description: "Введите значение веса",
        variant: "destructive",
      });
      return;
    }

    try {
      // Сначала проверяем, есть ли уже запись за эту дату
      const { data: existingData } = await supabase
        .from('daily_health_summary')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', measurementDate)
        .maybeSingle();

      if (existingData) {
        // Обновляем существующую запись
        const { error } = await supabase
          .from('daily_health_summary')
          .update({ weight: parseFloat(currentWeight) })
          .eq('id', existingData.id);

        if (error) throw error;
      } else {
        // Создаем новую запись
        const { error } = await supabase
          .from('daily_health_summary')
          .insert({
            user_id: user.id,
            date: measurementDate,
            weight: parseFloat(currentWeight)
          });

        if (error) throw error;
      }

      // Если есть фото, создаем запись в body_composition
      if (photoUrl) {
        const { error: bodyError } = await supabase
          .from('body_composition')
          .insert({
            user_id: user.id,
            measurement_date: measurementDate,
            weight: parseFloat(currentWeight),
            photo_after_url: photoUrl,
            measurement_method: 'manual'
          });

        if (bodyError) {
          console.error('Error saving body composition:', bodyError);
        }
      }

      toast({
        title: "Успешно!",
        description: "Вес добавлен",
      });

      setIsDialogOpen(false);
      setCurrentWeight('');
      setPhotoUrl('');
      setMeasurementDate(new Date().toISOString().split('T')[0]);
      fetchWeightData();
    } catch (error) {
      console.error('Error adding weight:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось добавить вес",
        variant: "destructive",
      });
    }
  };

  const getWeightTrend = () => {
    if (weightEntries.length < 2) return null;
    
    const latest = weightEntries[0].weight;
    const previous = weightEntries[1].weight;
    const change = latest - previous;
    
    return {
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      change: Math.abs(change),
      percentage: Math.abs((change / previous) * 100)
    };
  };

  const getProgressToTarget = () => {
    if (!targetWeight || weightEntries.length === 0) return null;
    
    const currentWeight = weightEntries[0].weight;
    const progress = Math.abs(targetWeight - currentWeight);
    
    return {
      current: currentWeight,
      target: targetWeight,
      remaining: progress,
      isLosing: targetWeight < currentWeight
    };
  };

  const trend = getWeightTrend();
  const progress = getProgressToTarget();

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Текущий вес и статистика */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              <CardTitle>Контроль веса</CardTitle>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-gradient-primary hover:opacity-90">
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить вес
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Добавить измерение веса</DialogTitle>
                  <DialogDescription>
                    Введите вес вручную или загрузите фото весов для автоматического распознавания
                  </DialogDescription>
                </DialogHeader>
                
                <Tabs defaultValue="manual" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="manual">Ручной ввод</TabsTrigger>
                    <TabsTrigger value="photo">ИИ-анализ фото</TabsTrigger>
                    <TabsTrigger value="progress">Фото прогресса</TabsTrigger>
                  </TabsList>

                  <TabsContent value="manual" className="space-y-4">
                    <div>
                      <Label htmlFor="weight">Вес (кг)</Label>
                      <Input
                        id="weight"
                        type="number"
                        step="0.1"
                        placeholder="70.5"
                        value={currentWeight}
                        onChange={(e) => setCurrentWeight(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="date">Дата измерения</Label>
                      <Input
                        id="date"
                        type="date"
                        value={measurementDate}
                        onChange={(e) => setMeasurementDate(e.target.value)}
                      />
                    </div>

                    <Button onClick={addWeightEntry} className="w-full">
                      Сохранить вес
                    </Button>
                  </TabsContent>

                  <TabsContent value="photo" className="space-y-4">
                    <AIPhotoUpload
                      onDataExtracted={(result) => {
                        if (result.success && result.extractedData?.weight) {
                          setCurrentWeight(result.extractedData.weight.toString());
                          toast({
                            title: "Вес распознан!",
                            description: `Найден вес: ${result.extractedData.weight} кг`,
                          });
                        }
                      }}
                      onPhotoUploaded={setPhotoUrl}
                      label="Сфотографируйте весы"
                    />
                    
                    {currentWeight && (
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm font-medium text-green-800">
                          Распознанный вес: {currentWeight} кг
                        </p>
                        <Button onClick={addWeightEntry} className="mt-2 w-full">
                          Сохранить вес
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="progress" className="space-y-4">
                    <PhotoUpload
                      onPhotoUploaded={setPhotoUrl}
                      label="Добавьте фото для отслеживания прогресса"
                    />
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {weightEntries.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{weightEntries[0].weight}</span>
                    <span className="text-sm text-muted-foreground">кг</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(weightEntries[0].measurement_date), 'd MMMM yyyy', { locale: ru })}
                  </p>
                </div>
                
                {trend && (
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      {trend.direction === 'up' ? (
                        <TrendingUp className="h-4 w-4 text-red-500" />
                      ) : trend.direction === 'down' ? (
                        <TrendingDown className="h-4 w-4 text-green-500" />
                      ) : null}
                      <span className={`text-sm font-medium ${
                        trend.direction === 'up' ? 'text-red-500' : 
                        trend.direction === 'down' ? 'text-green-500' : 'text-muted-foreground'
                      }`}>
                        {trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''}
                        {trend.change.toFixed(1)} кг
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      за последнее измерение
                    </p>
                  </div>
                )}
              </div>

              {progress && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Прогресс к цели</span>
                    <Badge variant={progress.isLosing ? "destructive" : "default"}>
                      {progress.isLosing ? 'Снижение' : 'Набор'} веса
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm">
                      Текущий: {progress.current} кг
                    </span>
                    <span className="text-sm">
                      Цель: {progress.target} кг
                    </span>
                    <span className="text-sm font-medium">
                      Осталось: {progress.remaining.toFixed(1)} кг
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Scale className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Добавьте первое измерение веса</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* График истории измерений */}
      {weightEntries.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">История измерений</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={weightEntries.slice(0, 10).reverse().map(entry => ({
                    date: format(new Date(entry.measurement_date), 'd MMM', { locale: ru }),
                    weight: entry.weight,
                    fullDate: entry.measurement_date
                  }))}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    domain={['dataMin - 1', 'dataMax + 1']}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-lg">
                            <p className="font-medium">{data.weight} кг</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(data.fullDate), 'd MMMM yyyy', { locale: ru })}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}