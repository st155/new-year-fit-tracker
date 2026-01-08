import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function useSyncProtocolsToLibrary() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('biostack');

  return useMutation({
    mutationFn: async () => {
      console.log('[SYNC-PROTOCOLS] Starting sync...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t('errors.notAuthenticated'));

      // Get all protocol items
      const { data: protocolItems, error: itemsError } = await supabase
        .from('protocol_items')
        .select(`
          product_id,
          protocols!inner (
            user_id,
            is_active
          )
        `)
        .eq('protocols.user_id', user.id)
        .eq('protocols.is_active', true);

      if (itemsError) throw itemsError;

      console.log('[SYNC-PROTOCOLS] Found protocol items:', protocolItems?.length);

      if (!protocolItems || protocolItems.length === 0) {
        return { synced: 0, message: t('toast.noProtocolItems') };
      }

      // Sync each item to library
      let syncedCount = 0;
      for (const item of protocolItems) {
        const { error: syncError } = await supabase
          .from('user_supplement_library')
          .upsert({
            user_id: user.id,
            product_id: item.product_id,
            source: 'protocol',
            scan_count: 0,
          }, { onConflict: 'user_id,product_id' });

        if (!syncError) {
          syncedCount++;
        } else {
          console.error('[SYNC-PROTOCOLS] Error syncing item:', syncError);
        }
      }

      console.log('[SYNC-PROTOCOLS] ✅ Synced', syncedCount, 'items');
      return { synced: syncedCount };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['supplement-library'] });
      toast.success(t('toast.syncComplete', { count: data.synced }));
    },
    onError: (error) => {
      console.error('[SYNC-PROTOCOLS] Error:', error);
      toast.error(error instanceof Error ? error.message : t('toast.syncFailed'));
    },
  });
}
