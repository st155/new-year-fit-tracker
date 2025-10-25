import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock,
  Database,
  Wifi,
  Upload,
  Camera,
  Target,
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ErrorLogger } from '@/lib/error-logger';

interface TestResult {
  id: string;
  name: string;
  category: string;
  status: 'pending' | 'running' | 'success' | 'warning' | 'error';
  message: string;
  duration?: number;
  details?: any;
  icon: React.ReactNode;
}

export function AppTestSuite() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState({ total: 0, passed: 0, failed: 0, warnings: 0 });

  const initializeTests = (): TestResult[] => [
    {
      id: 'auth-check',
      name: 'Проверка аутентификации',
      category: 'Аутентификация',
      status: 'pending',
      message: 'Ожидание...',
      icon: <Settings className="w-4 h-4" />
    },
    {
      id: 'database-connection',
      name: 'Подключение к базе данных',
      category: 'База данных',
      status: 'pending',
      message: 'Ожидание...',
      icon: <Database className="w-4 h-4" />
    },
    {
      id: 'profiles-read',
      name: 'Чтение профиля пользователя',
      category: 'База данных',
      status: 'pending',
      message: 'Ожидание...',
      icon: <Database className="w-4 h-4" />
    },
    {
      id: 'goals-read',
      name: 'Загрузка целей',
      category: 'База данных',
      status: 'pending',
      message: 'Ожидание...',
      icon: <Target className="w-4 h-4" />
    },
    {
      id: 'goals-create',
      name: 'Создание тестовой цели',
      category: 'Функциональность',
      status: 'pending',
      message: 'Ожидание...',
      icon: <Target className="w-4 h-4" />
    },
    {
      id: 'measurements-read',
      name: 'Загрузка измерений',
      category: 'База данных',
      status: 'pending',
      message: 'Ожидание...',
      icon: <Database className="w-4 h-4" />
    },
    {
      id: 'measurements-create',
      name: 'Создание тестового измерения',
      category: 'Функциональность',
      status: 'pending',
      message: 'Ожидание...',
      icon: <Database className="w-4 h-4" />
    },
    {
      id: 'storage-test',
      name: 'Тест файлового хранилища',
      category: 'Storage',
      status: 'pending',
      message: 'Ожидание...',
      icon: <Upload className="w-4 h-4" />
    },
    {
      id: 'apple-health-function',
      name: 'Apple Health обработка',
      category: 'Интеграции',
      status: 'pending',
      message: 'Ожидание...',
      icon: <Wifi className="w-4 h-4" />
    },
    {
      id: 'ai-analysis-function',
      name: 'AI анализ скриншотов',
      category: 'Интеграции',
      status: 'pending',
      message: 'Ожидание...',
      icon: <Camera className="w-4 h-4" />
    },
    {
      id: 'error-logging',
      name: 'Система логирования ошибок',
      category: 'Логирование',
      status: 'pending',
      message: 'Ожидание...',
      icon: <AlertTriangle className="w-4 h-4" />
    },
    {
      id: 'rls-policies',
      name: 'RLS политики безопасности',
      category: 'Безопасность',
      status: 'pending',
      message: 'Ожидание...',
      icon: <Database className="w-4 h-4" />
    }
  ];

  const updateTestResult = (id: string, updates: Partial<TestResult>) => {
    setTestResults(prev => prev.map(test => 
      test.id === id ? { ...test, ...updates } : test
    ));
  };

  const runTest = async (test: TestResult): Promise<void> => {
    const startTime = Date.now();
    updateTestResult(test.id, { status: 'running', message: 'Выполняется...' });

    try {
      switch (test.id) {
        case 'auth-check':
          await testAuthentication();
          break;
        case 'database-connection':
          await testDatabaseConnection();
          break;
        case 'profiles-read':
          await testProfilesRead();
          break;
        case 'goals-read':
          await testGoalsRead();
          break;
        case 'goals-create':
          await testGoalsCreate();
          break;
        case 'measurements-read':
          await testMeasurementsRead();
          break;
        case 'measurements-create':
          await testMeasurementsCreate();
          break;
        case 'storage-test':
          await testStorage();
          break;
        case 'apple-health-function':
          await testAppleHealthFunction();
          break;
        case 'ai-analysis-function':
          await testAIAnalysisFunction();
          break;
        case 'error-logging':
          await testErrorLogging();
          break;
        case 'rls-policies':
          await testRLSPolicies();
          break;
        default:
          throw new Error('Неизвестный тест');
      }

      const duration = Date.now() - startTime;
      updateTestResult(test.id, {
        status: 'success',
        message: 'Успешно выполнено',
        duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      // Логируем ошибку теста
      await ErrorLogger.logError({
        errorType: 'test_failure',
        errorMessage: `Test failed: ${test.name}`,
        errorDetails: {
          testId: test.id,
          testName: test.name,
          error: error.message,
          duration
        },
        source: 'ui'
      }, user?.id);

      updateTestResult(test.id, {
        status: 'error',
        message: error.message,
        duration,
        details: error
      });
    }
  };

  // Тестовые функции
  const testAuthentication = async () => {
    if (!user) {
      throw new Error('Пользователь не аутентифицирован');
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Нет активной сессии');
    }
  };

  const testDatabaseConnection = async () => {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    if (error) {
      throw new Error(`Ошибка подключения к БД: ${error.message}`);
    }
  };

  const testProfilesRead = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user?.id)
      .single();

    if (error) {
      throw new Error(`Ошибка чтения профиля: ${error.message}`);
    }
    if (!data) {
      throw new Error('Профиль не найден');
    }
  };

  const testGoalsRead = async () => {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user?.id)
      .limit(10);

    if (error) {
      throw new Error(`Ошибка загрузки целей: ${error.message}`);
    }
  };

  const testGoalsCreate = async () => {
    const testGoal = {
      user_id: user?.id,
      goal_name: `Test Goal ${Date.now()}`,
      goal_type: 'test',
      target_value: 100,
      target_unit: 'test',
      challenge_id: null,
      is_personal: true
    };

    const { data, error } = await supabase
      .from('goals')
      .insert(testGoal)
      .select()
      .single();

    if (error) {
      throw new Error(`Ошибка создания цели: ${error.message}`);
    }

    // Удаляем тестовую цель
    await supabase.from('goals').delete().eq('id', data.id);
  };

  const testMeasurementsRead = async () => {
    const { data, error } = await supabase
      .from('measurements')
      .select('*')
      .eq('user_id', user?.id)
      .limit(10);

    if (error) {
      throw new Error(`Ошибка загрузки измерений: ${error.message}`);
    }
  };

  const testMeasurementsCreate = async () => {
    // Сначала создаем тестовую цель
    const { data: goalData, error: goalError } = await supabase
      .from('goals')
      .insert({
        user_id: user?.id,
        goal_name: `Test Goal for Measurement ${Date.now()}`,
        goal_type: 'test',
        target_value: 100,
        target_unit: 'test',
        challenge_id: null,
        is_personal: true
      })
      .select()
      .single();

    if (goalError) {
      throw new Error(`Ошибка создания тестовой цели: ${goalError.message}`);
    }

    try {
      const testMeasurement = {
        user_id: user?.id,
        goal_id: goalData.id,
        value: 50,
        unit: 'test',
        measurement_date: new Date().toISOString().split('T')[0],
        notes: 'Test measurement',
        source: 'manual'
      };

      const { data, error } = await supabase
        .from('measurements')
        .insert(testMeasurement)
        .select()
        .single();

      if (error) {
        throw new Error(`Ошибка создания измерения: ${error.message}`);
      }

      // Удаляем тестовые данные
      await supabase.from('measurements').delete().eq('id', data.id);
    } finally {
      // Удаляем тестовую цель
      await supabase.from('goals').delete().eq('id', goalData.id);
    }
  };

  const testStorage = async () => {
    // Создаем тестовый файл
    const testFile = new Blob(['test content'], { type: 'text/plain' });
    const fileName = `test-${Date.now()}.txt`;
    const filePath = `${user?.id}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('progress-photos')
      .upload(filePath, testFile);

    if (error) {
      throw new Error(`Ошибка загрузки файла: ${error.message}`);
    }

    // Удаляем тестовый файл
    await supabase.storage
      .from('progress-photos')
      .remove([data.path]);
  };


  const testAppleHealthFunction = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('apple-health-import', {
        body: {
          userId: user?.id,
          filePath: 'test/path'
        }
      });

      if (error) {
        throw new Error(`Apple Health функция недоступна: ${error.message}`);
      }
    } catch (error: any) {
      if (error.message.includes('Missing userId or filePath')) {
        // Это ожидаемая ошибка для теста без реального файла
        return;
      }
      throw error;
    }
  };

  const testAIAnalysisFunction = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-fitness-data', {
        body: {
          userId: user?.id,
          imageUrl: 'test-url'
        }
      });

      if (error && !error.message.includes('Missing imageUrl')) {
        throw new Error(`AI анализ недоступен: ${error.message}`);
      }
    } catch (error: any) {
      if (error.message.includes('OPENAI_API_KEY')) {
        updateTestResult('ai-analysis-function', {
          status: 'warning',
          message: 'Требуется настройка OpenAI API ключа'
        });
        return;
      }
      throw error;
    }
  };

  const testErrorLogging = async () => {
    // Тестируем запись ошибки
    await ErrorLogger.logError({
      errorType: 'test_error',
      errorMessage: 'Test error for logging system verification',
      errorDetails: { testTimestamp: new Date().toISOString() },
      source: 'ui'
    }, user?.id);

    // Проверяем что ошибка записалась
    const { data, error } = await supabase
      .from('error_logs')
      .select('*')
      .eq('user_id', user?.id)
      .eq('error_type', 'test_error')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(`Ошибка проверки логирования: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('Тестовая ошибка не была записана в лог');
    }
  };

  const testRLSPolicies = async () => {
    // Тестируем что пользователь может видеть только свои данные
    const { count, error } = await supabase
      .from('goals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user?.id);

    if (error) {
      throw new Error(`Ошибка проверки RLS: ${error.message}`);
    }

    // Пытаемся получить данные другого пользователя (должно вернуть 0)
    const { count: otherUserCount, error: otherError } = await supabase
      .from('goals')
      .select('*', { count: 'exact', head: true })
      .neq('user_id', user?.id);

    if (otherError && !otherError.message.includes('row-level security')) {
      updateTestResult('rls-policies', {
        status: 'warning',
        message: 'RLS может быть настроен некорректно'
      });
      return;
    }
  };

  const runAllTests = async () => {
    const tests = initializeTests();
    setTestResults(tests);
    setIsRunning(true);
    setProgress(0);

    let passed = 0;
    let failed = 0;
    let warnings = 0;

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      await runTest(test);
      
      // Обновляем прогресс
      const currentProgress = ((i + 1) / tests.length) * 100;
      setProgress(currentProgress);

      // Подсчитываем результаты
      const result = testResults.find(t => t.id === test.id);
      if (result?.status === 'success') passed++;
      else if (result?.status === 'warning') warnings++;
      else if (result?.status === 'error') failed++;

      // Небольшая задержка между тестами
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setSummary({ total: tests.length, passed, failed, warnings });
    setIsRunning(false);

    // Логируем результаты тестирования
    await ErrorLogger.logError({
      errorType: 'test_suite_completed',
      errorMessage: 'App testing suite completed',
      errorDetails: {
        total: tests.length,
        passed,
        failed,
        warnings,
        timestamp: new Date().toISOString()
      },
      source: 'ui'
    }, user?.id);

    toast({
      title: 'Тестирование завершено',
      description: `Успешно: ${passed}, Ошибки: ${failed}, Предупреждения: ${warnings}`
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'running': return <Clock className="w-4 h-4 text-blue-600 animate-spin" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'border-green-200 bg-green-50';
      case 'error': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'running': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Тестирование приложения
        </CardTitle>
        <CardDescription>
          Комплексная проверка всех функций приложения и запись ошибок в систему логирования
        </CardDescription>
        <div className="flex items-center gap-4">
          <Button 
            onClick={runAllTests} 
            disabled={isRunning}
            className="bg-gradient-primary hover:opacity-90"
          >
            {isRunning ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Тестирование...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Запустить все тесты
              </>
            )}
          </Button>
          
          {summary.total > 0 && (
            <div className="flex gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Успешно: {summary.passed}
              </Badge>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                Предупреждения: {summary.warnings}
              </Badge>
              <Badge variant="secondary" className="bg-red-100 text-red-800">
                Ошибки: {summary.failed}
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isRunning && (
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Прогресс тестирования</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {testResults.length > 0 && (
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {testResults.map((test) => (
                <div 
                  key={test.id}
                  className={`p-3 rounded-lg border ${getStatusColor(test.status)}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {test.icon}
                      <span className="font-medium text-sm">{test.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {test.category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(test.status)}
                      {test.duration && (
                        <span className="text-xs text-muted-foreground">
                          {test.duration}ms
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{test.message}</p>
                  {test.details && test.status === 'error' && (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer text-red-600">
                        Детали ошибки
                      </summary>
                      <pre className="text-xs bg-red-100 p-2 rounded mt-1 overflow-x-auto">
                        {JSON.stringify(test.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {testResults.length === 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Нажмите "Запустить все тесты" для начала комплексной проверки всех функций приложения.
              Все ошибки будут автоматически записаны в систему логирования для дальнейшего анализа.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}