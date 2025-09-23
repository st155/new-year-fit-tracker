import { useState, useEffect } from "react";
import { Scale, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AIPhotoUpload } from "@/components/ui/ai-photo-upload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface WeightData {
  weight: number;
  date: string;
}

export function QuickWeightTracker() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [weightData, setWeightData] = useState<WeightData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentWeight, setCurrentWeight] = useState('');

  useEffect(() => {
    if (user) {
      fetchWeightData();
    }
  }, [user]);

  const fetchWeightData = async () => {
    if (!user) return;

    try {
      // Сначала проверяем данные Withings из metric_values
      const { data: withingsData, error: withingsError } = await supabase
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
        .limit(7);

      if (withingsError) {
        console.error('Error fetching Withings data:', withingsError);
      }

      // Если есть данные Withings, используем их
      if (withingsData && withingsData.length > 0) {
        const weights = withingsData.map(item => ({
          weight: item.value,
          date: item.measurement_date
        }));
        setWeightData(weights);
        setLoading(false);
        return;
      }

      // Fallback к body_composition
      const { data: bodyCompositionData } = await supabase
        .from('body_composition')
        .select('weight, measurement_date')
        .eq('user_id', user.id)
        .not('weight', 'is', null)
        .order('measurement_date', { ascending: false })
        .limit(7);

      if (bodyCompositionData && bodyCompositionData.length > 0) {
        const weights = bodyCompositionData.map(item => ({
          weight: item.weight,
          date: item.measurement_date
        }));
        setWeightData(weights);
        setLoading(false);
        return;
      }

      // Иначе используем данные из daily_health_summary
      const { data, error } = await supabase
        .from('daily_health_summary')
        .select('weight, date')
        .eq('user_id', user.id)
        .not('weight', 'is', null)
        .order('date', { ascending: false })
        .limit(7);

      if (error) throw error;

      const weights = data?.map(item => ({
        weight: item.weight,
        date: item.date
      })) || [];

      setWeightData(weights);
    } catch (error) {
      console.error('Error fetching weight data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addWeight = async () => {
    if (!currentWeight || !user) {
      toast({
        title: "Ошибка",
        description: "Введите значение веса",
        variant: "destructive",
      });
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Проверяем, есть ли запись за сегодня
      const { data: existingData } = await supabase
        .from('daily_health_summary')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', today)
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
            date: today,
            weight: parseFloat(currentWeight)
          });

        if (error) throw error;
      }

      toast({
        title: "Успешно!",
        description: "Вес добавлен",
      });

      setIsDialogOpen(false);
      setCurrentWeight('');
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

  const getTrend = () => {
    if (weightData.length < 2) return null;
    
    const latest = weightData[0].weight;
    const previous = weightData[1].weight;
    const change = latest - previous;
    
    return {
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      change: Math.abs(change),
      percentage: Math.abs((change / previous) * 100)
    };
  };

  const trend = getTrend();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Вес</CardTitle>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Добавить вес</DialogTitle>
                <DialogDescription>
                  Введите текущий вес или загрузите фото весов
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="manual" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="manual">Ручной ввод</TabsTrigger>
                  <TabsTrigger value="photo">Фото весов</TabsTrigger>
                </TabsList>

                <TabsContent value="manual" className="space-y-4">
                  <div>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="70.5"
                      value={currentWeight}
                      onChange={(e) => setCurrentWeight(e.target.value)}
                    />
                  </div>
                  <Button onClick={addWeight} className="w-full">
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
                    label="Сфотографируйте весы"
                  />
                  
                  {currentWeight && (
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm font-medium text-green-800">
                        Распознанный вес: {currentWeight} кг
                      </p>
                      <Button onClick={addWeight} className="mt-2 w-full">
                        Сохранить вес
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {weightData.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{weightData[0].weight}</span>
                  <span className="text-sm text-muted-foreground">кг</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(weightData[0].date), 'd MMM', { locale: ru })}
                </p>
              </div>
              
              {trend && trend.direction !== 'stable' && (
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    {trend.direction === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-red-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-green-500" />
                    )}
                    <span className={`text-sm font-medium ${
                      trend.direction === 'up' ? 'text-red-500' : 'text-green-500'
                    }`}>
                      {trend.direction === 'up' ? '+' : '-'}{trend.change.toFixed(1)}
                    </span>
                  </div>
                  <Badge variant={trend.direction === 'up' ? 'destructive' : 'default'} className="text-xs">
                    {trend.direction === 'up' ? 'Рост' : 'Снижение'}
                  </Badge>
                </div>
              )}
            </div>

            {weightData.length > 1 && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Недавние измерения:</div>
                <div className="flex gap-2 text-xs">
                  {weightData.slice(1, 4).map((entry, index) => (
                    <span key={index} className="bg-muted px-2 py-1 rounded">
                      {entry.weight} кг
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <Scale className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Добавьте первое измерение</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}