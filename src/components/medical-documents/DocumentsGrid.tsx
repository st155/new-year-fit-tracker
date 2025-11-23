import { DocumentCard } from './DocumentCard';
import { useMedicalDocuments } from '@/hooks/useMedicalDocuments';
import { FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface DocumentsGridProps {
  filterType?: string;
}

export const DocumentsGrid = ({ filterType }: DocumentsGridProps) => {
  const queryClient = useQueryClient();
  const { documents, isLoading, deleteDocument, getDocumentUrl } = useMedicalDocuments(
    filterType && filterType !== 'all' ? { documentType: filterType as any } : undefined
  );

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

  if (!documents || documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
        <p className="text-muted-foreground">Нет документов для отображения</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 animate-fade-in">
      {documents.map((doc) => (
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
          onDownload={handleDownload}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
};
