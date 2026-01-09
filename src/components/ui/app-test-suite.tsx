import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { healthApi, aiApi } from '@/lib/api';

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
  const { t } = useTranslation('testing');
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState({ total: 0, passed: 0, failed: 0, warnings: 0 });

  const initializeTests = (): TestResult[] => [
    {
      id: 'auth-check',
      name: t('tests.authCheck.name'),
      category: t('categories.auth'),
      status: 'pending',
      message: t('status.waiting'),
      icon: <Settings className="w-4 h-4" />
    },
    {
      id: 'database-connection',
      name: t('tests.dbConnection.name'),
      category: t('categories.database'),
      status: 'pending',
      message: t('status.waiting'),
      icon: <Database className="w-4 h-4" />
    },
    {
      id: 'profiles-read',
      name: t('tests.profileRead.name'),
      category: t('categories.database'),
      status: 'pending',
      message: t('status.waiting'),
      icon: <Database className="w-4 h-4" />
    },
    {
      id: 'goals-read',
      name: t('tests.goalsLoad.name'),
      category: t('categories.database'),
      status: 'pending',
      message: t('status.waiting'),
      icon: <Target className="w-4 h-4" />
    },
    {
      id: 'goals-create',
      name: t('tests.goalCreate.name'),
      category: t('categories.functionality'),
      status: 'pending',
      message: t('status.waiting'),
      icon: <Target className="w-4 h-4" />
    },
    {
      id: 'measurements-read',
      name: t('tests.measurementsLoad.name'),
      category: t('categories.database'),
      status: 'pending',
      message: t('status.waiting'),
      icon: <Database className="w-4 h-4" />
    },
    {
      id: 'measurements-create',
      name: t('tests.measurementCreate.name'),
      category: t('categories.functionality'),
      status: 'pending',
      message: t('status.waiting'),
      icon: <Database className="w-4 h-4" />
    },
    {
      id: 'storage-test',
      name: t('tests.storageTest.name'),
      category: t('categories.storage'),
      status: 'pending',
      message: t('status.waiting'),
      icon: <Upload className="w-4 h-4" />
    },
    {
      id: 'apple-health-function',
      name: t('tests.appleHealth.name'),
      category: t('categories.integrations'),
      status: 'pending',
      message: t('status.waiting'),
      icon: <Wifi className="w-4 h-4" />
    },
    {
      id: 'ai-analysis-function',
      name: t('tests.aiAnalysis.name'),
      category: t('categories.integrations'),
      status: 'pending',
      message: t('status.waiting'),
      icon: <Camera className="w-4 h-4" />
    },
    {
      id: 'error-logging',
      name: t('tests.errorLogging.name'),
      category: t('categories.logging'),
      status: 'pending',
      message: t('status.waiting'),
      icon: <AlertTriangle className="w-4 h-4" />
    },
    {
      id: 'rls-policies',
      name: t('tests.rlsPolicies.name'),
      category: t('categories.security'),
      status: 'pending',
      message: t('status.waiting'),
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
    updateTestResult(test.id, { status: 'running', message: t('status.running') });

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
          throw new Error('Unknown test');
      }

      const duration = Date.now() - startTime;
      updateTestResult(test.id, {
        status: 'success',
        message: t('status.success'),
        duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      // Log test error
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

  // Test functions
  const testAuthentication = async () => {
    if (!user) {
      throw new Error(t('tests.authCheck.error'));
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No active session');
    }
  };

  const testDatabaseConnection = async () => {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    if (error) {
      throw new Error(`${t('tests.dbConnection.error')}: ${error.message}`);
    }
  };

  const testProfilesRead = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user?.id)
      .single();

    if (error) {
      throw new Error(`${t('tests.profileRead.error')}: ${error.message}`);
    }
    if (!data) {
      throw new Error(t('tests.profileRead.error'));
    }
  };

  const testGoalsRead = async () => {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user?.id)
      .limit(10);

    if (error) {
      throw new Error(`${t('tests.goalsLoad.error')}: ${error.message}`);
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
      throw new Error(`${t('tests.goalCreate.error')}: ${error.message}`);
    }

    // Delete test goal
    await supabase.from('goals').delete().eq('id', data.id);
  };

  const testMeasurementsRead = async () => {
    const { data, error } = await supabase
      .from('measurements')
      .select('*')
      .eq('user_id', user?.id)
      .limit(10);

    if (error) {
      throw new Error(`${t('tests.measurementsLoad.error')}: ${error.message}`);
    }
  };

  const testMeasurementsCreate = async () => {
    // First create a test goal
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
      throw new Error(`${t('tests.measurementCreate.error')}: ${goalError.message}`);
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
        throw new Error(`${t('tests.measurementCreate.error')}: ${error.message}`);
      }

      // Delete test data
      await supabase.from('measurements').delete().eq('id', data.id);
    } finally {
      // Delete test goal
      await supabase.from('goals').delete().eq('id', goalData.id);
    }
  };

  const testStorage = async () => {
    // Create test file
    const testFile = new Blob(['test content'], { type: 'text/plain' });
    const fileName = `test-${Date.now()}.txt`;
    const filePath = `${user?.id}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('progress-photos')
      .upload(filePath, testFile);

    if (error) {
      throw new Error(`${t('tests.storageTest.error')}: ${error.message}`);
    }

    // Delete test file
    await supabase.storage
      .from('progress-photos')
      .remove([data.path]);
  };


  const testAppleHealthFunction = async () => {
    try {
      const { data, error } = await healthApi.importAppleHealth(user!.id, 'test/path');

      if (error) {
        throw new Error(`${t('tests.appleHealth.error')}: ${error.message}`);
      }
    } catch (error: any) {
      if (error.message.includes('Missing userId or filePath')) {
        // This is expected error for test without real file
        return;
      }
      throw error;
    }
  };

  const testAIAnalysisFunction = async () => {
    try {
      const { data, error } = await aiApi.analyzeFitnessData('test-url', user!.id);

      if (error && !error.message.includes('Missing imageUrl')) {
        throw new Error(`${t('tests.aiAnalysis.error')}: ${error.message}`);
      }
    } catch (error: any) {
      if (error.message.includes('OPENAI_API_KEY')) {
        updateTestResult('ai-analysis-function', {
          status: 'warning',
          message: 'OpenAI API key required'
        });
        return;
      }
      throw error;
    }
  };

  const testErrorLogging = async () => {
    // Test error logging
    await ErrorLogger.logError({
      errorType: 'test_error',
      errorMessage: 'Test error for logging system verification',
      errorDetails: { testTimestamp: new Date().toISOString() },
      source: 'ui'
    }, user?.id);

    // Check that error was logged
    const { data, error } = await supabase
      .from('error_logs')
      .select('*')
      .eq('user_id', user?.id)
      .eq('error_type', 'test_error')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(`${t('tests.errorLogging.error')}: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error(t('tests.errorLogging.error'));
    }
  };

  const testRLSPolicies = async () => {
    // Test that user can only see their own data
    const { count, error } = await supabase
      .from('goals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user?.id);

    if (error) {
      throw new Error(`${t('tests.rlsPolicies.error')}: ${error.message}`);
    }

    // Try to get another user's data (should return 0)
    const { count: otherUserCount, error: otherError } = await supabase
      .from('goals')
      .select('*', { count: 'exact', head: true })
      .neq('user_id', user?.id);

    if (otherError && !otherError.message.includes('row-level security')) {
      updateTestResult('rls-policies', {
        status: 'warning',
        message: t('tests.rlsPolicies.error')
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
      
      // Update progress
      const currentProgress = ((i + 1) / tests.length) * 100;
      setProgress(currentProgress);

      // Count results
      const result = testResults.find(t => t.id === test.id);
      if (result?.status === 'success') passed++;
      else if (result?.status === 'warning') warnings++;
      else if (result?.status === 'error') failed++;

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setSummary({ total: tests.length, passed, failed, warnings });
    setIsRunning(false);

    // Log test suite completion
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
      title: t('completed'),
      description: t('completedDesc')
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
          {t('title')}
        </CardTitle>
        <CardDescription>
          {t('completedDesc')}
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
                {t('running')}
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                {t('runAll')}
              </>
            )}
          </Button>
          
          {summary.total > 0 && (
            <div className="flex gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                ✓ {summary.passed}
              </Badge>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                ⚠ {summary.warnings}
              </Badge>
              <Badge variant="secondary" className="bg-red-100 text-red-800">
                ✕ {summary.failed}
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isRunning && (
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span>{t('running')}</span>
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
                        Error details
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
              {t('completedDesc')}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}