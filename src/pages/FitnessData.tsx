import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Heart, 
  Moon, 
  Dumbbell, 
  Calendar, 
  BarChart3,
  Target,
  Zap,
  Award,
  Filter,
  Download,
  Share,
  Eye,
  Flame,
  Clock,
  Upload,
  Minus,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  Legend
} from 'recharts';
import { format, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';


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
    return values.slice(-30).map(value => ({
      date: new Date(value.measurement_date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
      value: Number(value.value),
      fullDate: value.measurement_date,
      formattedDate: format(new Date(value.measurement_date), 'd MMM', { locale: ru })
    }));
  };

  const getMetricInsight = (metric: MetricWithValues) => {
    if (!metric.latestValue || !metric.changePercent) return null;
    
    const absChange = Math.abs(metric.changePercent);
    if (absChange < 1) return null;

    const isImprovement = (metricName: string, trend: 'up' | 'down' | 'stable') => {
      const improvementOnUp = ['steps', 'recovery', 'sleep', 'vo2max', 'активность'];
      const improvementOnDown = ['вес', 'жир', 'пульс покоя', 'стресс'];
      
      const name = metricName.toLowerCase();
      if (improvementOnUp.some(keyword => name.includes(keyword))) {
        return trend === 'up';
      }
      if (improvementOnDown.some(keyword => name.includes(keyword))) {
        return trend === 'down';
      }
      return trend === 'up'; // По умолчанию
    };

    const improvement = isImprovement(metric.metric_name, metric.trend || 'stable');
    
    return {
      message: improvement 
        ? `Отличная динамика! Рост на ${absChange.toFixed(1)}%` 
        : `Изменение на ${metric.trend === 'up' ? '+' : '-'}${absChange.toFixed(1)}%`,
      type: improvement ? 'positive' : 'neutral'
    };
  };

  const getMetricColor = (category: string) => {
    const colors = {
      'recovery': 'hsl(142, 76%, 36%)',
      'sleep': 'hsl(270, 95%, 60%)',
      'workout': 'hsl(25, 95%, 53%)',
      'fitness': 'hsl(221, 83%, 53%)',
      'health': 'hsl(0, 84%, 60%)',
      'body_composition': 'hsl(142, 76%, 36%)',
      'activity': 'hsl(221, 83%, 53%)'
    };
    return colors[category as keyof typeof colors] || 'hsl(var(--primary))';
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
      <div className="container mx-auto px-3 py-3 max-w-7xl">
        {/* Compact Header */}
        <div className="mb-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/progress')}
            className="flex items-center gap-1 mb-2 h-8 px-2"
          >
            <ArrowLeft className="h-3 w-3" />
            <span className="text-xs">Назад к прогрессу</span>
          </Button>
          <div>
            <h1 className="text-xl font-bold">Данные фитнес-трекеров</h1>
            <p className="text-xs text-muted-foreground">
              Полная история всех ваших показателей здоровья и фитнеса
            </p>
          </div>
        </div>

        {/* Compact Filters */}
        <div className="flex gap-2 mb-3">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-8 text-xs w-40">
              <SelectValue placeholder="Категория" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все категории</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(category)}
                    <span className="text-xs">{category}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedSource} onValueChange={setSelectedSource}>
            <SelectTrigger className="h-8 text-xs w-40">
              <SelectValue placeholder="Источник" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все источники</SelectItem>
              {sources.map(source => (
                <SelectItem key={source} value={source}>
                  <div className="flex items-center gap-2">
                    {getSourceIcon(source)}
                    <span className="text-xs">{source}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filteredMetrics.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="text-center py-8">
              <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-base font-semibold mb-2">Нет данных фитнеса</h3>
              <p className="text-xs text-muted-foreground mb-4 max-w-md mx-auto">
                Подключите фитнес-трекеры или загрузите скриншоты для автоматического сбора и анализа ваших данных
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => navigate('/integrations')} className="gap-1.5 h-8 text-xs">
                  <Target className="w-3 h-3" />
                  Подключить трекер
                </Button>
                <Button variant="outline" onClick={() => navigate('/progress')} className="gap-1.5 h-8 text-xs">
                  <Upload className="w-3 h-3" />
                  Загрузить данные
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="overview" className="space-y-3">
            <TabsList className="grid w-full grid-cols-4 h-8">
              <TabsTrigger value="overview" className="gap-1 text-xs h-7">
                <BarChart3 className="w-3 h-3" />
                Обзор
              </TabsTrigger>
              <TabsTrigger value="detailed" className="gap-1 text-xs h-7">
                <Eye className="w-3 h-3" />
                Детальный анализ
              </TabsTrigger>
              <TabsTrigger value="insights" className="gap-1 text-xs h-7">
                <Award className="w-3 h-3" />
                Инсайты
              </TabsTrigger>
              <TabsTrigger value="comparison" className="gap-1 text-xs h-7">
                <Target className="w-3 h-3" />
                Сравнение
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-3">
              {/* Компактная статистика по категориям */}
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                {Array.from(new Set(filteredMetrics.map(m => m.metric_category))).map(category => {
                  const categoryMetrics = filteredMetrics.filter(m => m.metric_category === category);
                  const avgTrend = categoryMetrics.reduce((sum, m) => sum + (m.changePercent || 0), 0) / categoryMetrics.length;
                  
                  return (
                    <Card key={category} className="relative overflow-hidden">
                      <div 
                        className="absolute inset-0 opacity-5"
                        style={{ backgroundColor: getMetricColor(category) }}
                      />
                      <CardHeader className="p-3 pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {getCategoryIcon(category)}
                            <CardTitle className="text-xs capitalize">{category}</CardTitle>
                          </div>
                          <Badge variant={avgTrend > 0 ? "default" : avgTrend < 0 ? "destructive" : "secondary"} className="h-5 text-[10px]">
                            {avgTrend > 0 ? '+' : ''}{avgTrend.toFixed(1)}%
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <div className="space-y-1">
                          <div className="text-xl font-bold">{categoryMetrics.length}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {categoryMetrics.length === 1 ? 'метрика' : 'метрики'}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Обновлено: {categoryMetrics[0]?.latestValue && 
                              format(new Date(categoryMetrics[0].latestValue.measurement_date), 'd MMM', { locale: ru })
                            }
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Компактная сетка метрик */}
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {filteredMetrics.map((metric) => {
                  const insight = getMetricInsight(metric);
                  const color = getMetricColor(metric.metric_category);
                  
                  return (
                    <Card 
                      key={metric.id}
                      className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.01] group relative overflow-hidden"
                      onClick={() => setSelectedMetric(metric)}
                    >
                      <div 
                        className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-200"
                        style={{ backgroundColor: color }}
                      />
                      
                      <CardHeader className="p-3 pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div style={{ color }}>{getCategoryIcon(metric.metric_category)}</div>
                            <div>
                              <span className="font-semibold text-xs">{metric.metric_name}</span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {getSourceIcon(metric.source)}
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                  {metric.metric_category}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            {getTrendIcon(metric.trend)}
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-2 p-3 pt-0">
                        <div className="flex items-baseline justify-between">
                          <div>
                            <span className="text-2xl font-bold">
                              {metric.latestValue ? formatValue(metric.latestValue.value, metric.unit) : '—'}
                            </span>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              Последнее значение
                            </div>
                          </div>
                          
                          {metric.changePercent !== undefined && Math.abs(metric.changePercent) > 1 && (
                            <div className="text-right">
                              <Badge 
                                variant={metric.trend === 'up' ? "default" : metric.trend === 'down' ? "destructive" : "secondary"}
                                className="text-[10px] h-4"
                              >
                                {metric.changePercent > 0 ? '+' : ''}{metric.changePercent.toFixed(1)}%
                              </Badge>
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                изменение
                              </div>
                            </div>
                          )}
                        </div>

                        {insight && (
                          <div className={`text-[10px] p-1.5 rounded-md ${
                            insight.type === 'positive' 
                              ? 'bg-success/10 text-success-foreground border border-success/20' 
                              : 'bg-accent/10 text-accent-foreground border border-accent/20'
                          }`}>
                            {insight.message}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <BarChart3 className="w-3 h-3" />
                            <span>{metric.values.length} записей</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {metric.latestValue && 
                              format(new Date(metric.latestValue.measurement_date), 'd MMM', { locale: ru })
                            }
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="detailed" className="space-y-6">
              {selectedMetric ? (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div 
                            className="p-3 rounded-lg"
                            style={{ backgroundColor: `${getMetricColor(selectedMetric.metric_category)}20` }}
                          >
                            <div style={{ color: getMetricColor(selectedMetric.metric_category) }}>
                              {getCategoryIcon(selectedMetric.metric_category)}
                            </div>
                          </div>
                          <div>
                            <CardTitle className="text-xl">{selectedMetric.metric_name}</CardTitle>
                            <CardDescription className="flex items-center gap-4 mt-1">
                              <span>Источник: {selectedMetric.source}</span>
                              <span>•</span>
                              <span>{selectedMetric.values.length} записей</span>
                              <span>•</span>
                              <span className="capitalize">{selectedMetric.metric_category}</span>
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="gap-2">
                            <Download className="w-4 h-4" />
                            Экспорт
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setSelectedMetric(null)}>
                            Закрыть
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>

                  {/* Статистика метрики */}
                  <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold">
                          {selectedMetric.latestValue ? formatValue(selectedMetric.latestValue.value, selectedMetric.unit) : '—'}
                        </div>
                        <div className="text-sm text-muted-foreground">Текущее значение</div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold">
                          {formatValue(
                            selectedMetric.values.reduce((sum, v) => sum + v.value, 0) / selectedMetric.values.length,
                            selectedMetric.unit
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">Среднее значение</div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold">
                          {formatValue(Math.max(...selectedMetric.values.map(v => v.value)), selectedMetric.unit)}
                        </div>
                        <div className="text-sm text-muted-foreground">Максимум</div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold">
                          {formatValue(Math.min(...selectedMetric.values.map(v => v.value)), selectedMetric.unit)}
                        </div>
                        <div className="text-sm text-muted-foreground">Минимум</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Улучшенный график */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Динамика изменений</CardTitle>
                      <CardDescription>
                        График показывает изменения {selectedMetric.metric_name.toLowerCase()} за последние {selectedMetric.values.length} записей
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={prepareChartData(selectedMetric.values)}>
                            <defs>
                              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={getMetricColor(selectedMetric.metric_category)} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={getMetricColor(selectedMetric.metric_category)} stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis 
                              dataKey="formattedDate" 
                              tick={{ fontSize: 12 }}
                              stroke="hsl(var(--muted-foreground))"
                            />
                            <YAxis 
                              tick={{ fontSize: 12 }}
                              stroke="hsl(var(--muted-foreground))"
                            />
                            <Tooltip 
                              formatter={(value: any) => [formatValue(value, selectedMetric.unit), selectedMetric.metric_name]}
                              labelFormatter={(label) => `Дата: ${label}`}
                              contentStyle={{
                                backgroundColor: 'hsl(var(--popover))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '6px'
                              }}
                            />
                            <Area
                              type="monotone" 
                              dataKey="value" 
                              stroke={getMetricColor(selectedMetric.metric_category)}
                              strokeWidth={3}
                              fill="url(#colorGradient)"
                              dot={{ 
                                fill: getMetricColor(selectedMetric.metric_category), 
                                strokeWidth: 2, 
                                r: 4 
                              }}
                              activeDot={{ 
                                r: 6, 
                                fill: getMetricColor(selectedMetric.metric_category) 
                              }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* История изменений */}
                  <Card>
                    <CardHeader>
                      <CardTitle>История измерений</CardTitle>
                      <CardDescription>
                        Все записи {selectedMetric.metric_name.toLowerCase()} в хронологическом порядке
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {selectedMetric.values.map((value, index) => {
                          const prevValue = selectedMetric.values[index + 1];
                          const change = prevValue ? ((value.value - prevValue.value) / prevValue.value) * 100 : null;
                          
                          return (
                            <div key={value.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                              <div className="flex items-center gap-4">
                                <div className="text-center min-w-[80px]">
                                  <div className="font-semibold">
                                    {formatValue(value.value, selectedMetric.unit)}
                                  </div>
                                  {change !== null && Math.abs(change) > 1 && (
                                    <Badge 
                                      variant={change > 0 ? "default" : "destructive"}
                                      className="text-xs mt-1"
                                    >
                                      {change > 0 ? '+' : ''}{change.toFixed(1)}%
                                    </Badge>
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium">
                                    {format(new Date(value.measurement_date), 'd MMMM yyyy', { locale: ru })}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {format(new Date(value.measurement_date), 'EEEE', { locale: ru })}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="text-right">
                                {value.notes && (
                                  <div className="text-sm text-muted-foreground max-w-xs truncate">
                                    📝 {value.notes}
                                  </div>
                                )}
                                <div className="text-xs text-muted-foreground">
                                  {format(new Date(value.created_at), 'HH:mm')}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
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