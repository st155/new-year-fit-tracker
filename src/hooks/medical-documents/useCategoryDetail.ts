import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

// Локализация известных английских сообщений об ошибках
function localizeAiSummary(summary: string | null): string | null {
  if (!summary) return null;
  
  const translations: Record<string, string> = {
    'Document too large for automatic AI analysis. Please review manually or use specialized processing for large files.': 
      'Документ слишком большой для автоматического анализа. Пожалуйста, просмотрите вручную.',
    'Failed to process document':
      'Не удалось обработать документ',
    'Processing error':
      'Ошибка обработки',
  };
  
  return translations[summary] || summary;
}

export interface CategoryMetric {
  id: string;
  biomarkerId: string; // ID биомаркера для навигации
  name: string;
  icon: string;
  currentValue: number | string;
  unit: string;
  history: { date: string; value: number }[];
  trend: { min: number; avg: number; max: number };
  status: 'normal' | 'warning' | 'critical' | 'optimal';
  testCount: number;
}

export interface CategoryDetail {
  category: string;
  documentCount: number;
  dateRange: { from: string; to: string } | null;
  aiSummary: string;
  metrics: CategoryMetric[];
  documents: Array<{
    id: string;
    file_name: string;
    document_date: string;
    ai_summary: string | null;
    processing_status: string;
  }>;
}

