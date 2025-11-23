import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Download, Trash2, FileText, Calendar, Loader2, AlertCircle, CheckCircle2, Info, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DocumentType } from '@/hooks/useMedicalDocuments';
import { useNavigate } from 'react-router-dom';

interface DocumentCardProps {
  id: string;
  fileName: string;
  documentType: DocumentType;
  documentDate: string | null;
  fileSize: number | null;
  tags: string[] | null;
  notes: string | null;
  aiProcessed: boolean;
  aiSummary: string | null;
  hiddenFromTrainer: boolean;
  storagePath: string;
  processingStatus?: 'pending' | 'processing' | 'completed' | 'error' | null;
  processingError?: string | null;
  recommendationsCount?: number;
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
  processingStatus,
  processingError,
  recommendationsCount,
  onDownload,
  onDelete,
}: DocumentCardProps) => {
  const navigate = useNavigate();

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return mb > 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
  };

  return (
    <Card
      className={cn(
        'medical-doc-card glass-card p-4 cursor-pointer transition-all duration-300 hover:scale-[1.02]',
        documentTypeColors[documentType]
      )}
      onClick={() => navigate(`/medical-documents/${id}`)}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <FileText className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate text-foreground">{fileName}</h3>
        </div>
      </div>

      {/* Tags & Status */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <Badge variant="outline" className="text-xs">
          {documentTypeLabels[documentType]}
        </Badge>
        
        {/* Processing Status */}
        {processingStatus === 'pending' && (
          <Badge variant="outline" className="text-xs text-yellow-600 bg-yellow-50/10">
            ⏳ Ожидает обработки
          </Badge>
        )}
        {processingStatus === 'processing' && (
          <Badge variant="outline" className="text-xs text-blue-600 bg-blue-50/10">
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
            Обрабатывается AI
          </Badge>
        )}
        {processingStatus === 'error' && (
          <HoverCard>
            <HoverCardTrigger asChild>
              <Badge variant="outline" className="text-xs text-red-600 bg-red-50/10 cursor-help">
                <AlertCircle className="h-3 w-3 mr-1" />
                Ошибка обработки
              </Badge>
            </HoverCardTrigger>
            <HoverCardContent className="w-80">
              <p className="text-sm text-red-600">{processingError || 'Произошла ошибка при обработке'}</p>
            </HoverCardContent>
          </HoverCard>
        )}
        {processingStatus === 'completed' && aiProcessed && (
          <Badge variant="outline" className="text-xs text-green-600 bg-green-50/10">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            AI обработан
          </Badge>
        )}
        
        {hiddenFromTrainer && (
          <Badge variant="outline" className="text-xs text-blue-600 bg-blue-50/10">
            🔒 Скрыто от тренера
          </Badge>
        )}
        
        {/* Rx Detected Badge */}
        {recommendationsCount && recommendationsCount > 0 && (
          <Badge variant="outline" className="text-xs text-green-600 bg-green-50/10 border-green-500/20">
            💊 Rx ({recommendationsCount})
          </Badge>
        )}
      </div>

      {/* AI Summary Preview with HoverCard */}
      {aiSummary && (
        <HoverCard>
          <HoverCardTrigger asChild>
            <div className="group cursor-help mb-3">
              <div className="flex items-center gap-1 mb-1">
                <Info className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">AI Анализ</span>
              </div>
              <p className="text-sm text-foreground/80 line-clamp-2 group-hover:text-foreground transition-colors">
                {aiSummary}
              </p>
            </div>
          </HoverCardTrigger>
          <HoverCardContent className="w-96">
            <h4 className="font-semibold mb-2">🤖 AI Анализ документа</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {aiSummary}
            </p>
          </HoverCardContent>
        </HoverCard>
      )}

      {/* Tags */}
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border/30">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {documentDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(documentDate), 'dd MMM', { locale: ru })}
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
              navigate(`/medical-ingestion/${id}`);
            }}
            title="Open in Cockpit"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>

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
    </Card>
  );
};
