import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface StaleIntegration {
  provider: string;
  lastDataDate: string | null;
  daysSinceData: number;
  isActive: boolean;
}

export interface IntegrationHealthAlert {
  shouldShowAlert: boolean;
  staleIntegrations: StaleIntegration[];
  hasActiveIntegrations: boolean;
  isLoading: boolean;
}

export function useIntegrationHealthAlert(): IntegrationHealthAlert {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['integration-health-alert', user?.id],
    queryFn: async (): Promise<{ staleIntegrations: StaleIntegration[]; hasActiveIntegrations: boolean }> => {
      if (!user?.id) {
        return { staleIntegrations: [], hasActiveIntegrations: false };
      }

      // Get active Terra tokens
      const { data: tokens, error: tokensError } = await supabase
        .from('terra_tokens')
        .select('provider, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (tokensError) {
        console.error('❌ [useIntegrationHealthAlert] Error fetching tokens:', tokensError);
        return { staleIntegrations: [], hasActiveIntegrations: false };
      }

      if (!tokens || tokens.length === 0) {
        return { staleIntegrations: [], hasActiveIntegrations: false };
      }

      // For each active token, check last data in unified_metrics
      const staleIntegrations: StaleIntegration[] = [];
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      for (const token of tokens) {
        // Get latest metric from this provider
        const { data: latestMetric, error: metricError } = await supabase
          .from('unified_metrics')
          .select('measurement_date')
          .eq('user_id', user.id)
          .eq('source', token.provider)
          .order('measurement_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (metricError) {
          console.warn(`⚠️ [useIntegrationHealthAlert] Error checking metrics for ${token.provider}:`, metricError);
          continue;
        }

        const lastDataDate = latestMetric?.measurement_date || null;
        let daysSinceData = 999;

        if (lastDataDate) {
          const lastDate = new Date(lastDataDate);
          const now = new Date();
          daysSinceData = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        }

        // If no data or data is older than 3 days, mark as stale
        if (!lastDataDate || daysSinceData > 3) {
          staleIntegrations.push({
            provider: token.provider,
            lastDataDate,
            daysSinceData,
            isActive: token.is_active,
          });
        }
      }

      return {
        staleIntegrations,
        hasActiveIntegrations: tokens.length > 0,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
  });

  const shouldShowAlert = (data?.staleIntegrations?.length ?? 0) > 0;

  return {
    shouldShowAlert,
    staleIntegrations: data?.staleIntegrations ?? [],
    hasActiveIntegrations: data?.hasActiveIntegrations ?? false,
    isLoading,
  };
}
