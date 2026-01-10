import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import i18n from '@/i18n';

/**
 * Hook to monitor new lab test results and alert users when biomarkers
 * linked to their supplement stack are updated
 */
export function useNewLabAlerts() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const checkForNewLabResults = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !mounted) return;

        // Get user's active stack items with linked biomarkers
        const { data: stackItems } = await supabase
          .from('user_stack')
          .select('id, stack_name, linked_biomarker_ids')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .not('linked_biomarker_ids', 'is', null);

        if (!stackItems || stackItems.length === 0) return;

        // Get all linked biomarker IDs
        const allLinkedBiomarkers = new Set<string>();
        stackItems.forEach(item => {
          item.linked_biomarker_ids?.forEach((id: string) => allLinkedBiomarkers.add(id));
        });

        if (allLinkedBiomarkers.size === 0) return;

        // Check for new lab results in the last 24 hours
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const { data: newResults } = await supabase
          .from('lab_test_results')
          .select(`
            id,
            biomarker_id,
            normalized_value,
            normalized_unit,
            test_date,
            biomarker_master (display_name)
          `)
          .eq('user_id', user.id)
          .in('biomarker_id', Array.from(allLinkedBiomarkers))
          .gte('created_at', yesterday.toISOString())
          .order('created_at', { ascending: false });

        if (!newResults || newResults.length === 0) return;

        // Group new results by biomarker
        const biomarkerUpdates = new Map<string, any>();
        newResults.forEach(result => {
          if (!biomarkerUpdates.has(result.biomarker_id)) {
            biomarkerUpdates.set(result.biomarker_id, result);
          }
        });

        // Show toast notification for each updated biomarker
        biomarkerUpdates.forEach((result, biomarkerId) => {
          const biomarkerName = (result.biomarker_master as any)?.display_name || 'Unknown';
          
          toast.info(i18n.t('biostack:labAlerts.newResults', { name: biomarkerName }), {
            description: `${result.normalized_value} ${result.normalized_unit}`,
            action: {
              label: i18n.t('biostack:labAlerts.open'),
              onClick: () => navigate(`/biomarkers/${biomarkerId}`),
            },
            duration: 10000,
          });
        });

        // Invalidate relevant queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['user-stack'] });
        queryClient.invalidateQueries({ queryKey: ['calculate-correlation'] });
        
      } catch (error) {
        console.error('Error checking for new lab alerts:', error);
      }
    };

    // Check on mount
    checkForNewLabResults();

    // Set up realtime subscription for new lab results
    const channel = supabase
      .channel('lab-results-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lab_test_results',
        },
        () => {
          if (mounted) {
            checkForNewLabResults();
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      channel.unsubscribe();
    };
  }, [queryClient, navigate]);
}
