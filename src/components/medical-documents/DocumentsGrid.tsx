import { DocumentCard } from './DocumentCard';
import { useMedicalDocuments } from '@/hooks/useMedicalDocuments';
import { FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface DocumentsGridProps {
  filterType?: string;
}

export const DocumentsGrid = ({ filterType }: DocumentsGridProps) => {
  const { documents, isLoading, deleteDocument, getDocumentUrl } = useMedicalDocuments(
    filterType && filterType !== 'all' ? { documentType: filterType as any } : undefined
  );

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
          onDownload={handleDownload}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
};
