import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export function useAddProductToStack() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Check if already in stack
      const { data: existing, error: checkError } = await supabase
        .from('user_stack')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .eq('is_active', true)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existing) {
        throw new Error('Supplement is already in your stack');
      }

      // Get product details
      const { data: product, error: productError } = await supabase
        .from('supplement_products')
        .select('*')
        .eq('id', productId)
        .single();

      if (productError) throw productError;
      if (!product) throw new Error('Product not found');

      // Add to stack
      const { data: stackItem, error: insertError } = await supabase
        .from('user_stack')
        .insert([{
          user_id: user.id,
          product_id: productId,
          stack_name: product.name,
          dosage: '',
          frequency: 'daily',
          start_date: new Date().toISOString().split('T')[0],
          is_active: true,
          status: 'active',
          intake_times: ['morning'],
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // Auto-link biomarkers
      try {
        await supabase.functions.invoke('auto-link-biomarkers', {
          body: {
            userId: user.id,
            supplementName: product.name,
            stackItemId: stackItem.id,
          },
        });
      } catch (e) {
        console.warn('Auto-link biomarkers failed:', e);
      }

      return stackItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-stack'] });
      queryClient.invalidateQueries({ queryKey: ['supplement-library'] });
      toast({
        title: 'Added to Stack',
        description: 'Supplement has been added to your active stack',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
