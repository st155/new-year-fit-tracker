import { useMutation } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/client';
import { toast } from 'sonner';
import i18n from '@/i18n';

export function useReprocessWebhook() {
  return useMutation({
    mutationFn: async (webhookId: string) => {
      const { data, error } = await adminApi.reprocessWebhook(webhookId);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(i18n.t('common:webhook.queued'), {
        description: i18n.t('common:webhook.updateIn2min')
      });
    },
    onError: (error: any) => {
      toast.error(i18n.t('common:webhook.reprocessFailed'), {
        description: error.message
      });
    }
  });
}
