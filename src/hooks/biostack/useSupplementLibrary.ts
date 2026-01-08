import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface LibraryEntry {
  id: string;
  user_id: string;
  product_id: string;
  first_scanned_at: string;
  scan_count: number;
  notes: string | null;
  custom_rating: number | null;
  tags: string[] | null;
  source: 'scan' | 'protocol' | 'manual';
  created_at: string;
  updated_at: string;
  supplement_products: {
    id: string;
    name: string;
    brand: string | null;
    dosage_amount: number | null;
    dosage_unit: string | null;
    form: string | null;
    image_url: string | null;
    description: string | null;
    avg_rating: number | null;
    benefits: string[] | null;
    research_summary: string | null;
    manufacturer_info: any | null;
    servings_per_container: number | null;
    price: string | null;
    label_description: string | null;
    label_benefits: string[] | null;
    certifications: string[] | null;
    storage_instructions: string | null;
    country_of_origin: string | null;
    website: string | null;
    ingredients: string[] | null;
    warnings: string | null;
    recommended_daily_intake: string | null;
    expiration_info: string | null;
    barcode: string | null;
  };
  is_in_stack: boolean;
  enrichment_status: 'enriched' | 'partial' | 'not_enriched';
}

export function useSupplementLibrary() {
  return useQuery({
    queryKey: ['supplement-library'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get library entries with product details
      const { data: library, error } = await supabase
        .from('user_supplement_library')
        .select(`
          *,
          source,
      supplement_products (
        id,
        name,
        brand,
        dosage_amount,
        dosage_unit,
        form,
        image_url,
        description,
        avg_rating,
        benefits,
        research_summary,
        manufacturer_info,
        servings_per_container,
        price,
        label_description,
        label_benefits,
        certifications,
        storage_instructions,
        country_of_origin,
        website,
        ingredients,
        warnings,
        recommended_daily_intake,
        expiration_info,
        barcode
      )
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Check which products are in user_stack
      const { data: stackItems } = await supabase
        .from('user_stack')
        .select('product_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const stackProductIds = new Set(stackItems?.map(item => item.product_id) || []);

      return library?.map(entry => {
        // Determine enrichment status
        const product = entry.supplement_products;
        let enrichment_status: 'enriched' | 'partial' | 'not_enriched' = 'not_enriched';
        
        if (product.description && product.benefits && product.research_summary) {
          enrichment_status = 'enriched';
        } else if (product.description || product.benefits) {
          enrichment_status = 'partial';
        }

        return {
          ...entry,
          is_in_stack: stackProductIds.has(entry.product_id),
          enrichment_status
        };
      }) as LibraryEntry[];
    },
  });
}

export function useAddToLibrary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if entry exists
      const { data: existing } = await supabase
        .from('user_supplement_library')
        .select('scan_count')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle();

      if (existing) {
        // Update scan count
        const { data, error } = await supabase
          .from('user_supplement_library')
          .update({ scan_count: existing.scan_count + 1 })
          .eq('user_id', user.id)
          .eq('product_id', productId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new entry
        const { data, error } = await supabase
          .from('user_supplement_library')
          .insert({
            user_id: user.id,
            product_id: productId,
            scan_count: 1,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplement-library'] });
    },
  });
}

export function useUpdateLibraryEntry() {
  const { t } = useTranslation('biostack');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      notes,
      customRating,
      tags,
    }: {
      productId: string;
      notes?: string;
      customRating?: number | null;
      tags?: string[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_supplement_library')
        .update({
          notes,
          custom_rating: customRating,
          tags,
        })
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplement-library'] });
      toast.success(t('toast.libraryEntryUpdated'));
    },
  });
}

export function useRemoveFromLibrary() {
  const { t } = useTranslation('biostack');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_supplement_library')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplement-library'] });
      toast.success(t('toast.removedFromLibrary'));
    },
  });
}

export function useLibraryStats() {
  return useQuery({
    queryKey: ['supplement-library-stats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { count } = await supabase
        .from('user_supplement_library')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      return { totalCount: count || 0 };
    },
  });
}