import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

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
}

async function fetchCategoryDetail(categoryId: string, userId: string): Promise<CategoryDetail> {
  // Fetch documents in this category
  const { data: documents, error: docsError } = await supabase
    .from('medical_documents')
    .select('id, document_date, ai_summary')
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
  
  if (categoryId === 'lab_blood' || categoryId === 'lab_urine') {
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
    // For other categories, use document summaries
    aiSummary = documents
      ?.slice(0, 3)
      .map(d => d.ai_summary)
      .filter(Boolean)
      .join(' ') || 'Нет доступного описания';
  }

  // Fetch metrics based on category
  let metrics: CategoryMetric[] = [];

  if (categoryId === 'lab_blood' || categoryId === 'lab_urine') {
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
      
      // Calculate history and trends (only for quantitative data)
      // Keep chronological order (oldest first) for chart display
      const history = results
        .filter(r => r.normalized_value !== null)
        .map(r => ({
          date: r.test_date,
          value: r.normalized_value,
        }))
        .reverse(); // Reverse to get chronological order (oldest → newest)

      const values = history.map(h => h.value).filter(v => v !== null);
      const trend = values.length > 0 ? {
        min: Math.min(...values),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        max: Math.max(...values),
      } : { min: 0, avg: 0, max: 0 };

      // Determine status
      const refRanges = biomarker.reference_ranges;
      let status: CategoryMetric['status'] = 'normal';
      
      if (latest.normalized_value !== null && refRanges) {
        if (latest.normalized_value < refRanges.min) status = 'warning';
        else if (latest.normalized_value > refRanges.max) status = 'critical';
        else if (refRanges.optimal_min && refRanges.optimal_max &&
                 latest.normalized_value >= refRanges.optimal_min && 
                 latest.normalized_value <= refRanges.optimal_max) {
          status = 'optimal';
        }
      }

      return {
        id: biomarkerId,
        biomarkerId: biomarkerId, // Явно указываем ID биомаркера
        name: biomarker.display_name,
        icon: getCategoryIcon(biomarker.category),
        currentValue: latest.normalized_value ?? latest.text_value ?? 'N/A',
        unit: latest.normalized_unit || biomarker.standard_unit,
        history,
        trend,
        status,
        testCount: results.length,
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
