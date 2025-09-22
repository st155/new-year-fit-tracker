import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown, Activity, Heart, Moon, Dumbbell, Calendar, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { HomeButton } from "@/components/ui/home-button";

interface UserMetric {
  id: string;
  metric_name: string;
  metric_category: string;
  unit: string;
  source: string;
  is_active: boolean;
  created_at: string;
}

interface MetricValue {
  id: string;
  value: number;
  measurement_date: string;
  notes?: string;
  photo_url?: string;
  source_data?: any;
  external_id?: string;
  created_at: string;
}

interface MetricWithValues extends UserMetric {
  values: MetricValue[];
  latestValue?: MetricValue;
  trend?: 'up' | 'down' | 'stable';
  changePercent?: number;
}

export default function FitnessData() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [metrics, setMetrics] = useState<MetricWithValues[]>([]);
  const [filteredMetrics, setFilteredMetrics] = useState<MetricWithValues[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedMetric, setSelectedMetric] = useState<MetricWithValues | null>(null);

  useEffect(() => {
    if (user) {
      fetchFitnessData();
    }
  }, [user]);

  useEffect(() => {
    filterMetrics();
  }, [metrics, selectedCategory, selectedSource]);

  const fetchFitnessData = async () => {
    try {
      setLoading(true);
      
      // Получаем все метрики пользователя
      const { data: userMetrics, error: metricsError } = await supabase
        .from('user_metrics')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('metric_name');

      if (metricsError) throw metricsError;

      // Для каждой метрики получаем последние значения
      const metricsWithValues: MetricWithValues[] = [];
      
      for (const metric of userMetrics || []) {
        const { data: values, error: valuesError } = await supabase
          .from('metric_values')
          .select('*')
          .eq('metric_id', metric.id)
          .order('measurement_date', { ascending: false })
          .limit(30);

        if (valuesError) {
          console.error('Error fetching values for metric:', metric.id, valuesError);
          continue;
        }

        if (values && values.length > 0) {
          const sortedValues = values.sort((a, b) => 
            new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime()
          );
          
          const latestValue = values[0];
          const previousValue = values[1];
          
          let trend: 'up' | 'down' | 'stable' = 'stable';
          let changePercent = 0;
          
          if (previousValue) {
            const change = latestValue.value - previousValue.value;
            changePercent = (change / previousValue.value) * 100;
            
            if (Math.abs(changePercent) > 1) {
              trend = change > 0 ? 'up' : 'down';
            }
          }

          metricsWithValues.push({
            ...metric,
            values: sortedValues,
            latestValue,
            trend,
            changePercent
          });
        }
      }

      setMetrics(metricsWithValues);
    } catch (error) {
      console.error('Error fetching fitness data:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить данные фитнеса',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterMetrics = () => {
    let filtered = metrics;
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(metric => metric.metric_category === selectedCategory);
    }
    
    if (selectedSource !== 'all') {
      filtered = filtered.filter(metric => metric.source === selectedSource);
    }
    
    setFilteredMetrics(filtered);
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'whoop': return <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">W</div>;
      case 'withings': return <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center text-white text-xs font-bold">⚖️</div>;
      case 'apple_health': return <div className="w-6 h-6 bg-gray-800 rounded flex items-center justify-center text-white text-xs font-bold">🍎</div>;
      case 'garmin': return <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">G</div>;
      case 'ai_analysis': return <Activity className="w-6 h-6 text-purple-600" />;
      default: return <BarChart3 className="w-6 h-6 text-gray-600" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'recovery': return <Heart className="w-5 h-5 text-green-600" />;
      case 'sleep': return <Moon className="w-5 h-5 text-blue-600" />;
      case 'workout': return <Dumbbell className="w-5 h-5 text-orange-600" />;
      case 'fitness': return <Activity className="w-5 h-5 text-red-600" />;
      case 'health': return <Heart className="w-5 h-5 text-pink-600" />;
      default: return <BarChart3 className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return null;
    }
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === '%') return `${value.toFixed(1)}%`;
    if (unit === 'min') return `${Math.round(value)} мин`;
    if (unit === 'bpm') return `${Math.round(value)} уд/мин`;
    if (unit === 'kg') return `${value.toFixed(1)} кг`;
    if (unit === 'steps') return `${Math.round(value).toLocaleString()} шагов`;
    if (unit === 'kcal') return `${Math.round(value)} ккал`;
    if (unit === 'km') return `${value.toFixed(2)} км`;
    return `${value} ${unit}`;
  };

  const prepareChartData = (values: MetricValue[]) => {
    return values.slice(-14).map(value => ({
      date: new Date(value.measurement_date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
      value: Number(value.value),
      fullDate: value.measurement_date
    }));
  };

  const categories = Array.from(new Set(metrics.map(m => m.metric_category)));
  const sources = Array.from(new Set(metrics.map(m => m.source)));

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка данных фитнеса...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <HomeButton />
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/progress')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Назад к прогрессу
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Данные фитнес-трекеров</h1>
              <p className="text-muted-foreground">
                Полная история всех ваших показателей здоровья и фитнеса
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Категория" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все категории</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(category)}
                    {category}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedSource} onValueChange={setSelectedSource}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Источник" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все источники</SelectItem>
              {sources.map(source => (
                <SelectItem key={source} value={source}>
                  <div className="flex items-center gap-2">
                    {getSourceIcon(source)}
                    {source}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filteredMetrics.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Нет данных фитнеса</h3>
              <p className="text-muted-foreground mb-4">
                Подключите фитнес-трекеры или загрузите скриншоты для автоматического сбора данных
              </p>
              <Button onClick={() => navigate('/progress')}>
                Перейти к настройке интеграций
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Обзор</TabsTrigger>
              <TabsTrigger value="detailed">Детальный анализ</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredMetrics.map((metric) => (
                  <Card 
                    key={metric.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedMetric(metric)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(metric.metric_category)}
                          <span className="font-medium text-sm">{metric.metric_name}</span>
                        </div>
                        {getSourceIcon(metric.source)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold">
                            {metric.latestValue ? formatValue(metric.latestValue.value, metric.unit) : '—'}
                          </span>
                          <div className="flex items-center gap-1">
                            {getTrendIcon(metric.trend)}
                            {metric.changePercent !== undefined && Math.abs(metric.changePercent) > 1 && (
                              <span className={`text-sm ${metric.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                                {metric.changePercent > 0 ? '+' : ''}{metric.changePercent.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>{metric.values.length} записей</span>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {metric.latestValue && 
                              new Date(metric.latestValue.measurement_date).toLocaleDateString('ru-RU')
                            }
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {metric.metric_category}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="detailed" className="space-y-6">
              {selectedMetric ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {getCategoryIcon(selectedMetric.metric_category)}
                          {selectedMetric.metric_name}
                        </CardTitle>
                        <CardDescription>
                          Данные из {selectedMetric.source} • {selectedMetric.values.length} записей
                        </CardDescription>
                      </div>
                      <Button variant="outline" onClick={() => setSelectedMetric(null)}>
                        Закрыть
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* График */}
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={prepareChartData(selectedMetric.values)}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip 
                              formatter={(value: any) => [formatValue(value, selectedMetric.unit), selectedMetric.metric_name]}
                              labelFormatter={(label) => `Дата: ${label}`}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="value" 
                              stroke="hsl(var(--primary))" 
                              strokeWidth={2}
                              dot={{ fill: 'hsl(var(--primary))' }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Последние значения */}
                      <div>
                        <h3 className="font-medium mb-3">Последние измерения</h3>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {selectedMetric.values.slice(0, 10).map((value) => (
                            <div key={value.id} className="flex items-center justify-between p-2 rounded border">
                              <div className="flex items-center gap-3">
                                <span className="font-medium">
                                  {formatValue(value.value, selectedMetric.unit)}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {new Date(value.measurement_date).toLocaleDateString('ru-RU', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </span>
                              </div>
                              {value.notes && (
                                <span className="text-xs text-muted-foreground max-w-xs truncate">
                                  {value.notes}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Выберите метрику для анализа</h3>
                    <p className="text-muted-foreground">
                      Нажмите на любую карточку в обзоре для просмотра детального графика
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}