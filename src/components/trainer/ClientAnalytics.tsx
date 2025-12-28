import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { TrendingUp, TrendingDown, Activity, Heart, Target, User, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Client {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  assigned_at: string;
  active: boolean;
  goals_count?: number;
  last_measurement?: string;
}

interface ClientAnalyticsProps {
  clients: Client[];
  selectedClient: Client | null;
  onSelectClient: (client: Client) => void;
}

export function ClientAnalytics({ clients, selectedClient, onSelectClient }: ClientAnalyticsProps) {
  const { t } = useTranslation('trainer');
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [healthData, setHealthData] = useState<any[]>([]);
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedClient) {
      loadClientAnalytics();
    }
  }, [selectedClient]);

  const loadClientAnalytics = async () => {
    if (!selectedClient) return;

    setLoading(true);
    try {
      // Загружаем измерения
      const { data: measurementsData } = await supabase
        .from('measurements')
        .select('*')
        .eq('user_id', selectedClient.user_id)
        .order('measurement_date', { ascending: true });

      setMeasurements(measurementsData || []);

      // Загружаем данные веса (приоритет Withings)
      const { data: withingsWeightData } = await supabase
        .from('metric_values')
        .select(`
          value,
          measurement_date,
          user_metrics!inner(metric_name, unit, source)
        `)
        .eq('user_id', selectedClient.user_id)
        .eq('user_metrics.metric_name', 'Вес')
        .eq('user_metrics.source', 'withings')
        .order('measurement_date', { ascending: true })
        .limit(30);

      // Загружаем дневную статистику здоровья
      const { data: dailyStatsData } = await supabase
        .from('daily_health_summary')
        .select('*')
        .eq('user_id', selectedClient.user_id)
        .order('date', { ascending: true })
        .limit(30); // Последние 30 дней

      // Если есть данные Withings, используем их вместо daily_health_summary для веса
      let enhancedDailyStats = dailyStatsData || [];
      if (withingsWeightData && withingsWeightData.length > 0) {
        // Создаем карту дат для быстрого поиска
        const weightMap = new Map();
        withingsWeightData.forEach(item => {
          weightMap.set(item.measurement_date, item.value);
        });

        // Обновляем данные веса в daily stats
        enhancedDailyStats = enhancedDailyStats.map(item => ({
          ...item,
          weight: weightMap.get(item.date) || item.weight
        }));
      }

      setDailyStats(enhancedDailyStats);

      // Загружаем данные здоровья за последний месяц
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      const { data: healthRecords } = await supabase
        .from('health_records')
        .select('*')
        .eq('user_id', selectedClient.user_id)
        .gte('start_date', monthAgo.toISOString())
        .order('start_date', { ascending: true });

      setHealthData(healthRecords || []);

    } catch (error: any) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Подготавливаем данные для графиков
  const weightData = measurements
    .filter(m => m.value && m.unit === 'кг')
    .map(m => ({
      date: new Date(m.measurement_date).toLocaleDateString(),
      weight: parseFloat(m.value),
      goal: m.goal_id // для отображения цели
    }));

  const stepsData = dailyStats
    .filter(d => d.steps)
    .map(d => ({
      date: new Date(d.date).toLocaleDateString(),
      steps: d.steps,
      calories: d.active_calories || 0
    }));

  const heartRateData = dailyStats
    .filter(d => d.heart_rate_avg)
    .map(d => ({
      date: new Date(d.date).toLocaleDateString(),
      avg: d.heart_rate_avg,
      min: d.heart_rate_min,
      max: d.heart_rate_max
    }));

  const getLatestValue = (type: string) => {
    const latest = dailyStats[dailyStats.length - 1];
    return latest?.[type] || 0;
  };

  const getTrend = (data: any[], key: string) => {
    if (data.length < 2) return 0;
    const recent = data.slice(-7); // Последние 7 дней
    const oldValue = recent[0]?.[key] || 0;
    const newValue = recent[recent.length - 1]?.[key] || 0;
    return ((newValue - oldValue) / oldValue * 100).toFixed(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t('analytics.title')}</h2>
      </div>

      {!selectedClient ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('analytics.selectClient')}</CardTitle>
            <CardDescription>{t('analytics.selectClientDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clients.map((client) => (
                <Card 
                  key={client.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onSelectClient(client)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={client.avatar_url} />
                        <AvatarFallback>
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{client.full_name || client.username}</p>
                        <p className="text-sm text-muted-foreground">
                          {client.last_measurement ? 
                            `${t('analytics.data')}: ${new Date(client.last_measurement).toLocaleDateString()}` :
                            t('analytics.noData')
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Заголовок с клиентом */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedClient.avatar_url} />
                    <AvatarFallback>
                      <User className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-medium">{selectedClient.full_name || selectedClient.username}</h3>
                    <p className="text-muted-foreground">{t('analytics.progress')}</p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => onSelectClient(null as any)}>
                  {t('analytics.selectAnother')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Ключевые метрики */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('analytics.stepsToday')}</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getLatestValue('steps').toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {parseFloat(getTrend(stepsData, 'steps') || '0') > 0 ? (
                    <span className="text-green-600 flex items-center">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +{getTrend(stepsData, 'steps')}%
                    </span>
                  ) : (
                    <span className="text-red-600 flex items-center">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      {getTrend(stepsData, 'steps')}%
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('analytics.heartRateAvg')}</CardTitle>
                <Heart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(getLatestValue('heart_rate_avg'))}</div>
                <p className="text-xs text-muted-foreground">
                  {getLatestValue('heart_rate_min')}-{getLatestValue('heart_rate_max')} {t('analytics.bpm')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('analytics.calories')}</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getLatestValue('active_calories')}</div>
                <p className="text-xs text-muted-foreground">{t('analytics.activeCalories')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('analytics.weight')}</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {weightData.length > 0 ? `${weightData[weightData.length - 1].weight} ${t('units.kg')}` : t('analytics.na')}
                </div>
                <p className="text-xs text-muted-foreground">
                  {weightData.length > 1 && (
                    <span className={
                      Number(weightData[weightData.length - 1].weight) > Number(weightData[weightData.length - 2].weight)
                        ? "text-red-600" : "text-green-600"
                    }>
                      {Number(weightData[weightData.length - 1].weight) > Number(weightData[weightData.length - 2].weight) ? "+" : ""}
                      {(Number(weightData[weightData.length - 1].weight) - Number(weightData[weightData.length - 2].weight)).toFixed(1)} {t('units.kg')}
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Графики */}
          <Tabs defaultValue="activity" className="space-y-4">
            <TabsList>
              <TabsTrigger value="activity">{t('analytics.tabs.activity')}</TabsTrigger>
              <TabsTrigger value="health">{t('analytics.tabs.health')}</TabsTrigger>
              <TabsTrigger value="weight">{t('analytics.tabs.weight')}</TabsTrigger>
            </TabsList>

            <TabsContent value="activity">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('analytics.stepsFor30Days')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={stepsData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="steps" stroke="hsl(var(--primary))" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t('analytics.caloriesFor30Days')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={stepsData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="calories" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="health">
              <Card>
                <CardHeader>
                  <CardTitle>{t('analytics.heartRateFor30Days')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={heartRateData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="avg" stroke="hsl(var(--primary))" strokeWidth={2} name={t('analytics.avg')} />
                      <Line type="monotone" dataKey="min" stroke="hsl(var(--muted-foreground))" strokeWidth={1} name={t('analytics.min')} />
                      <Line type="monotone" dataKey="max" stroke="hsl(var(--destructive))" strokeWidth={1} name={t('analytics.max')} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="weight">
              <Card>
                <CardHeader>
                  <CardTitle>{t('analytics.weightDynamics')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={weightData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}