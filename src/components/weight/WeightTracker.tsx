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

const getDateLocale = (lang: string) => lang === 'ru' ? ru : enUS;
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
  const { t, i18n } = useTranslation("body");
  const dateLocale = getDateLocale(i18n.language);
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
        title: t("common:errors.generic"),
        description: t("weightTracker.loadError"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addWeightEntry = async () => {
    if (!currentWeight || !user) {
      toast({
        title: t("common:errors.generic"),
        description: t("weightTracker.enterWeight"),
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
        title: t("common:success.saved"),
        description: t("common:success.weightAdded"),
      });

      setIsDialogOpen(false);
      setCurrentWeight('');
      setPhotoUrl('');
      setMeasurementDate(new Date().toISOString().split('T')[0]);
      fetchWeightData();
    } catch (error) {
      console.error('Error adding weight:', error);
      toast({
        title: t("common:errors.generic"),
        description: t("weightTracker.addError"),
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
              <CardTitle>{t("weightTracker.title")}</CardTitle>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-gradient-primary hover:opacity-90">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("weightTracker.addWeight")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{t("weightTracker.addMeasurement")}</DialogTitle>
                  <DialogDescription>
                    {t("weightTracker.addMeasurementDesc")}
                  </DialogDescription>
                </DialogHeader>
                
                <Tabs defaultValue="manual" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="manual">{t("weightTracker.manualInput")}</TabsTrigger>
                    <TabsTrigger value="photo">{t("weightTracker.aiPhoto")}</TabsTrigger>
                    <TabsTrigger value="progress">{t("weightTracker.progressPhoto")}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="manual" className="space-y-4">
                    <div>
                      <Label htmlFor="weight">{t("weightTracker.weight")}</Label>
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
                      <Label htmlFor="date">{t("form.measurementDate")}</Label>
                      <Input
                        id="date"
                        type="date"
                        value={measurementDate}
                        onChange={(e) => setMeasurementDate(e.target.value)}
                      />
                    </div>

                    <Button onClick={addWeightEntry} className="w-full">
                      {t("weightTracker.saveWeight")}
                    </Button>
                  </TabsContent>

                  <TabsContent value="photo" className="space-y-4">
                    <AIPhotoUpload
                      onDataExtracted={(result) => {
                        if (result.success && result.extractedData?.weight) {
                          setCurrentWeight(result.extractedData.weight.toString());
                          toast({
                            title: t("weightTracker.weightRecognized"),
                            description: t("weightTracker.foundWeight", { weight: result.extractedData.weight }),
                          });
                        }
                      }}
                      onPhotoUploaded={setPhotoUrl}
                      label={t("weightTracker.photoScale")}
                    />
                    
                    {currentWeight && (
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm font-medium text-green-800">
                          {t("weightTracker.recognizedWeight", { weight: currentWeight })}
                        </p>
                        <Button onClick={addWeightEntry} className="mt-2 w-full">
                          {t("weightTracker.saveWeight")}
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="progress" className="space-y-4">
                    <PhotoUpload
                      onPhotoUploaded={setPhotoUrl}
                      label={t("weightTracker.addProgressPhoto")}
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
                    {format(new Date(weightEntries[0].measurement_date), 'd MMMM yyyy', { locale: dateLocale })}
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
                      {t("weightTracker.lastMeasurement")}
                    </p>
                  </div>
                )}
              </div>

              {progress && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{t("weightTracker.progressToGoal")}</span>
                    <Badge variant={progress.isLosing ? "destructive" : "default"}>
                      {progress.isLosing ? t("weightTracker.weightLoss") : t("weightTracker.weightGain")}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm">
                      {t("weightTracker.current")}: {progress.current} {t("common:units.kg")}
                    </span>
                    <span className="text-sm">
                      {t("weightTracker.target")}: {progress.target} {t("common:units.kg")}
                    </span>
                    <span className="text-sm font-medium">
                      {t("weightTracker.remaining")}: {progress.remaining.toFixed(1)} {t("common:units.kg")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Scale className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t("weightTracker.addFirstMeasurement")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* График истории измерений */}
      {weightEntries.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("history.measurementHistory")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={weightEntries.slice(0, 10).reverse().map(entry => ({
                    date: format(new Date(entry.measurement_date), 'd MMM', { locale: dateLocale }),
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
                            <p className="font-medium">{data.weight} {t("common:units.kg")}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(data.fullDate), 'd MMMM yyyy', { locale: dateLocale })}
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