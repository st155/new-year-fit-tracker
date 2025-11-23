import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Download, Trash2, Eye, EyeOff, Calendar, Tag, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useMedicalDocuments, DocumentType } from '@/hooks/useMedicalDocuments';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { DocumentComparison } from './DocumentComparison';

const documentTypeLabels: Record<DocumentType, string> = {
  inbody: 'InBody',
  blood_test: 'Анализ крови',
  medical_report: 'Мед. заключение',
  progress_photo: 'Фото прогресса',
  other: 'Другое',
};

export const DocumentsList = () => {
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
      const { data, error } = await supabase.functions.invoke('analyze-medical-document', {
        body: { documentId }
      });

      if (error) throw error;

      toast({
        title: 'Анализ завершён',
        description: 'AI обработал документ и добавил insights',
      });

      // Refresh documents list
      window.location.reload();
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({
        title: 'Ошибка анализа',
        description: error.message || 'Не удалось проанализировать документ',
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
          <p className="text-center text-muted-foreground">Загрузка документов...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Мои документы</CardTitle>
            <CardDescription>
              {documents?.length || 0} документов
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {documents && documents.length > 1 && (
              <DocumentComparison documents={documents} />
            )}
            <Select value={filterType} onValueChange={(value) => setFilterType(value as DocumentType | 'all')}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Все типы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                <SelectItem value="inbody">InBody анализы</SelectItem>
                <SelectItem value="blood_test">Анализы крови</SelectItem>
                <SelectItem value="medical_report">Мед. заключения</SelectItem>
                <SelectItem value="progress_photo">Фото прогресса</SelectItem>
                <SelectItem value="other">Другое</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!documents || documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Нет загруженных документов</p>
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
                        <span title="Скрыто от тренера">
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-2">
                      <Badge variant="secondary">
                        {documentTypeLabels[doc.document_type]}
                      </Badge>
                      {doc.ai_processed && (
                        <Badge variant="outline">AI обработан</Badge>
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
                        <p className="font-medium mb-1">AI Резюме:</p>
                        <p className="text-muted-foreground line-clamp-3">{doc.ai_summary}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {!doc.ai_processed && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAnalyze(doc.id)}
                        disabled={analyzingDoc === doc.id}
                      >
                        <Sparkles className="h-4 w-4 mr-1" />
                        {analyzingDoc === doc.id ? 'Анализ...' : 'AI'}
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(doc.storage_path, doc.file_name)}
                      title="Скачать"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" title="Удалить">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Удалить документ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Это действие необратимо. Документ будет удалён навсегда.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteDocument.mutate(doc.id)}
                          >
                            Удалить
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
