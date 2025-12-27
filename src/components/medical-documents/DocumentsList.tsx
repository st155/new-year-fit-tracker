import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileText, Download, Trash2, Eye, EyeOff, Calendar, Tag, Sparkles, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useMedicalDocuments, DocumentType } from '@/hooks/useMedicalDocuments';
import { toast } from '@/hooks/use-toast';
import { DocumentComparison } from './DocumentComparison';
import { documentsApi } from '@/lib/api';

export const DocumentsList = () => {
  const { t } = useTranslation('medicalDocs');
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState<DocumentType | 'all'>('all');
  const [analyzingDoc, setAnalyzingDoc] = useState<string | null>(null);
  const { documents, isLoading, deleteDocument, getDocumentUrl } = useMedicalDocuments(
    filterType !== 'all' ? { documentType: filterType } : undefined
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const kb = bytes / 1024;
    const mb = kb / 1024;
    return mb > 1 ? `${mb.toFixed(2)} MB` : `${kb.toFixed(2)} KB`;
  };

  const handleDownload = (storagePath: string, fileName: string) => {
    const url = getDocumentUrl(storagePath);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
  };

  const handleAnalyze = async (documentId: string) => {
    setAnalyzingDoc(documentId);
    try {
      const { error } = await documentsApi.analyze(documentId);
      if (error) throw error;

      toast({
        title: t('list.analysisComplete'),
        description: t('list.analysisCompleteDesc'),
      });

      // Refresh documents list
      window.location.reload();
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({
        title: t('list.analysisError'),
        description: error.message || t('list.analysisErrorDesc'),
        variant: 'destructive',
      });
    } finally {
      setAnalyzingDoc(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">{t('list.loading')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('list.title')}</CardTitle>
            <CardDescription>
              {documents?.length || 0} {t('list.documents')}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {documents && documents.length > 1 && (
              <DocumentComparison documents={documents} />
            )}
            <Select value={filterType} onValueChange={(value) => setFilterType(value as DocumentType | 'all')}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t('filters.allTypes')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.allTypes')}</SelectItem>
                <SelectItem value="inbody">{t('filters.inbody')}</SelectItem>
                <SelectItem value="blood_test">{t('filters.bloodTest')}</SelectItem>
                <SelectItem value="fitness_report">{t('filters.fitnessReport')}</SelectItem>
                <SelectItem value="progress_photo">{t('filters.progressPhoto')}</SelectItem>
                <SelectItem value="vo2max">{t('filters.vo2max')}</SelectItem>
                <SelectItem value="caliper">{t('filters.caliper')}</SelectItem>
                <SelectItem value="prescription">{t('filters.prescription')}</SelectItem>
                <SelectItem value="training_program">{t('filters.trainingProgram')}</SelectItem>
                <SelectItem value="other">{t('filters.other')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!documents || documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t('list.noDocuments')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/medical-documents/${doc.id}`)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <h3 className="font-medium truncate">{doc.file_name}</h3>
                      {doc.hidden_from_trainer && (
                        <span title={t('status.hiddenFromTrainer')}>
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-2">
                      <Badge variant="secondary">
                        {t(`types.${doc.document_type}`)}
                      </Badge>
                      {doc.document_type === 'blood_test' && !doc.ai_processed && (
                        <Badge variant="outline" className="gap-1 text-yellow-600 bg-yellow-50 border-yellow-300">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          {t('status.processing')}
                        </Badge>
                      )}
                      {doc.ai_processed && (
                        <Badge variant="outline" className="text-green-600 bg-green-50 border-green-300">
                          ✓ {t('status.aiProcessed')}
                        </Badge>
                      )}
                      {doc.tags?.map((tag) => (
                        <Badge key={tag} variant="outline" className="gap-1">
                          <Tag className="h-3 w-3" />
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {doc.document_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(doc.document_date)}
                        </span>
                      )}
                      <span>{formatFileSize(doc.file_size)}</span>
                    </div>

                    {doc.notes && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {doc.notes}
                      </p>
                    )}

                    {doc.ai_summary && (
                      <div className="mt-2 p-2 bg-accent/30 rounded text-sm">
                        <p className="font-medium mb-1">{t('list.aiSummary')}:</p>
                        <p className="text-muted-foreground line-clamp-3">{doc.ai_summary}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {!doc.ai_processed && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAnalyze(doc.id);
                        }}
                        disabled={analyzingDoc === doc.id}
                      >
                        <Sparkles className="h-4 w-4 mr-1" />
                        {analyzingDoc === doc.id ? t('list.analyzing') : 'AI'}
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(doc.storage_path, doc.file_name);
                      }}
                      title={t('actions.download')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" title={t('actions.delete')}>
                          <Trash2 className="h-4 w-4" />
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
                              deleteDocument.mutate(doc.id);
                            }}
                          >
                            {t('dialog.delete')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
