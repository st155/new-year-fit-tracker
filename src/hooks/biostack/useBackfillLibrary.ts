import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useBackfillLibrary() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('backfill-supplement-library');
      
      if (error) throw error;
      if (!data.success) throw new Error('Backfill failed');
      
      return data;
    },
    onSuccess: (data) => {
      if (data.addedCount > 0) {
        toast.success(`✅ Added ${data.addedCount} supplements to library`, {
          description: `${data.skippedCount} already existed`,
        });
      } else {
        toast.info('Library is up to date', {
          description: 'All stack items already in library',
        });
      }
    },
    onError: (error) => {
      console.error('Backfill error:', error);
      toast.error('Failed to backfill library', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}
