import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Biomarker {
  id: string;
  canonical_name: string;
  display_name: string;
  loinc_code?: string;
  category: string;
  standard_unit: string;
  alternative_units?: string[];
  conversion_factors?: Record<string, number>;
  reference_ranges?: any;
  description?: string;
  interpretation_guide?: string;
  clinical_significance?: string;
  wiki_link?: string;
}

export interface LabTestResult {
  id: string;
  user_id: string;
  document_id: string;
  biomarker_id?: string;
  raw_test_name: string;
  value: number;
  unit: string;
  normalized_value: number;
  normalized_unit: string;
  laboratory_name?: string;
  laboratory_method?: string;
  equipment_type?: string;
  ref_range_min?: number;
  ref_range_max?: number;
  ref_range_unit?: string;
  test_date: string;
  sample_type?: string;
  quality_flag?: string;
  created_at: string;
  biomarker_master?: Biomarker;
}

export function useBiomarkers() {
  const { toast } = useToast();

  const { data: biomarkers, isLoading } = useQuery({
    queryKey: ['biomarkers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('biomarker_master')
        .select('*')
        .order('display_name');

      if (error) throw error;
      return data as Biomarker[];
    },
  });

  return {
    biomarkers,
    isLoading,
  };
}

export function useLabTestResults(documentId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: results, isLoading, error } = useQuery({
    queryKey: ['lab-test-results', documentId],
    queryFn: async () => {
      let query = supabase
        .from('lab_test_results')
        .select(`
          *,
          biomarker_master (*)
        `)
        .order('test_date', { ascending: false });

      if (documentId) {
        query = query.eq('document_id', documentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as LabTestResult[];
    },
    enabled: !!documentId || documentId === undefined,
  });

  const parseDocument = useMutation({
    mutationFn: async (documentId: string) => {
      const { data, error } = await supabase.functions.invoke('parse-lab-report', {
        body: { documentId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lab-test-results'] });
      queryClient.invalidateQueries({ queryKey: ['medical-documents'] });
      toast({
        title: 'Документ обработан',
        description: `Извлечено ${data.biomarkers_extracted} биомаркеров`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка обработки',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const rematchBiomarkers = useMutation({
    mutationFn: async (documentId?: string) => {
      const { data, error } = await supabase.functions.invoke('rematch-biomarkers', {
        body: { documentId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lab-test-results'] });
      toast({
        title: 'Пересопоставление завершено',
        description: `Сопоставлено ${data.rematchedCount} из ${data.totalUnmatched} биомаркеров`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка пересопоставления',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    results,
    isLoading,
    error,
    parseDocument,
    rematchBiomarkers,
  };
}

export function useBiomarkerTrends(biomarkerId?: string) {
  const { toast } = useToast();

  const { data: analysis, isLoading, refetch } = useQuery({
    queryKey: ['biomarker-trends', biomarkerId],
    queryFn: async () => {
      if (!biomarkerId) return null;

      const { data, error } = await supabase.functions.invoke('analyze-biomarker-trends', {
        body: { biomarkerId }
      });

      if (error) throw error;
      return data;
    },
    enabled: !!biomarkerId,
  });

  return {
    analysis,
    isLoading,
    refetch,
  };
}

export function useBiomarkerHistory(biomarkerId: string) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['biomarker-history', biomarkerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lab_test_results')
        .select(`
          *,
          biomarker_master (*)
        `)
        .eq('biomarker_id', biomarkerId)
        .order('test_date', { ascending: false });

      if (error) throw error;
      return data as LabTestResult[];
    },
  });

  return {
    history,
    isLoading,
  };
}
