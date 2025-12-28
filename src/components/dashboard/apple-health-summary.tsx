import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Activity, Heart, Weight, Footprints, Moon, Flame } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

interface DailyHealthSummary {
  id: string;
  date: string;
  steps: number | null;
  vo2_max: number | null;
  weight: number | null;
  heart_rate_avg: number | null;
  heart_rate_min: number | null;
  heart_rate_max: number | null;
  sleep_hours: number | null;
  active_calories: number | null;
  resting_calories: number | null;
  exercise_minutes: number | null;
  distance_km: number | null;
  source_data: any;
  created_at: string;
}

interface HealthRecordsSummary {
  total_records: number;
  date_range: {
    earliest: string;
    latest: string;
  };
  record_types: string[];
}

export function AppleHealthSummary() {
  const { t, i18n } = useTranslation('dashboard');
  const { user } = useAuth();
  const [dailySummaries, setDailySummaries] = useState<DailyHealthSummary[]>([]);
  const [recordsSummary, setRecordsSummary] = useState<HealthRecordsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('7d');

  const dateLocale = i18n.language === 'ru' ? ru : enUS;

  useEffect(() => {
    if (user) {
      fetchHealthData();
    }
  }, [user, selectedPeriod]);

  const fetchHealthData = async () => {
    try {
      setLoading(true);
      
      // Вычисляем дату начала периода
      const daysBack = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      
      // Получаем агрегированные данные по дням
      const { data: summaries, error: summariesError } = await supabase
        .from('daily_health_summary')
        .select('*')
        .eq('user_id', user?.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (summariesError) {
        console.error('Error fetching daily summaries:', summariesError);
      } else {
        setDailySummaries(summaries || []);
      }

      // Получаем общую сводку по записям
      const { data: recordsCount, error: recordsError } = await supabase
        .from('health_records')
        .select('record_type, start_date')
        .eq('user_id', user?.id)
        .order('start_date', { ascending: false });

      if (recordsError) {
        console.error('Error fetching records summary:', recordsError);
      } else if (recordsCount && recordsCount.length > 0) {
        const uniqueTypes = [...new Set(recordsCount.map(r => r.record_type))];
        const dates = recordsCount.map(r => new Date(r.start_date)).sort();
        
        setRecordsSummary({
          total_records: recordsCount.length,
          date_range: {
            earliest: dates[0]?.toISOString() || '',
            latest: dates[dates.length - 1]?.toISOString() || ''
          },
          record_types: uniqueTypes
        });
      }

    } catch (error) {
      console.error('Error fetching health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMetricIcon = (type: string) => {
    switch (type) {
      case 'steps': return <Footprints className="h-4 w-4" />;
      case 'heart_rate': return <Heart className="h-4 w-4" />;
      case 'weight': return <Weight className="h-4 w-4" />;
      case 'vo2_max': return <Activity className="h-4 w-4" />;
      case 'sleep': return <Moon className="h-4 w-4" />;
      case 'calories': return <Flame className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const formatHealthRecordType = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'HKQuantityTypeIdentifierStepCount': t('appleHealth.types.steps'),
      'HKQuantityTypeIdentifierVO2Max': t('appleHealth.types.vo2max'),
      'HKQuantityTypeIdentifierBodyMass': t('appleHealth.types.weight'),
      'HKQuantityTypeIdentifierHeartRate': t('appleHealth.types.heartRate'),
      'HKQuantityTypeIdentifierActiveEnergyBurned': t('appleHealth.types.activeCalories'),
      'HKQuantityTypeIdentifierBasalEnergyBurned': t('appleHealth.types.basalCalories'),
      'HKQuantityTypeIdentifierAppleExerciseTime': t('appleHealth.types.exerciseTime'),
      'HKQuantityTypeIdentifierDistanceWalkingRunning': t('appleHealth.types.distance'),
      'HKCategoryTypeIdentifierSleepAnalysis': t('appleHealth.types.sleepAnalysis')
    };
    return typeMap[type] || type;
  };

  const calculateAverage = (values: (number | null)[]) => {
    const validValues = values.filter(v => v !== null) as number[];
    return validValues.length > 0 ? validValues.reduce((a, b) => a + b, 0) / validValues.length : 0;
  };

  const latestSummary = dailySummaries[0];
  const avgSteps = Math.round(calculateAverage(dailySummaries.map(s => s.steps)));
  const avgWeight = calculateAverage(dailySummaries.map(s => s.weight));
  const avgHeartRate = Math.round(calculateAverage(dailySummaries.map(s => s.heart_rate_avg)));

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">{t('appleHealth.loading')}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!recordsSummary || dailySummaries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🍎 Apple Health
          </CardTitle>
          <CardDescription>
            {t('appleHealth.noData')}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🍎 {t('appleHealth.dashboard')}
          </CardTitle>
          <CardDescription>
            {t('appleHealth.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{recordsSummary.total_records.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">{t('appleHealth.totalRecords')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{recordsSummary.record_types.length}</div>
              <div className="text-sm text-muted-foreground">{t('appleHealth.dataTypes')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{dailySummaries.length}</div>
              <div className="text-sm text-muted-foreground">{t('appleHealth.daysOfData')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {recordsSummary.date_range.latest ? 
                  formatDistanceToNow(new Date(recordsSummary.date_range.latest), { 
                    addSuffix: true, 
                    locale: dateLocale 
                  }) : 'N/A'}
              </div>
              <div className="text-sm text-muted-foreground">{t('appleHealth.lastUpdate')}</div>
            </div>
          </div>

          <Tabs value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="7d">{t('appleHealth.days7')}</TabsTrigger>
              <TabsTrigger value="30d">{t('appleHealth.days30')}</TabsTrigger>
              <TabsTrigger value="90d">{t('appleHealth.days90')}</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedPeriod} className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Шаги */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      {getMetricIcon('steps')}
                      {t('appleHealth.metrics.steps')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-1">
                      {latestSummary?.steps?.toLocaleString() || '—'}
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {t('appleHealth.average')}: {avgSteps.toLocaleString()} {t('appleHealth.stepsUnit')}
                    </div>
                    {latestSummary?.steps && (
                      <Progress value={Math.min((latestSummary.steps / 10000) * 100, 100)} className="h-2" />
                    )}
                  </CardContent>
                </Card>

                {/* Пульс */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      {getMetricIcon('heart_rate')}
                      {t('appleHealth.metrics.heartRate')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-1">
                      {latestSummary?.heart_rate_avg?.toFixed(0) || '—'} 
                      {latestSummary?.heart_rate_avg && <span className="text-sm"> {t('appleHealth.bpm')}</span>}
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {t('appleHealth.average')}: {avgHeartRate} {t('appleHealth.bpm')}
                    </div>
                    {latestSummary?.heart_rate_min && latestSummary?.heart_rate_max && (
                      <div className="text-xs text-muted-foreground">
                        {t('appleHealth.range')}: {latestSummary.heart_rate_min}—{latestSummary.heart_rate_max}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Вес */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      {getMetricIcon('weight')}
                      {t('appleHealth.metrics.weight')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-1">
                      {latestSummary?.weight?.toFixed(1) || '—'}
                      {latestSummary?.weight && <span className="text-sm"> {t('appleHealth.kg')}</span>}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t('appleHealth.average')}: {avgWeight.toFixed(1)} {t('appleHealth.kg')}
                    </div>
                  </CardContent>
                </Card>

                {/* VO2 Max */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      {getMetricIcon('vo2_max')}
                      VO2 Max
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-1">
                      {latestSummary?.vo2_max?.toFixed(1) || '—'}
                      {latestSummary?.vo2_max && <span className="text-sm"> {t('appleHealth.vo2unit')}</span>}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t('appleHealth.cardioFitness')}
                    </div>
                  </CardContent>
                </Card>

                {/* Сон */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      {getMetricIcon('sleep')}
                      {t('appleHealth.metrics.sleep')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-1">
                      {latestSummary?.sleep_hours?.toFixed(1) || '—'}
                      {latestSummary?.sleep_hours && <span className="text-sm"> {t('appleHealth.hours')}</span>}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t('appleHealth.sleepTime')}
                    </div>
                  </CardContent>
                </Card>

                {/* Калории */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      {getMetricIcon('calories')}
                      {t('appleHealth.metrics.calories')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-1">
                      {latestSummary?.active_calories || '—'}
                      {latestSummary?.active_calories && <span className="text-sm"> {t('appleHealth.kcal')}</span>}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t('appleHealth.activeCalories')}
                    </div>
                    {latestSummary?.resting_calories && (
                      <div className="text-xs text-muted-foreground">
                        {t('appleHealth.basalCalories')}: {latestSummary.resting_calories} {t('appleHealth.kcal')}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Список типов данных */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-sm">{t('appleHealth.availableTypes')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {recordsSummary.record_types.map((type) => (
                      <Badge key={type} variant="secondary" className="text-xs">
                        {formatHealthRecordType(type)}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
