import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type DocumentType = 'inbody' | 'blood_test' | 'fitness_report' | 'progress_photo' | 'vo2max' | 'caliper' | 'prescription' | 'training_program' | 'other';

export interface MedicalDocument {
  id: string;
  user_id: string;
  file_name: string;
  storage_path: string;
  document_type: DocumentType;
  category?: string | null;
  file_size?: number;
  mime_type?: string;
  document_date?: string;
  uploaded_at: string;
  ai_processed: boolean;
  ai_summary?: string;
  ai_extracted_data?: any;
  tags?: string[];
  notes?: string;
  hidden_from_trainer: boolean;
  compared_with?: string[];
  comparison_results?: any;
  processing_status?: 'pending' | 'processing' | 'completed' | 'error' | null;
  processing_error?: string | null;
  processing_started_at?: string | null;
  processing_completed_at?: string | null;
}

export function useMedicalDocuments(filters?: {
  documentType?: DocumentType;
  startDate?: string;
  endDate?: string;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: documents, isLoading, error } = useQuery({
    queryKey: ['medical-documents', filters],
    queryFn: async () => {
      let query = supabase
        .from('medical_documents')
        .select('*')
        .order('document_date', { ascending: false, nullsFirst: false })
        .order('uploaded_at', { ascending: false });

      if (filters?.documentType) {
        query = query.eq('document_type', filters.documentType);
      }
      if (filters?.startDate) {
        query = query.gte('document_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('document_date', filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MedicalDocument[];
    },
  });

  const uploadDocument = useMutation({
    mutationFn: async ({
      file,
      fileHash,
      documentType = 'other',
      documentDate,
      notes,
      tags,
      hiddenFromTrainer = true,
    }: {
      file: File;
      fileHash?: string;
      documentType?: DocumentType;
      documentDate?: string;
      notes?: string;
      tags?: string[];
      hiddenFromTrainer?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const storagePath = `${user.id}/${documentType}/${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('medical-documents')
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Create document record
      const { data, error: insertError } = await supabase
        .from('medical_documents')
        .insert({
          user_id: user.id,
          file_name: file.name,
          storage_path: storagePath,
          document_type: documentType,
          file_size: file.size,
          mime_type: file.type,
          document_date: documentDate || new Date().toISOString().split('T')[0],
          notes,
          tags,
          hidden_from_trainer: hiddenFromTrainer || false,
          file_hash: fileHash || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-documents'] });
      toast({
        title: 'Документ загружен',
        description: 'Файл успешно сохранён',
      });
    },
    onError: (error) => {
      toast({
        title: 'Ошибка загрузки',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (documentId: string) => {
      const document = documents?.find(d => d.id === documentId);
      if (!document) throw new Error('Document not found');

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('medical-documents')
        .remove([document.storage_path]);

      if (storageError) throw storageError;

      // Delete record
      const { error: deleteError } = await supabase
        .from('medical_documents')
        .delete()
        .eq('id', documentId);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-documents'] });
      toast({
        title: 'Документ удалён',
      });
    },
    onError: (error) => {
      toast({
        title: 'Ошибка удаления',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateDocument = useMutation({
    mutationFn: async ({
      documentId,
      updates,
    }: {
      documentId: string;
      updates: Partial<MedicalDocument>;
    }) => {
      const { data, error } = await supabase
        .from('medical_documents')
        .update(updates)
        .eq('id', documentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-documents'] });
      toast({
        title: 'Документ обновлён',
      });
    },
    onError: (error) => {
      toast({
        title: 'Ошибка обновления',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const getDocumentUrl = (storagePath: string) => {
    const { data } = supabase.storage
      .from('medical-documents')
      .getPublicUrl(storagePath);
    return data.publicUrl;
  };

  return {
    documents,
    isLoading,
    error,
    uploadDocument,
    deleteDocument,
    updateDocument,
    getDocumentUrl,
  };
}
