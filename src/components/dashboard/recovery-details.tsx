import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Heart, Battery, Moon, Zap, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

const getDateLocale = (lang: string) => lang === 'ru' ? ru : enUS;

interface RecoveryData {
  recovery_score: number | null;
  hrv: number | null;
  resting_hr: number | null;
  sleep_score: number | null;
  date: string;
}

interface RecoveryDetailsProps {
  selectedDate: Date;
}

export const RecoveryDetails = ({ selectedDate }: RecoveryDetailsProps) => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation('dashboard');
  const dateLocale = getDateLocale(i18n.language);
  const [recoveryData, setRecoveryData] = useState<RecoveryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRecoveryData();
    }
  }, [user, selectedDate]);

  const fetchRecoveryData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Получаем данные за последние 7 дней
      const endDate = format(selectedDate, 'yyyy-MM-dd');
      const startDate = format(new Date(selectedDate.getTime() - 6 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

      const { data } = await supabase
        .from('metric_values')
        .select(`
          value,
          measurement_date,
          user_metrics!inner (
            metric_name,
            metric_category
          )
        `)
        .eq('user_id', user.id)
        .gte('measurement_date', startDate)
        .lte('measurement_date', endDate)
        .in('user_metrics.metric_name', ['Recovery Score', 'HRV', 'HRV RMSSD', 'Resting Heart Rate', 'Sleep Performance', 'Sleep Efficiency'])
        .order('measurement_date', { ascending: false });

      // Группируем данные по датам
      const groupedData: { [key: string]: Partial<RecoveryData> } = {};
      
      data?.forEach((item: any) => {
        const date = item.measurement_date;
        if (!groupedData[date]) {
          groupedData[date] = { date };
        }

        switch (item.user_metrics.metric_name) {
          case 'Recovery Score':
            groupedData[date].recovery_score = item.value;
            break;
          case 'HRV':
          case 'HRV RMSSD':
            groupedData[date].hrv = item.value;
            break;
          case 'Resting Heart Rate':
            groupedData[date].resting_hr = item.value;
            break;
          case 'Sleep Performance':
          case 'Sleep Efficiency':
            groupedData[date].sleep_score = item.value;
            break;
        }
      });

      const formattedData = Object.values(groupedData) as RecoveryData[];
      const sortedData = formattedData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // Если Recovery Score за сегодня нет, берём последнее значение за 24 часа
      const todayStr = format(selectedDate, 'yyyy-MM-dd');
      const todayData = sortedData.find(d => d.date === todayStr);
      
      if (todayData && !todayData.recovery_score && sortedData.length > 0) {
        // Ищем последний Recovery Score за последние записи
        const lastRecovery = sortedData.find(d => d.recovery_score !== null && d.recovery_score !== undefined);
        if (lastRecovery) {
          todayData.recovery_score = lastRecovery.recovery_score;
        }
      }
      
      setRecoveryData(sortedData);
    } catch (error) {
      console.error('Error fetching recovery data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRecoveryStatus = (score: number | null) => {
    if (!score) return { label: t('recovery.noData'), color: 'secondary' };
    if (score >= 75) return { label: t('recovery.excellent'), color: 'success' };
    if (score >= 50) return { label: t('recovery.good'), color: 'warning' };
    return { label: t('recovery.needsRest'), color: 'destructive' };
  };

  const getTrend = (current: number | null, previous: number | null) => {
    if (!current || !previous) return null;
    const change = current - previous;
    if (Math.abs(change) < 2) return null;
    return change > 0 ? 'up' : 'down';
  };

  if (loading) {
    return <div className="text-center py-8">{t('recovery.loading')}</div>;
  }

  const todayData = recoveryData[0];
  const yesterdayData = recoveryData[1];

  return (
    <div className="space-y-6">
      {/* Основные показатели восстановления */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">{t('recovery.score')}</CardTitle>
              <Heart className="h-4 w-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {todayData?.recovery_score ? Math.round(todayData.recovery_score) : '—'}
                </span>
                {getTrend(todayData?.recovery_score, yesterdayData?.recovery_score) && (
                  getTrend(todayData?.recovery_score, yesterdayData?.recovery_score) === 'up' ? 
                    <TrendingUp className="h-4 w-4 text-green-500" /> :
                    <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </div>
              <Progress value={todayData?.recovery_score || 0} autoColor className="h-2" />
              <Badge variant={getRecoveryStatus(todayData?.recovery_score).color === 'success' ? 'default' : getRecoveryStatus(todayData?.recovery_score).color as any}>
                {getRecoveryStatus(todayData?.recovery_score).label}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">{t('recovery.hrv')}</CardTitle>
              <Battery className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {todayData?.hrv ? Math.round(todayData.hrv) : '—'}
                </span>
                {getTrend(todayData?.hrv, yesterdayData?.hrv) && (
                  getTrend(todayData?.hrv, yesterdayData?.hrv) === 'up' ? 
                    <TrendingUp className="h-4 w-4 text-green-500" /> :
                    <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">{t('units.ms')}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">{t('recovery.restingHr')}</CardTitle>
              <Heart className="h-4 w-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {todayData?.resting_hr ? Math.round(todayData.resting_hr) : '—'}
                </span>
                {getTrend(todayData?.resting_hr, yesterdayData?.resting_hr) && (
                  getTrend(todayData?.resting_hr, yesterdayData?.resting_hr) === 'down' ? 
                    <TrendingUp className="h-4 w-4 text-green-500" /> :
                    <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">{t('units.bpm')}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">{t('recovery.sleepQuality')}</CardTitle>
              <Moon className="h-4 w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {todayData?.sleep_score ? Math.round(todayData.sleep_score) : '—'}
                </span>
                {getTrend(todayData?.sleep_score, yesterdayData?.sleep_score) && (
                  getTrend(todayData?.sleep_score, yesterdayData?.sleep_score) === 'up' ? 
                    <TrendingUp className="h-4 w-4 text-green-500" /> :
                    <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </div>
              <Progress value={todayData?.sleep_score || 0} autoColor className="h-2" />
              <p className="text-xs text-muted-foreground">%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* История восстановления */}
      <Card>
        <CardHeader>
          <CardTitle>{t('recovery.history')}</CardTitle>
          <CardDescription>
            {t('recovery.historyDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recoveryData.map((data, index) => (
              <div key={data.date} className="flex items-center justify-between py-3 border-b last:border-b-0">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium min-w-[100px]">
                    {format(new Date(data.date), 'd MMM', { locale: dateLocale })}
                  </div>
                  <div className="flex items-center gap-4">
                    {data.recovery_score && (
                      <div className="flex items-center gap-2">
                        <Heart className="h-3 w-3 text-red-500" />
                        <span className="text-sm">{Math.round(data.recovery_score)}%</span>
                      </div>
                    )}
                    {data.hrv && (
                      <div className="flex items-center gap-2">
                        <Battery className="h-3 w-3 text-blue-500" />
                        <span className="text-sm">{Math.round(data.hrv)} {t('units.ms')}</span>
                      </div>
                    )}
                    {data.resting_hr && (
                      <div className="flex items-center gap-2">
                        <Heart className="h-3 w-3 text-gray-500" />
                        <span className="text-sm">{Math.round(data.resting_hr)} bpm</span>
                      </div>
                    )}
                  </div>
                </div>
                <Badge variant={getRecoveryStatus(data.recovery_score).color === 'success' ? 'default' : getRecoveryStatus(data.recovery_score).color as any} className="text-xs">
                  {getRecoveryStatus(data.recovery_score).label}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};