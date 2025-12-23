import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CategorySummary {
  category: string;
  count: number;
  lastDate: string;
  aiSummary: string;
  overallScore: 'excellent' | 'good' | 'warning' | 'attention' | null;
  healthIndicator: string;
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
          // Собираем все уникальные саммари
          const allSummaries = catDocs
            .map(d => d.ai_summary)
            .filter((s): s is string => !!s && s !== 'Нет описания');
          
          // Генерируем обобщённое саммари
          let combinedSummary = '';
          let overallScore: CategorySummary['overallScore'] = null;
          let healthIndicator = '';

          if (allSummaries.length > 0) {
            // Берём ключевые фразы из первых 3 документов
            const keyPhrases = allSummaries.slice(0, 3);
            combinedSummary = keyPhrases.join(' • ');
            
            // Определяем общую оценку по ключевым словам
            const allText = allSummaries.join(' ').toLowerCase();
            
            if (allText.includes('норм') || allText.includes('хорош') || allText.includes('отлично')) {
              overallScore = 'excellent';
              healthIndicator = 'В норме';
            } else if (allText.includes('незначительн') || allText.includes('лёгк') || allText.includes('легк')) {
              overallScore = 'good';
              healthIndicator = 'Незначительные отклонения';
            } else if (allText.includes('внимани') || allText.includes('контрол') || allText.includes('наблюд')) {
              overallScore = 'attention';
              healthIndicator = 'Требует внимания';
            } else if (allText.includes('повышен') || allText.includes('понижен') || allText.includes('отклон')) {
              overallScore = 'warning';
              healthIndicator = 'Есть отклонения';
            } else {
              overallScore = 'good';
              healthIndicator = `${catDocs.length} документ${catDocs.length > 4 ? 'ов' : catDocs.length > 1 ? 'а' : ''}`;
            }
          } else {
            combinedSummary = 'Нет описания';
            healthIndicator = `${catDocs.length} документ${catDocs.length > 4 ? 'ов' : catDocs.length > 1 ? 'а' : ''}`;
          }

          summaries.push({
            category: cat,
            count: catDocs.length,
            lastDate: catDocs[0].document_date || '',
            aiSummary: combinedSummary,
            overallScore,
            healthIndicator,
          });
        }
      }

      return summaries;
    },
  });
}
