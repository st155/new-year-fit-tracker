import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

interface TestResponse {
  success: boolean;
  summary: {
    total: number;
    passed: number;
    failed: number;
    passRate: string;
  };
  results: TestResult[];
  timestamp: string;
}

export function useRunLifecycleTests() {
  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('test-protocol-lifecycle', {
        body: { userId: user.id }
      });

      if (error) throw error;
      return data as TestResponse;
    },
    onSuccess: (data) => {
      const { summary, results } = data;
      
      if (summary.failed === 0) {
        toast.success('🎉 All tests passed!', {
          description: `${summary.passed}/${summary.total} tests successful (${summary.passRate})`,
          duration: 5000
        });
      } else {
        toast.warning('⚠️ Some tests failed', {
          description: `${summary.passed}/${summary.total} passed, ${summary.failed} failed`,
          duration: 7000
        });
      }

      console.log('🧪 Test Results:', data);
      
      // Log failed tests
      results.filter(r => !r.passed).forEach(test => {
        console.error(`❌ ${test.name}: ${test.message}`, test.details);
      });
    },
    onError: (error: Error) => {
      toast.error('❌ Test execution failed', {
        description: error.message
      });
    }
  });
}
