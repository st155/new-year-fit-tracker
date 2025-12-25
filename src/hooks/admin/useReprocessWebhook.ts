import { useMutation } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/client';
import { toast } from 'sonner';

export function useReprocessWebhook() {
  return useMutation({
    mutationFn: async (webhookId: string) => {
      const { data, error } = await adminApi.reprocessWebhook(webhookId);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Webhook queued for reprocessing', {
        description: 'Data will update within 2 minutes'
      });
    },
    onError: (error: any) => {
      toast.error('Failed to reprocess webhook', {
        description: error.message
      });
    }
  });
}
