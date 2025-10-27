import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SystemStatusData {
  pendingJobs: number;
  processingJobs: number;
  failedJobsLast1h: number;
  webhooksLast1h: number;
  lastProcessedTime: string | null;
}

export function useSystemStatus() {
  return useQuery({
    queryKey: ['system-status'],
    queryFn: async (): Promise<SystemStatusData> => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

      // Get pending jobs (older than 5 min or NULL scheduled_at)
      const { count: pendingCount } = await supabase
        .from('background_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .or(`scheduled_at.is.null,scheduled_at.lte.${fiveMinAgo}`);

      // Get processing jobs
      const { count: processingCount } = await supabase
        .from('background_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'processing');

      // Get failed jobs in last hour
      const { count: failedCount } = await supabase
        .from('background_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed')
        .gte('updated_at', oneHourAgo);

      // Get webhooks received in last hour
      const { count: webhooksCount } = await supabase
        .from('webhook_logs')
        .select('*', { count: 'exact', head: true })
        .eq('webhook_type', 'terra')
        .gte('created_at', oneHourAgo);

      // Get last processed time from terra_tokens
      const { data: tokenData } = await supabase
        .from('terra_tokens')
        .select('last_sync_date')
        .eq('is_active', true)
        .order('last_sync_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        pendingJobs: pendingCount || 0,
        processingJobs: processingCount || 0,
        failedJobsLast1h: failedCount || 0,
        webhooksLast1h: webhooksCount || 0,
        lastProcessedTime: tokenData?.last_sync_date || null,
      };
    },
    refetchInterval: 30000, // 30 seconds
  });
}
