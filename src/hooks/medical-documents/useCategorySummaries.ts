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
      const categories = [
        'blood_test',      // Анализы крови
        'lab_urine',       // Анализы мочи
        'imaging_report',  // МРТ/УЗИ
        'clinical_note',   // Заключения
        'prescription',    // Рецепты
        'fitness_report',  // Фитнес-отчёты
        'inbody',          // Состав тела
        'progress_photo',  // Прогресс-фото
        'other',           // Другие
      ];
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
