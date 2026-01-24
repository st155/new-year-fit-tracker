import { useTranslation } from 'react-i18next';
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
import { Download, Trash2, FileText, Calendar, Loader2, AlertCircle, CheckCircle2, Info, Eye, RefreshCw, Pill } from 'lucide-react';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
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
  onRetry?: (id: string) => void;
  onParseRecommendations?: (id: string) => void;
  isParsingRecommendations?: boolean;
}

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
  onRetry,
  onParseRecommendations,
  isParsingRecommendations,
}: DocumentCardProps) => {
  const { t, i18n } = useTranslation('medicalDocs');
  const navigate = useNavigate();
  const dateLocale = i18n.language === 'ru' ? ru : enUS;

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
          {t(`types.${documentType}`)}
        </Badge>
        
        {/* Processing Status */}
        {processingStatus === 'pending' && (
          <Badge variant="outline" className="text-xs text-yellow-600 bg-yellow-50/10">
            ⏳ {t('status.pending')}
          </Badge>
        )}
        {processingStatus === 'processing' && (
          <Badge variant="outline" className="text-xs text-blue-600 bg-blue-50/10">
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
            {t('status.processingAI')}
          </Badge>
        )}
        {processingStatus === 'error' && (
          <HoverCard>
            <HoverCardTrigger asChild>
              <Badge variant="outline" className="text-xs text-red-600 bg-red-50/10 cursor-help">
                <AlertCircle className="h-3 w-3 mr-1" />
                {t('status.error')}
              </Badge>
            </HoverCardTrigger>
            <HoverCardContent className="w-80">
              <p className="text-sm text-red-600">{processingError || t('status.errorDefault')}</p>
            </HoverCardContent>
          </HoverCard>
        )}
        {processingStatus === 'completed' && aiProcessed && (
          <Badge variant="outline" className="text-xs text-green-600 bg-green-50/10">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t('status.aiProcessed')}
          </Badge>
        )}
        
        {hiddenFromTrainer && (
          <Badge variant="outline" className="text-xs text-blue-600 bg-blue-50/10">
            🔒 {t('status.hiddenFromTrainer')}
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
                <span className="text-xs text-muted-foreground">{t('card.aiAnalysis')}</span>
              </div>
              <p className="text-sm text-foreground/80 line-clamp-2 group-hover:text-foreground transition-colors">
                {aiSummary}
              </p>
            </div>
          </HoverCardTrigger>
          <HoverCardContent className="w-96">
            <h4 className="font-semibold mb-2">🤖 {t('card.aiAnalysisDocument')}</h4>
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
              {format(new Date(documentDate), 'dd MMM', { locale: dateLocale })}
            </span>
          )}
          <span>{formatFileSize(fileSize)}</span>
        </div>

        <div className="flex gap-1">
          {/* Parse Recommendations Button */}
          {onParseRecommendations && ['prescription', 'fitness_report', 'blood_test', 'other'].includes(documentType) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-pink-400 hover:text-pink-300 hover:bg-pink-500/10"
              onClick={(e) => {
                e.stopPropagation();
                onParseRecommendations(id);
              }}
              disabled={isParsingRecommendations}
              title={t('actions.extractRecommendations')}
            >
              {isParsingRecommendations ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Pill className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
          
          {/* Retry/Reprocess Button */}
          {onRetry && (processingStatus === 'error' || documentType === 'blood_test' || documentType === 'fitness_report') && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
              onClick={(e) => {
                e.stopPropagation();
                onRetry(id);
              }}
              title={processingStatus === 'error' ? t('actions.retryProcessing') : t('actions.reprocessDocument')}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/medical-ingestion/${id}`);
            }}
            title={t('actions.openInCockpit')}
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
            title={t('actions.download')}
          >
            <Download className="h-3.5 w-3.5" />
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-7 w-7" title={t('actions.delete')}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('dialog.deleteTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('dialog.deleteDescription')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('dialog.cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(id);
                  }}
                >
                  {t('dialog.delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </Card>
  );
};
