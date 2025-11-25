import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CategorySummary {
  category: string;
  count: number;
  lastDate: string;
  aiSummary: string;
}

export function useCategorySummaries() {
  return useQuery({
    queryKey: ['category-summaries'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: documents, error } = await supabase
        .from('medical_documents')
        .select('category, document_date, ai_summary')
        .eq('user_id', user.id)
        .order('document_date', { ascending: false });

      if (error) throw error;

      // Group by category
      const categories = ['lab_blood', 'lab_urine', 'imaging_report', 'clinical_note', 'other'];
      const summaries: CategorySummary[] = [];

      for (const cat of categories) {
        const catDocs = documents?.filter(d => d.category === cat || (!d.category && cat === 'other'));
        if (catDocs && catDocs.length > 0) {
          summaries.push({
            category: cat,
            count: catDocs.length,
            lastDate: catDocs[0].document_date || catDocs[0].document_date || '',
            aiSummary: catDocs[0].ai_summary || 'Нет описания',
          });
        }
      }

      return summaries;
    },
  });
}
