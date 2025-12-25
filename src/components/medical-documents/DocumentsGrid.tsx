import { useState, useEffect } from 'react';
import { DocumentCard } from './DocumentCard';
import { useMedicalDocuments } from '@/hooks/useMedicalDocuments';
import { FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { documentsApi } from '@/lib/api';

interface DocumentsGridProps {
  filterType?: string;
  filterCategory?: string | null;
}

export const DocumentsGrid = ({ filterType = "all", filterCategory = null }: DocumentsGridProps) => {
  const queryClient = useQueryClient();
  const { documents, isLoading, deleteDocument, getDocumentUrl } = useMedicalDocuments(
    filterType && filterType !== 'all' ? { documentType: filterType as any } : undefined
  );

  // Filter by category if specified
  const filteredDocuments = filterCategory 
    ? documents?.filter(doc => doc.category === filterCategory)
    : documents;

  // Query recommendations count per document
  const { data: recommendationsCounts } = useQuery({
    queryKey: ['recommendations-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('doctor_recommendations')
        .select('document_id')
        .eq('status', 'pending');

      if (error) throw error;

      // Count recommendations per document
      const counts: Record<string, number> = {};
      data?.forEach(rec => {
        counts[rec.document_id] = (counts[rec.document_id] || 0) + 1;
      });

      return counts;
    },
    initialData: {},
  });

  // State for tracking which document is being parsed
  const [parsingDocId, setParsingDocId] = useState<string | null>(null);

  // Retry mutation for lab reports
  const retryMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await documentsApi.parseLabReport(documentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-documents'] });
      toast.success('Документ отправлен на повторную обработку');
    },
    onError: (error: any) => {
      console.error('Retry failed:', error);
      toast.error('Не удалось повторить обработку', { description: error.message });
    }
  });

  // Parse recommendations mutation
  const parseRecommendationsMutation = useMutation({
    mutationFn: async (documentId: string) => {
      setParsingDocId(documentId);
      const { data, error } = await documentsApi.parseRecommendations(documentId);
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['medical-documents'] });
      queryClient.invalidateQueries({ queryKey: ['recommendations-counts'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-action-items'] });
      const count = data?.recommendations?.length || 0;
      toast.success(`Извлечено рекомендаций: ${count}`, {
        description: count > 0 ? 'Перейдите в раздел Рекомендации' : 'Рекомендации не найдены'
      });
    },
    onError: (error: any) => {
      console.error('Parse recommendations failed:', error);
      toast.error('Не удалось извлечь рекомендации', { description: error.message });
    },
    onSettled: () => {
      setParsingDocId(null);
    }
  });

  // Auto-refresh for documents in processing
  useEffect(() => {
    const processingDocs = documents?.filter(d => 
      d.processing_status === 'processing' || d.processing_status === 'pending'
    );

    if (processingDocs && processingDocs.length > 0) {
      const interval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ['medical-documents'] });
      }, 3000); // Refresh every 3 seconds

      return () => clearInterval(interval);
    }
  }, [documents, queryClient]);

  const handleDownload = (storagePath: string, fileName: string) => {
    const url = getDocumentUrl(storagePath);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
  };

  const handleDelete = (id: string) => {
    deleteDocument.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-3xl" />
        ))}
      </div>
    );
  }

  if (!filteredDocuments || filteredDocuments.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
        <p className="text-muted-foreground">Нет документов для отображения</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 animate-fade-in">
      {filteredDocuments.map((doc) => (
        <DocumentCard
          key={doc.id}
          id={doc.id}
          fileName={doc.file_name}
          documentType={doc.document_type}
          documentDate={doc.document_date}
          fileSize={doc.file_size}
          tags={doc.tags}
          notes={doc.notes}
          aiProcessed={doc.ai_processed}
          aiSummary={doc.ai_summary}
          hiddenFromTrainer={doc.hidden_from_trainer}
          storagePath={doc.storage_path}
          processingStatus={doc.processing_status}
          processingError={doc.processing_error}
          recommendationsCount={recommendationsCounts?.[doc.id] || 0}
          onDownload={handleDownload}
          onDelete={handleDelete}
          onRetry={(id) => retryMutation.mutate(id)}
          onParseRecommendations={(id) => parseRecommendationsMutation.mutate(id)}
          isParsingRecommendations={parsingDocId === doc.id}
        />
      ))}
    </div>
  );
};
