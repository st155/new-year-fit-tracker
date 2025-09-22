import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppleHealthParser } from '@/lib/apple-health-parser';
import type { ParsedHealthData } from '@/lib/apple-health-parser';
import { 
  Upload, 
  FileUp, 
  CheckCircle, 
  AlertCircle,
  Activity,
  Heart,
  Moon,
  TrendingUp,
  Calendar,
  Info,
  Loader2,
  Download,
  Smartphone,
  X
} from 'lucide-react';

interface ProcessingStatus {
  stage: 'idle' | 'uploading' | 'parsing' | 'saving' | 'complete' | 'error';
  progress: number;
  message: string;
  details?: {
    recordsProcessed?: number;
    totalRecords?: number;
    workoutsProcessed?: number;
    metricsFound?: string[];
  };
}

export const AppleHealthIntegration = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>({
    stage: 'idle',
    progress: 0,
    message: ''
  });
  const [parsedData, setParsedData] = useState<ParsedHealthData | null>(null);
  const [statistics, setStatistics] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Обработка drag & drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.zip')) {
        setSelectedFile(file);
      } else {
        toast({
          title: 'Неверный формат файла',
          description: 'Загрузите ZIP-архив экспорта Apple Health',
          variant: 'destructive'
        });
      }
    }
  }, [toast]);

  // Выбор файла
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.zip')) {
        toast({
          title: 'Неверный формат файла',
          description: 'Загрузите ZIP-архив экспорта Apple Health',
          variant: 'destructive'
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  // Обработка файла
  const processFile = async () => {
    if (!selectedFile || !user) return;

    try {
      // Этап 1: Парсинг
      setStatus({
        stage: 'parsing',
        progress: 20,
        message: 'Распаковка и анализ данных...'
      });

      const parser = new AppleHealthParser();
      const data = await parser.parseHealthExport(selectedFile);
      setParsedData(data);

      const stats = parser.getStatistics(data);
      setStatistics(stats);

      setStatus({
        stage: 'parsing',
        progress: 50,
        message: `Найдено ${stats.totalRecords} записей и ${stats.totalWorkouts} тренировок`,
        details: {
          totalRecords: stats.totalRecords,
          workoutsProcessed: stats.totalWorkouts,
          metricsFound: stats.metrics.slice(0, 5).map((m: any) => m.name)
        }
      });

      // Этап 2: Сохранение в БД
      setStatus({
        stage: 'saving',
        progress: 70,
        message: 'Сохранение данных в базу...'
      });

      const metrics = parser.convertToMetrics(data, user.id);
      const workouts = parser.convertToWorkouts(data, user.id);
      const summaries = parser.convertToActivitySummaries(data, user.id);
      
      console.log('Converted data for DB:', {
        metricsCount: metrics.length,
        workoutsCount: workouts.length,
        summariesCount: summaries.length
      });
      
      // Сохраняем через Edge Function для оптимизации
      const { data: result, error } = await supabase.functions.invoke('process-apple-health', {
        body: {
          userId: user.id,
          metrics,
          workouts,
          summaries
        }
      });

      if (error) throw error;

      setStatus({
        stage: 'complete',
        progress: 100,
        message: 'Данные успешно импортированы!',
        details: {
          recordsProcessed: result?.saved?.metrics || 0,
          workoutsProcessed: result?.saved?.workouts || 0
        }
      });

      toast({
        title: 'Импорт завершен!',
        description: `Импортировано ${result?.saved?.metrics || 0} метрик и ${result?.saved?.workouts || 0} тренировок`,
      });

    } catch (error: any) {
      console.error('Error processing Apple Health data:', error);
      
      setStatus({
        stage: 'error',
        progress: 0,
        message: error.message || 'Ошибка обработки данных'
      });

      toast({
        title: 'Ошибка импорта',
        description: error.message || 'Не удалось обработать данные',
        variant: 'destructive'
      });
    }
  };

  const reset = () => {
    setSelectedFile(null);
    setStatus({ stage: 'idle', progress: 0, message: '' });
    setParsedData(null);
    setStatistics(null);
  };

  const getCategoryIcon = (category: string) => {
    switch(category) {
      case 'heart': return <Heart className="h-4 w-4" />;
      case 'body': return <TrendingUp className="h-4 w-4" />;
      case 'activity': return <Activity className="h-4 w-4" />;
      case 'sleep': return <Moon className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg flex items-center justify-center text-white text-xl">
              🍎
            </div>
            <div>
              <CardTitle>Apple Health</CardTitle>
              <CardDescription>
                Импортируйте все ваши данные о здоровье и фитнесе из iPhone
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Инструкции */}
        {status.stage === 'idle' && !selectedFile && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Как экспортировать данные:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Откройте приложение "Здоровье" на iPhone</li>
                <li>Нажмите на свой профиль (правый верхний угол)</li>
                <li>Прокрутите вниз и выберите "Экспортировать данные о здоровье"</li>
                <li>Подождите создания архива (может занять несколько минут)</li>
                <li>Отправьте ZIP-файл себе и загрузите его здесь</li>
              </ol>
            </AlertDescription>
          </Alert>
        )}

        {/* Зона загрузки */}
        {status.stage === 'idle' && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-all
              ${isDragging 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
              }
              ${selectedFile ? 'bg-green-50 dark:bg-green-950/20' : ''}
            `}
          >
            <input
              type="file"
              accept=".zip"
              onChange={handleFileSelect}
              className="hidden"
              id="apple-health-file"
            />
            
            {selectedFile ? (
              <div className="space-y-4">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
                <div className="flex gap-2 justify-center">
                  <Button onClick={processFile}>
                    <Upload className="h-4 w-4 mr-2" />
                    Начать импорт
                  </Button>
                  <Button variant="outline" onClick={reset}>
                    <X className="h-4 w-4 mr-2" />
                    Отмена
                  </Button>
                </div>
              </div>
            ) : (
              <label htmlFor="apple-health-file" className="cursor-pointer">
                <div className="space-y-4">
                  <FileUp className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div>
                    <p className="font-medium">
                      Перетащите ZIP-файл сюда или нажмите для выбора
                    </p>
                     <p className="text-sm text-muted-foreground mt-1 px-2">
                       Поддерживается экспорт Apple Health (файл export.zip)
                     </p>
                  </div>
                  <Button variant="outline">
                    Выбрать файл
                  </Button>
                </div>
              </label>
            )}
          </div>
        )}

        {/* Прогресс обработки */}
        {status.stage !== 'idle' && status.stage !== 'complete' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              <div className="flex-1">
                <p className="font-medium">{status.message}</p>
                {status.details && (
                  <p className="text-sm text-muted-foreground">
                    {status.details.recordsProcessed && 
                      `Обработано: ${status.details.recordsProcessed} из ${status.details.totalRecords}`}
                  </p>
                )}
              </div>
            </div>
            
            <Progress value={status.progress} />
            
            {status.details?.metricsFound && (
              <div className="flex flex-wrap gap-2">
                {status.details.metricsFound.map(metric => (
                  <Badge key={metric} variant="secondary">
                    {metric}
                  </Badge>
                ))}
                {status.details.metricsFound.length < (statistics?.metrics?.length || 0) && (
                  <Badge variant="outline">
                    +{(statistics?.metrics?.length || 0) - status.details.metricsFound.length} еще
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}

        {/* Результаты */}
        {status.stage === 'complete' && statistics && (
          <div className="space-y-4">
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <strong>Импорт завершен успешно!</strong>
                <br />
                Импортировано {statistics.totalRecords.toLocaleString('ru-RU')} записей 
                за {statistics.totalDays} дней
              </AlertDescription>
            </Alert>

            <Tabs defaultValue="metrics" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="metrics">Метрики</TabsTrigger>
                <TabsTrigger value="workouts">Тренировки</TabsTrigger>
              </TabsList>

              <TabsContent value="metrics" className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Импортированные метрики:</h4>
                  <div className="space-y-1">
                    {statistics.metrics.slice(0, 10).map((metric: any) => (
                      <div key={metric.name} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(metric.category)}
                          <span className="text-sm">{metric.name}</span>
                        </div>
                        <Badge variant="outline">
                          {metric.count.toLocaleString('ru-RU')} записей
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="workouts" className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Типы тренировок:</h4>
                  <div className="space-y-1">
                    {statistics.workoutTypes.slice(0, 10).map((workout: any) => (
                      <div key={workout.type} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                        <span className="text-sm">{workout.type}</span>
                        <Badge variant="outline">
                          {workout.count} тренировок
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={reset} className="flex-1">
                Загрузить еще данные
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/progress'}
                className="sm:w-auto"
              >
                Посмотреть прогресс
              </Button>
            </div>
          </div>
        )}

        {/* Ошибка */}
        {status.stage === 'error' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Ошибка импорта</strong>
              <br />
              {status.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Информация о поддерживаемых метриках */}
        <div className="pt-4 border-t">
          <div className="text-sm text-muted-foreground space-y-2">
            <p className="font-medium">Поддерживаемые данные:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <div className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                <span>Пульс и HRV</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                <span>Вес и состав тела</span>
              </div>
              <div className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                <span>Шаги и активность</span>
              </div>
              <div className="flex items-center gap-1">
                <Moon className="h-3 w-3" />
                <span>Сон и восстановление</span>
              </div>
            </div>
            <p className="text-xs">
              • Все данные обрабатываются локально и безопасно сохраняются
              <br />
              • Размер архива может быть большим в зависимости от истории (до 2GB)
              <br />
              • Обработка может занять несколько минут для больших архивов
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};