async function fetchCategoryDetail(categoryId: string, userId: string): Promise<CategoryDetail> {
  // Fetch documents in this category
  const { data: documents, error: docsError } = await supabase
    .from('medical_documents')
    .select('id, file_name, document_date, ai_summary, processing_status')
    .eq('user_id', userId)
    .eq('category', categoryId)
    .order('document_date', { ascending: false });

  if (docsError) throw docsError;

  const documentCount = documents?.length || 0;

  // Calculate date range
  let dateRange = null;
  if (documents && documents.length > 0) {
    const dates = documents
      .map(d => d.document_date)
      .filter(Boolean)
      .sort();
    
    if (dates.length > 0) {
      dateRange = {
        from: format(new Date(dates[0]), 'dd MMM yyyy', { locale: ru }),
        to: format(new Date(dates[dates.length - 1]), 'dd MMM yyyy', { locale: ru }),
      };
    }
  }

  // Generate AI summary based on biomarker changes
  let aiSummary = 'Нет доступного описания';
  
  if (categoryId === 'blood_test' || categoryId === 'lab_urine') {
    // Fetch latest biomarker data for intelligent summary
    const { data: latestResults } = await supabase
      .from('lab_test_results')
      .select(`
        biomarker_id,
        normalized_value,
        test_date,
        biomarker_master (display_name)
      `)
      .eq('user_id', userId)
      .not('biomarker_master', 'is', null)
      .not('normalized_value', 'is', null)
      .order('test_date', { ascending: false })
      .limit(100);

    if (latestResults && latestResults.length > 0) {
      // Get latest test date
      const latestDate = latestResults[0].test_date;
      
      // Group by biomarker to find previous values
      const biomarkerMap = new Map<string, { current: number; previous: number | null; name: string }>();
      
      latestResults.forEach(result => {
        if (!result.biomarker_id || !result.biomarker_master) return;
        
        const key = result.biomarker_id;
        if (!biomarkerMap.has(key)) {
          biomarkerMap.set(key, {
            current: result.normalized_value!,
            previous: null,
            name: result.biomarker_master.display_name,
          });
        } else {
          // This is a previous value
          const existing = biomarkerMap.get(key)!;
          if (result.test_date === latestDate) {
            existing.current = result.normalized_value!;
          } else if (existing.previous === null) {
            existing.previous = result.normalized_value!;
          }
        }
      });

      // Calculate improvements and deteriorations
      const changes = Array.from(biomarkerMap.entries())
        .map(([id, data]) => {
          if (data.previous === null) return null;
          const change = ((data.current - data.previous) / data.previous) * 100;
          return { name: data.name, change };
        })
        .filter(Boolean);

      const improved = changes.filter(c => c && Math.abs(c.change) > 5 && c.change < 0).slice(0, 3);
      const worsened = changes.filter(c => c && Math.abs(c.change) > 5 && c.change > 0).slice(0, 3);

      // Generate summary
      const dateStr = format(new Date(latestDate), 'dd MMMM yyyy', { locale: ru });
      let summary = `По данным анализа от ${dateStr}: `;
      
      if (improved.length > 0) {
        summary += `\n✅ Улучшились: ${improved.map(c => c!.name).join(', ')}`;
      }
      if (worsened.length > 0) {
        summary += `\n⚠️ Требуют внимания: ${worsened.map(c => c!.name).join(', ')}`;
      }
      summary += `\n\n📊 Всего отслеживается ${biomarkerMap.size} показателей`;
      
      aiSummary = summary;
    }
  } else {
    // For other categories, use document summaries with deduplication
    const uniqueSummaries = [...new Set(
      documents
        ?.slice(0, 5)
        .map(d => localizeAiSummary(d.ai_summary))
        .filter(Boolean)
    )];

    if (uniqueSummaries.length > 0) {
      // Проверяем, не являются ли все саммари только сообщениями об ошибках
      const hasRealContent = uniqueSummaries.some(s => 
        !s?.includes('слишком большой') && 
        !s?.includes('too large') &&
        !s?.includes('Не удалось') &&
        !s?.includes('Failed')
      );
      
      if (hasRealContent) {
        aiSummary = uniqueSummaries.join('\n\n');
      } else {
        aiSummary = `В категории ${documentCount} документ${documentCount === 1 ? '' : documentCount < 5 ? 'а' : 'ов'}. ${uniqueSummaries[0]}`;
      }
    } else {
      aiSummary = 'Нет доступного описания';
    }
  }

  // Fetch metrics based on category
  let metrics: CategoryMetric[] = [];

  if (categoryId === 'blood_test' || categoryId === 'lab_urine') {
    // Fetch biomarker data
    const { data: biomarkerData, error: bioError } = await supabase
      .from('lab_test_results')
      .select(`
        biomarker_id,
        normalized_value,
        text_value,
        normalized_unit,
        test_date,
        biomarker_master (
          id,
          display_name,
          standard_unit,
          category,
          reference_ranges
        )
      `)
      .eq('user_id', userId)
      .not('biomarker_master', 'is', null)
      .order('test_date', { ascending: false });

    if (bioError) throw bioError;

    // Group by biomarker
    const biomarkerGroups = new Map<string, any[]>();
    biomarkerData?.forEach(result => {
      if (!result.biomarker_id || !result.biomarker_master) return;
      
      const key = result.biomarker_id;
      if (!biomarkerGroups.has(key)) {
        biomarkerGroups.set(key, []);
      }
      biomarkerGroups.get(key)!.push(result);
    });

    // Convert to metrics
    metrics = Array.from(biomarkerGroups.entries()).map(([biomarkerId, results]) => {
      const latest = results[0];
      const biomarker = latest.biomarker_master;
      const refRanges = biomarker.reference_ranges;
      
      // Filter outliers - values that are way outside reference range are likely wrong biomarker assignments
      const refMin = refRanges?.min ?? 0;
      const refMax = refRanges?.max ?? Infinity;
      const tolerance = 5; // Allow 5x outside reference range
      
      const validResults = results.filter(r => {
        if (r.normalized_value === null) return false;
        const value = r.normalized_value;
        // Filter out extreme outliers that are likely misassigned values
        return value >= 0 && value <= refMax * tolerance;
      });

      // Aggregate by date - group all values for the same date and take average
      const historyMap = new Map<string, number[]>();
      validResults.forEach(r => {
        if (r.normalized_value !== null) {
          const existing = historyMap.get(r.test_date) || [];
          existing.push(r.normalized_value);
          historyMap.set(r.test_date, existing);
        }
      });

      // Convert to array with averaged values, sorted chronologically
      const history = Array.from(historyMap.entries())
        .map(([date, values]) => ({
          date,
          value: values.reduce((a, b) => a + b, 0) / values.length, // average
        }))
        .sort((a, b) => a.date.localeCompare(b.date)); // chronological order

      const aggregatedValues = history.map(h => h.value);
      const trend = aggregatedValues.length > 0 ? {
        min: Math.min(...aggregatedValues),
        avg: aggregatedValues.reduce((a, b) => a + b, 0) / aggregatedValues.length,
        max: Math.max(...aggregatedValues),
      } : { min: 0, avg: 0, max: 0 };

      // Determine status using the latest valid value
      let status: CategoryMetric['status'] = 'normal';
      const latestValue = history.length > 0 ? history[history.length - 1].value : null;
      
      if (latestValue !== null && refRanges) {
        if (latestValue < refRanges.min) status = 'warning';
        else if (latestValue > refRanges.max) status = 'critical';
        else if (refRanges.optimal_min && refRanges.optimal_max &&
                 latestValue >= refRanges.optimal_min && 
                 latestValue <= refRanges.optimal_max) {
          status = 'optimal';
        }
      }

      return {
        id: biomarkerId,
        biomarkerId: biomarkerId,
        name: biomarker.display_name,
        icon: getCategoryIcon(biomarker.category),
        currentValue: latestValue ?? latest.text_value ?? 'N/A',
        unit: latest.normalized_unit || biomarker.standard_unit,
        history,
        trend,
        status,
        testCount: history.length, // Show unique date count instead of total records
      };
    });

  } else if (categoryId === 'imaging_report') {
    // First fetch document IDs for imaging reports
    const { data: imagingDocs, error: docError } = await supabase
      .from('medical_documents')
      .select('id')
      .eq('user_id', userId)
      .eq('category', 'imaging_report');

    if (docError) throw docError;

    const documentIds = imagingDocs?.map(d => d.id) || [];

    // Fetch imaging findings for these documents
    const { data: findings, error: findError } = await supabase
      .from('medical_findings')
      .select('*')
      .in('document_id', documentIds)
      .order('created_at', { ascending: false });

    if (findError) throw findError;

    // Group by body part
    const bodyPartGroups = new Map<string, any[]>();
    findings?.forEach(finding => {
      const key = finding.body_part || 'other';
      if (!bodyPartGroups.has(key)) {
        bodyPartGroups.set(key, []);
      }
      bodyPartGroups.get(key)!.push(finding);
    });

    metrics = Array.from(bodyPartGroups.entries()).map(([bodyPart, items]) => {
      const latest = items[0];
      
      let status: CategoryMetric['status'] = 'normal';
      if (latest.severity === 'severe') status = 'critical';
      else if (latest.severity === 'moderate') status = 'warning';
      else if (latest.severity === 'mild') status = 'warning';

      return {
        id: bodyPart,
        biomarkerId: bodyPart, // For imaging, use body part as identifier
        name: bodyPart,
        icon: '🔬',
        currentValue: latest.finding_text || 'Нет данных',
        unit: '',
        history: [],
        trend: { min: 0, avg: 0, max: 0 },
        status,
        testCount: items.length,
      };
    });
  }

  return {
    category: categoryId,
    documentCount,
    dateRange,
    aiSummary,
    metrics,
    documents: documents || [],
  };
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    hematology: '🩸',
    biochemistry: '⚗️',
    immunology: '🛡️',
    hormones: '🧬',
    vitamins: '💊',
    lipids: '🫀',
    metabolic: '⚡',
    liver: '🫁',
    kidney: '🫘',
    thyroid: '🦋',
    cardiac: '❤️',
    inflammation: '🔥',
    minerals: '⚛️',
    urine: '🧪',
  };
  
  return icons[category] || '📊';
}

export function useCategoryDetail(categoryId: string) {
  return useQuery({
    queryKey: ['category-detail', categoryId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      return fetchCategoryDetail(categoryId, user.id);
    },
    enabled: !!categoryId,
  });
}
