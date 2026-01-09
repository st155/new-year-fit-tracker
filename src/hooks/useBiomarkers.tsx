import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { documentsApi, healthApi } from '@/lib/api';

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
  const { t } = useTranslation('biomarkers');
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
      const { data, error } = await documentsApi.parseLabReport(documentId);
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['lab-test-results'] });
      queryClient.invalidateQueries({ queryKey: ['medical-documents'] });
      toast({
        title: t('toast.documentProcessed'),
        description: t('toast.biomarkersExtracted', { count: data.biomarkers_extracted }),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('toast.processingError'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const rematchBiomarkers = useMutation({
    mutationFn: async (documentId?: string) => {
      const { data, error } = await documentsApi.rematchBiomarkers(documentId);
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['lab-test-results'] });
      toast({
        title: t('toast.rematchComplete'),
        description: t('toast.rematchedCount', { matched: data.rematchedCount, total: data.totalUnmatched }),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('toast.rematchError'),
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

      const { data, error } = await healthApi.analyzeBiomarkerTrends(biomarkerId);
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
