import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface JobStats {
  pending?: number;
  processing?: number;
  completed?: number;
  failed?: number;
}

interface ConfidenceStats {
  total_metrics: number;
  avg_confidence: number;
  excellent: number;
  good: number;
  fair: number;
  poor: number;
}

interface WebhookStats {
  total_webhooks: number;
  completed: number;
  failed: number;
}

interface MonitoringData {
  jobs: JobStats;
  confidence: ConfidenceStats;
  webhooks: WebhookStats;
  timestamp: string;
}

export function useMonitoringData() {
  return useQuery({
    queryKey: ['monitoring-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_monitoring_dashboard_data');
      
      if (error) throw error;
      return data as unknown as MonitoringData;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useJobProcessingStats() {
  return useQuery({
    queryKey: ['job-processing-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_job_processing_stats');
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000,
  });
}

export function useDataQualityTrends() {
  return useQuery({
    queryKey: ['data-quality-trends'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_data_quality_trends');
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000,
  });
}

export function useRetryFailedJobs() {
  return async (jobType?: string) => {
    const { data, error } = await supabase.rpc('retry_failed_jobs', {
      p_job_type: jobType || null,
    });
    
    if (error) throw error;
    return data;
  };
}

export function useEnqueueInitialCalculations() {
  return async () => {
    const { data, error } = await supabase.rpc('enqueue_initial_confidence_calculations');
    
    if (error) throw error;
    return data;
  };
}
