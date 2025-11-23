import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBiomarkerTrends, useBiomarkerHistory } from '@/hooks/useBiomarkers';
import { BiomarkerTrendChart } from '@/components/biomarkers/BiomarkerTrendChart';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

export default function BiomarkerDetail() {
  const { biomarkerId } = useParams<{ biomarkerId: string }>();
  const navigate = useNavigate();
  
  const { analysis, isLoading: analysisLoading } = useBiomarkerTrends(biomarkerId);
  const { history, isLoading: historyLoading } = useBiomarkerHistory(biomarkerId!);

  if (analysisLoading || historyLoading) {
    return (
      <div className="container mx-auto py-8 px-4 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!analysis || !analysis.success) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <p className="text-muted-foreground">Нет данных для анализа</p>
          <Button onClick={() => navigate('/medical-documents')} variant="outline" className="mt-4">
            Вернуться к документам
          </Button>
        </div>
      </div>
    );
  }

  const { biomarker, statistics, zones, reference_ranges, insights } = analysis;

  const statusColor = 
    statistics.latest < reference_ranges.min ? 'yellow' :
    statistics.latest > reference_ranges.max ? 'red' :
    statistics.latest >= reference_ranges.optimal_min && statistics.latest <= reference_ranges.optimal_max ? 'blue' :
    'green';

  const statusText = 
    statistics.latest < reference_ranges.min ? 'Ниже нормы' :
    statistics.latest > reference_ranges.max ? 'Выше нормы' :
    statistics.latest >= reference_ranges.optimal_min && statistics.latest <= reference_ranges.optimal_max ? 'Оптимально' :
    'Норма';

  const TrendIcon = statistics.trend === 'increasing' ? TrendingUp : statistics.trend === 'decreasing' ? TrendingDown : Minus;

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/medical-documents')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{biomarker.name}</h1>
          <p className="text-muted-foreground capitalize">{biomarker.category}</p>
        </div>
      </div>

      {/* Latest Value Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Последнее значение</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">{statistics.latest}</span>
                <span className="text-lg text-muted-foreground">{biomarker.unit}</span>
                <TrendIcon
                  className={cn(
                    'w-5 h-5 ml-2',
                    statistics.trend === 'increasing' && 'text-green-600',
                    statistics.trend === 'decreasing' && 'text-red-600',
                    statistics.trend === 'stable' && 'text-gray-400'
                  )}
                />
              </div>
            </div>
            <Badge
              variant="outline"
              className={cn(
                'text-lg px-4 py-2',
                statusColor === 'blue' && 'text-blue-600 bg-blue-50 border-blue-200',
                statusColor === 'green' && 'text-green-600 bg-green-50 border-green-200',
                statusColor === 'yellow' && 'text-yellow-600 bg-yellow-50 border-yellow-200',
                statusColor === 'red' && 'text-red-600 bg-red-50 border-red-200'
              )}
            >
              {statusText}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="trend" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trend">Тренд</TabsTrigger>
          <TabsTrigger value="statistics">Статистика</TabsTrigger>
          <TabsTrigger value="history">История</TabsTrigger>
          <TabsTrigger value="about">О показателе</TabsTrigger>
        </TabsList>

        <TabsContent value="trend" className="space-y-6">
          <BiomarkerTrendChart
            data={analysis.history}
            unit={biomarker.unit}
            referenceRanges={reference_ranges}
          />

          {/* AI Insights */}
          {insights && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  AI Анализ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                  {insights}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="statistics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Распределение по зонам</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Ниже нормы</span>
                  <span className="text-sm font-semibold">{zones.below_normal}%</span>
                </div>
                <Progress value={zones.below_normal} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Норма</span>
                  <span className="text-sm font-semibold">{zones.normal}%</span>
                </div>
                <Progress value={zones.normal} className="h-2 [&>div]:bg-green-500" />
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Оптимально</span>
                  <span className="text-sm font-semibold">{zones.optimal}%</span>
                </div>
                <Progress value={zones.optimal} className="h-2 [&>div]:bg-blue-500" />
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Выше нормы</span>
                  <span className="text-sm font-semibold">{zones.above_normal}%</span>
                </div>
                <Progress value={zones.above_normal} className="h-2 [&>div]:bg-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Статистика</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Измерений</p>
                  <p className="text-2xl font-bold">{statistics.count}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Среднее</p>
                  <p className="text-2xl font-bold">{statistics.average}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Минимум</p>
                  <p className="text-2xl font-bold">{statistics.min}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Максимум</p>
                  <p className="text-2xl font-bold">{statistics.max}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {history?.map(result => (
            <Card key={result.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">
                    {format(new Date(result.test_date), 'dd MMMM yyyy', { locale: ru })}
                  </p>
                  {result.laboratory_name && (
                    <p className="text-sm text-muted-foreground">{result.laboratory_name}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{result.normalized_value} {result.normalized_unit}</p>
                  {result.value !== result.normalized_value && (
                    <p className="text-sm text-muted-foreground">
                      (исходно: {result.value} {result.unit})
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="about">
          <Card>
            <CardHeader>
              <CardTitle>О показателе</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Референсные значения</h3>
                <div className="space-y-1 text-sm">
                  <p>Норма: {reference_ranges.min} - {reference_ranges.max} {biomarker.unit}</p>
                  {reference_ranges.optimal_min && reference_ranges.optimal_max && (
                    <p>Оптимально: {reference_ranges.optimal_min} - {reference_ranges.optimal_max} {biomarker.unit}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
