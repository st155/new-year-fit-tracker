import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useRunProtocolTests() {
  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('run-protocol-tests', {
        body: { userId: user.id }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success('✅ Automated tests completed!', {
        description: `Created ${data.test_data.protocols_created} protocols, ${data.test_data.alerts_created} alerts`,
        duration: 5000
      });
      console.log('🧪 Test Results:', data);
    },
    onError: (error: Error) => {
      toast.error('❌ Test execution failed', {
        description: error.message
      });
    }
  });
}

export function useCleanProtocolTests() {
  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('clean-protocol-tests', {
        body: { userId: user.id }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success('🧹 Test data cleaned up!', {
        description: `Deleted ${data.deleted_count} test protocols`
      });
    },
    onError: (error: Error) => {
      toast.error('❌ Cleanup failed', {
        description: error.message
      });
    }
  });
}
