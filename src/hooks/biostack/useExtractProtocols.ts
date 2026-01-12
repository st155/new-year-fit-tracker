import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { documentsApi } from '@/lib/api';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function useExtractProtocols() {
  const { t } = useTranslation('biostack');
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  const extractAllMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch all user documents that may contain protocols
      const { data: docs, error: fetchError } = await supabase
        .from('medical_documents')
        .select('id, file_name')
        .eq('user_id', user.id)
        .in('document_type', ['prescription', 'fitness_report', 'blood_test', 'other']);

      if (fetchError) throw fetchError;
      if (!docs || docs.length === 0) {
        throw new Error(t('toast.noDocuments'));
      }

      setProgress({ current: 0, total: docs.length });
      const results: { success: number; failed: number } = { success: 0, failed: 0 };

      for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        try {
          const { error } = await documentsApi.parseRecommendations(doc.id);
          
          if (error) {
            console.error(`Failed to parse ${doc.file_name}:`, error);
            results.failed++;
          } else {
            results.success++;
          }
        } catch (err) {
          console.error(`Error parsing ${doc.file_name}:`, err);
          results.failed++;
        }
        
        setProgress({ current: i + 1, total: docs.length });
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['doctor-action-items'] });
      queryClient.invalidateQueries({ queryKey: ['medical-documents'] });
      setProgress(null);
      
      if (results.failed === 0) {
        toast.success(t('toast.extractedProtocols', { count: results.success }));
      } else {
        toast.warning(t('toast.extractResult', { success: results.success, failed: results.failed }));
      }
    },
    onError: (error: Error) => {
      setProgress(null);
      toast.error(error.message);
    },
  });

  return {
    extractAll: extractAllMutation.mutate,
    isExtracting: extractAllMutation.isPending,
    progress,
  };
}

export function useToggleProtocolStatus() {
  const { t } = useTranslation('biostack');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      documentId, 
      isActive 
    }: { 
      documentId: string; 
      isActive: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const newStatus = isActive ? 'active' : 'dismissed';

      const { error } = await supabase
        .from('doctor_action_items')
        .update({ status: newStatus })
        .eq('document_id', documentId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['doctor-action-items'] });
      toast.success(t(isActive ? 'toast.protocolActivated' : 'toast.protocolDeactivated'));
    },
    onError: (error: Error) => {
      toast.error(t('errors.genericError') + ': ' + error.message);
    },
  });
}

export function useUpdateActionItem() {
  const { t } = useTranslation('biostack');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      itemId, 
      updates 
    }: { 
      itemId: string; 
      updates: {
        dosage?: string;
        schedule?: string;
        frequency?: string;
        details?: string;
        priority?: 'high' | 'medium' | 'low';
      };
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('doctor_action_items')
        .update(updates)
        .eq('id', itemId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-action-items'] });
      toast.success(t('toast.changesSaved'));
    },
    onError: (error: Error) => {
      toast.error(t('errors.genericError') + ': ' + error.message);
    },
  });
}

export function useDeleteActionItem() {
  const { t } = useTranslation('biostack');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('doctor_action_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-action-items'] });
      toast.success(t('toast.itemDeleted'));
    },
    onError: (error: Error) => {
      toast.error(t('errors.genericError') + ': ' + error.message);
    },
  });
}
