import { useMedicalDocuments, DocumentType } from '@/hooks/useMedicalDocuments';
import { Badge } from '@/components/ui/badge';
import { FileText, Activity, Camera, FlaskConical, FileCheck } from 'lucide-react';
import { getIntlLocale } from '@/lib/date-locale';

export const DocumentStats = () => {
  const { documents } = useMedicalDocuments();

  if (!documents || documents.length === 0) return null;

  const totalSize = documents.reduce((sum, doc) => sum + (doc.file_size || 0), 0);
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(1);

  const bloodTests = documents.filter(d => d.document_type === 'blood_test').length;
  const inbodyDocs = documents.filter(d => d.document_type === 'inbody').length;
  const photos = documents.filter(d => d.document_type === 'progress_photo').length;
  const aiProcessed = documents.filter(d => d.ai_processed).length;

  const lastUpload = documents.length > 0 
    ? new Date(documents[0].uploaded_at).toLocaleDateString(getIntlLocale(), { day: 'numeric', month: 'short' })
    : '';

  return (
    <div className="glass-card p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold text-foreground">✨ Статистика документов</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="gap-1.5">
          <FileText className="h-3 w-3" />
          {documents.length} документов
        </Badge>

        {bloodTests > 0 && (
          <Badge variant="outline" className="gap-1.5 border-red-500/30">
            <Activity className="h-3 w-3 text-red-500" />
            {bloodTests} анализов
          </Badge>
        )}

        {inbodyDocs > 0 && (
          <Badge variant="outline" className="gap-1.5 border-blue-500/30">
            <FlaskConical className="h-3 w-3 text-blue-500" />
            {inbodyDocs} InBody
          </Badge>
        )}

        {photos > 0 && (
          <Badge variant="outline" className="gap-1.5 border-green-500/30">
            <Camera className="h-3 w-3 text-green-500" />
            {photos} фото
          </Badge>
        )}

        <Badge variant="outline" className="gap-1.5">
          💾 {totalSizeMB} MB
        </Badge>

        {aiProcessed > 0 && (
          <Badge variant="outline" className="gap-1.5 border-green-500/30">
            <FileCheck className="h-3 w-3 text-green-500" />
            {aiProcessed} обработано AI
          </Badge>
        )}

        {lastUpload && (
          <Badge variant="outline" className="gap-1.5">
            📅 Последний: {lastUpload}
          </Badge>
        )}
      </div>
    </div>
  );
};
