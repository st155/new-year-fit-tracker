import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ActiveProtocol {
  id: string;
  stack_name: string;
  source: 'doctor_rx' | 'ai_suggestion' | 'manual';
  start_date: string;
  planned_end_date: string;
  end_action: 'prompt_retest' | 'none';
  target_outcome?: string;
  supplement_products: {
    name: string;
    brand?: string;
  } | null;
  // Calculated fields
  daysElapsed: number;
  daysTotal: number;
  daysRemaining: number;
  progressPercent: number;
}

const calculateProgress = (startDate: string, endDate: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  const daysTotal = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const daysElapsed = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const progressPercent = Math.min(100, Math.max(0, (daysElapsed / daysTotal) * 100));

  return {
    daysTotal,
    daysElapsed,
    daysRemaining,
    progressPercent,
  };
};

export const useActiveProtocols = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['active-protocols', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('user_stack')
        .select(`
          id,
          stack_name,
          source,
          start_date,
          planned_end_date,
          end_action,
          target_outcome,
          supplement_products (
            name,
            brand
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .not('planned_end_date', 'is', null)
        .order('planned_end_date', { ascending: true })
        .limit(3);

      if (error) {
        console.error('Error fetching active protocols:', error);
        throw error;
      }

      // Calculate progress for each protocol
      const protocols: ActiveProtocol[] = (data || []).map((protocol) => {
        const progress = calculateProgress(
          protocol.start_date,
          protocol.planned_end_date!
        );

        return {
          ...protocol,
          ...progress,
        } as ActiveProtocol;
      });

      return protocols;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
