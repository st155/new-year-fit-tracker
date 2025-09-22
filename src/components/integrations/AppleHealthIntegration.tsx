import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AppleHealthUpload } from './AppleHealthUpload';
import { 
  Heart, 
  Activity, 
  Moon, 
  Scale, 
  Footprints, 
  Zap,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Database,
  Calendar,
  TrendingUp
} from 'lucide-react';

interface AppleHealthIntegrationProps {
  userId: string;
}

interface HealthData {
  totalRecords: number;
  lastSync?: string;
  recordTypes: { [key: string]: number };
  dateRange?: {
    earliest: string;
    latest: string;
  };
}

interface RecentMetrics {
  steps?: { value: number; date: string };
  heartRate?: { value: number; date: string };
  weight?: { value: number; date: string };
  sleep?: { value: number; date: string };
  activeCalories?: { value: number; date: string };
  restingCalories?: { value: number; date: string };
}

export function AppleHealthIntegration({ userId }: AppleHealthIntegrationProps) {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [recentMetrics, setRecentMetrics] = useState<RecentMetrics>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadHealthData();
  }, [userId]);

  const loadHealthData = async () => {
    try {
      setIsLoading(true);
      
      // Загружаем общую статистику по здоровью
      const { data: healthRecords, error: healthError } = await supabase
        .from('health_records')
        .select('record_type, start_date, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (healthError) throw healthError;

      // Анализируем данные
      if (healthRecords && healthRecords.length > 0) {
        const recordTypes: { [key: string]: number } = {};
        let earliest = healthRecords[healthRecords.length - 1].start_date;
        let latest = healthRecords[0].start_date;
        let lastSync = healthRecords[0].created_at;

        healthRecords.forEach(record => {
          recordTypes[record.record_type] = (recordTypes[record.record_type] || 0) + 1;
          if (record.start_date < earliest) earliest = record.start_date;
          if (record.start_date > latest) latest = record.start_date;
          if (record.created_at > lastSync) lastSync = record.created_at;
        });

        setHealthData({
          totalRecords: healthRecords.length,
          lastSync,
          recordTypes,
          dateRange: { earliest, latest }
        });
      } else {
        setHealthData({
          totalRecords: 0,
          recordTypes: {}
        });
      }

      // Загружаем последние метрики
      await loadRecentMetrics();

    } catch (error: any) {
      console.error('Error loading health data:', error);
      toast({
        title: 'Ошибка загрузки',
        description: 'Не удалось загрузить данные Apple Health.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecentMetrics = async () => {
    try {
      // Получаем последние значения ключевых метрик
      const metrics = [
        { type: 'HKQuantityTypeIdentifierStepCount', key: 'steps' },
        { type: 'HKQuantityTypeIdentifierHeartRate', key: 'heartRate' },
        { type: 'HKQuantityTypeIdentifierBodyMass', key: 'weight' },
        { type: 'HKCategoryTypeIdentifierSleepAnalysis', key: 'sleep' },
        { type: 'HKQuantityTypeIdentifierActiveEnergyBurned', key: 'activeCalories' },
        { type: 'HKQuantityTypeIdentifierBasalEnergyBurned', key: 'restingCalories' }
      ];

      const recentData: RecentMetrics = {};

      for (const metric of metrics) {
        const { data } = await supabase
          .from('health_records')
          .select('value, start_date')
          .eq('user_id', userId)
          .eq('record_type', metric.type)
          .order('start_date', { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          (recentData as any)[metric.key] = {
            value: data[0].value,
            date: data[0].start_date
          };
        }
      }

      setRecentMetrics(recentData);
    } catch (error) {
      console.error('Error loading recent metrics:', error);
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    await loadHealthData();
    setIsRefreshing(false);
    toast({
      title: 'Данные обновлены',
      description: 'Статистика Apple Health успешно обновлена.',
    });
  };

  const handleUploadComplete = async (data: any) => {
    await loadHealthData();
    toast({
      title: 'Импорт завершен',
      description: 'Данные Apple Health успешно импортированы и готовы к использованию.',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getMetricIcon = (type: string) => {
    switch (type) {
      case 'steps': return <Footprints className="h-4 w-4" />;
      case 'heartRate': return <Heart className="h-4 w-4" />;
      case 'weight': return <Scale className="h-4 w-4" />;
      case 'sleep': return <Moon className="h-4 w-4" />;
      case 'activeCalories':
      case 'restingCalories': 
        return <Zap className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getMetricUnit = (type: string) => {
    switch (type) {
      case 'steps': return 'шагов';
      case 'heartRate': return 'уд/мин';
      case 'weight': return 'кг';
      case 'sleep': return 'ч';
      case 'activeCalories':
      case 'restingCalories': 
        return 'ккал';
      default: return '';
    }
  };

  const getMetricName = (type: string) => {
    switch (type) {
      case 'steps': return 'Шаги';
      case 'heartRate': return 'Пульс';
      case 'weight': return 'Вес';
      case 'sleep': return 'Сон';
      case 'activeCalories': return 'Активные ккал';
      case 'restingCalories': return 'Базовые ккал';
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Загрузка данных Apple Health...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">🍎</span>
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Apple Health Integration
                  {healthData && healthData.totalRecords > 0 && (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Подключено
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {healthData && healthData.totalRecords > 0 
                    ? `${healthData.totalRecords.toLocaleString()} записей • Последний импорт: ${healthData.lastSync ? formatDate(healthData.lastSync) : 'Никогда'}`
                    : 'Импортируйте данные из приложения "Здоровье" на iPhone'
                  }
                </CardDescription>
              </div>
            </div>
            
            {healthData && healthData.totalRecords > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={refreshData}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Обновить
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {healthData && healthData.totalRecords > 0 ? (
            <>
              {/* Статистика импорта */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-blue-900">Всего записей</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-800">
                    {healthData.totalRecords.toLocaleString()}
                  </p>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-900">Типов данных</span>
                  </div>
                  <p className="text-2xl font-bold text-green-800">
                    {Object.keys(healthData.recordTypes).length}
                  </p>
                </div>
                
                {healthData.dateRange && (
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-5 w-5 text-purple-600" />
                      <span className="font-medium text-purple-900">Период данных</span>
                    </div>
                    <p className="text-sm text-purple-800">
                      {formatDate(healthData.dateRange.earliest)} — {formatDate(healthData.dateRange.latest)}
                    </p>
                  </div>
                )}
              </div>

              {/* Последние метрики */}
              {Object.keys(recentMetrics).length > 0 && (
                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Последние показатели
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {Object.entries(recentMetrics).map(([key, data]) => {
                      if (!data) return null;
                      return (
                        <div key={key} className="p-3 bg-muted/50 rounded-lg border">
                          <div className="flex items-center gap-2 mb-1">
                            {getMetricIcon(key)}
                            <span className="text-xs font-medium">{getMetricName(key)}</span>
                          </div>
                          <p className="text-lg font-bold">
                            {typeof data.value === 'number' ? data.value.toLocaleString() : data.value}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {getMetricUnit(key)} • {formatDate(data.date)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Топ типов данных */}
              <div>
                <h3 className="font-medium mb-3">Топ типов данных</h3>
                <div className="space-y-2">
                  {Object.entries(healthData.recordTypes)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                        <span className="text-sm font-medium truncate flex-1">{type}</span>
                        <Badge variant="secondary">{count.toLocaleString()}</Badge>
                      </div>
                    ))}
                </div>
              </div>
            </>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Данные Apple Health не найдены</strong>
                <br />
                Загрузите экспорт данных из приложения "Здоровье" для автоматического импорта ваших показателей здоровья.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Компонент загрузки */}
      <AppleHealthUpload onUploadComplete={handleUploadComplete} />
    </div>
  );
}