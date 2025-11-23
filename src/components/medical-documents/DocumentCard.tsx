import { FileText, Download, Trash2, EyeOff, Calendar, Tag, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DocumentType } from '@/hooks/useMedicalDocuments';
import { useNavigate } from 'react-router-dom';

interface DocumentCardProps {
  id: string;
  fileName: string;
  documentType: DocumentType;
  documentDate?: string;
  fileSize?: number;
  tags?: string[];
  notes?: string;
  aiProcessed?: boolean;
  aiSummary?: string;
  hiddenFromTrainer?: boolean;
  storagePath: string;
  onDownload: (storagePath: string, fileName: string) => void;
  onDelete: (id: string) => void;
}

const documentTypeLabels: Record<DocumentType, string> = {
  inbody: 'InBody',
  blood_test: 'Анализ крови',
  fitness_report: 'Мед. заключение',
  progress_photo: 'Фото прогресса',
  vo2max: 'VO2max',
  caliper: 'Калипер',
  prescription: 'Рецепт',
  training_program: 'Программа',
  other: 'Другое',
};

const documentTypeColors: Record<DocumentType, string> = {
  blood_test: 'border-red-500/50 shadow-glow-rose',
  inbody: 'border-blue-500/50 shadow-glow-blue',
  progress_photo: 'border-green-500/50 shadow-glow-green',
  vo2max: 'border-cyan-500/50 shadow-glow-cyan',
  fitness_report: 'border-orange-500/50 shadow-glow-orange',
  caliper: 'border-purple-500/50',
  prescription: 'border-pink-500/50',
  training_program: 'border-indigo-500/50',
  other: 'border-border/50',
};

export const DocumentCard = ({
  id,
  fileName,
  documentType,
  documentDate,
  fileSize,
  tags,
  notes,
  aiProcessed,
  aiSummary,
  hiddenFromTrainer,
  storagePath,
  onDownload,
  onDelete,
}: DocumentCardProps) => {
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return mb > 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
  };

  return (
    <div
      className={`medical-doc-card glass-card p-4 cursor-pointer transition-all duration-300 hover:scale-[1.02] ${documentTypeColors[documentType]}`}
      onClick={() => navigate(`/medical-documents/${id}`)}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <FileText className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate text-foreground">{fileName}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="text-xs">
              {documentTypeLabels[documentType]}
            </Badge>
            {aiProcessed && (
              <Badge variant="outline" className="text-xs text-green-600 bg-green-50/10 border-green-500/30">
                ✓ AI
              </Badge>
            )}
            {hiddenFromTrainer && (
              <span title="Скрыто от тренера">
                <EyeOff className="h-3 w-3 text-muted-foreground" />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tags */}
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs gap-1">
              <Tag className="h-2.5 w-2.5" />
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* AI Summary Preview */}
      {aiSummary && (
        <div className="mb-3 p-2 bg-accent/10 rounded-lg border border-accent/20">
          <p className="text-xs text-muted-foreground line-clamp-2">{aiSummary}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border/30">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {documentDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(documentDate)}
            </span>
          )}
          <span>{formatFileSize(fileSize)}</span>
        </div>

        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onDownload(storagePath, fileName);
            }}
            title="Скачать"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-7 w-7" title="Удалить">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>Удалить документ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Это действие необратимо. Документ будет удалён навсегда.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(id);
                  }}
                >
                  Удалить
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
};
