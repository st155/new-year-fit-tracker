import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, FileText, Calendar, Building2, Activity, Edit2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLabTestResults } from '@/hooks/useBiomarkers';
import { useMedicalDocuments, DocumentType } from '@/hooks/useMedicalDocuments';
import { BiomarkerCard } from '@/components/biomarkers/BiomarkerCard';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';

const processingStages = {
  'downloading': { label: '📄 Загрузка PDF', progress: 10 },
  'converting': { label: '🔄 Конвертация в base64', progress: 20 },
  'analyzing': { label: '🤖 Анализ с Gemini AI', progress: 50 },
  'saving': { label: '💾 Сохранение биомаркеров', progress: 85 },
  'complete': { label: '✅ Готово!', progress: 100 },
} as const;

export default function MedicalDocumentDetail() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { documents, updateDocument } = useMedicalDocuments();
  const { results, isLoading, parseDocument } = useLabTestResults(documentId);
  
  const [processingStage, setProcessingStage] = useState<keyof typeof processingStages | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  
  const document = documents?.find(d => d.id === documentId);

  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: {
      document_type: document?.document_type || 'other',
      document_date: document?.document_date || new Date().toISOString().split('T')[0],
      tags: document?.tags?.join(', ') || '',
      notes: document?.notes || '',
      hidden_from_trainer: document?.hidden_from_trainer ?? true,
    }
  });

  useEffect(() => {
    if (document) {
      setValue('document_type', document.document_type);
      setValue('document_date', document.document_date || new Date().toISOString().split('T')[0]);
      setValue('tags', document.tags?.join(', ') || '');
      setValue('notes', document.notes || '');
      setValue('hidden_from_trainer', document.hidden_from_trainer);
    }
  }, [document, setValue]);

  if (!document) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <p className="text-muted-foreground">Документ не найден</p>
          <Button onClick={() => navigate('/medical-documents')} variant="outline" className="mt-4">
            Вернуться
          </Button>
        </div>
      </div>
    );
  }

  const handleParse = async () => {
    if (!documentId) return;
    
    setProcessingStage('downloading');
    setProcessingProgress(10);
    
    // Simulate progress stages
    const progressTimer = setInterval(() => {
      setProcessingProgress(prev => Math.min(prev + 5, 90));
    }, 1000);
    
    try {
      await parseDocument.mutateAsync(documentId);
      
      clearInterval(progressTimer);
      setProcessingStage('complete');
      setProcessingProgress(100);
      
      // Poll for results
      const pollInterval = setInterval(async () => {
        const { data: updatedDoc } = await supabase
          .from('medical_documents')
          .select('ai_processed, ai_summary')
          .eq('id', documentId)
          .single();
          
        if (updatedDoc?.ai_processed) {
          clearInterval(pollInterval);
          queryClient.invalidateQueries({ queryKey: ['lab-test-results', documentId] });
          queryClient.invalidateQueries({ queryKey: ['medical-documents'] });
          
          toast({
            title: '✅ Обработка завершена',
            description: updatedDoc.ai_summary || 'Биомаркеры успешно извлечены',
          });
          
          setProcessingStage(null);
          setProcessingProgress(0);
        }
      }, 2000);
      
    } catch (error) {
      clearInterval(progressTimer);
      setProcessingStage(null);
      setProcessingProgress(0);
    }
  };

  const onSaveMetadata = async (data: any) => {
    if (!documentId) return;

    const tagsArray = data.tags
      ? data.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
      : [];

    try {
      await updateDocument.mutateAsync({
        documentId,
        updates: {
          document_type: data.document_type as DocumentType,
          document_date: data.document_date,
          tags: tagsArray,
          notes: data.notes,
          hidden_from_trainer: data.hidden_from_trainer,
        },
      });
      setIsEditingMetadata(false);
    } catch (error) {
      // Error already handled by mutation
    }
  };

  const documentTypeLabels: Record<DocumentType, string> = {
    inbody: 'InBody анализ',
    blood_test: 'Анализ крови',
    medical_report: 'Медицинское заключение',
    progress_photo: 'Фото прогресса',
    other: 'Другой документ',
  };

  const groupedResults = results?.reduce((acc, result) => {
    const category = result.biomarker_master?.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(result);
    return acc;
  }, {} as Record<string, typeof results>);

  const categoryNames: Record<string, string> = {
    lipids: 'Липиды',
    metabolic: 'Метаболизм',
    hormones: 'Гормоны',
    liver: 'Печень',
    kidney: 'Почки',
    blood_count: 'Общий анализ крови',
    vitamins: 'Витамины',
    minerals: 'Минералы',
    inflammation: 'Воспаление',
    other: 'Другое',
  };

  const getStatusColor = (value: number, refMin?: number, refMax?: number) => {
    if (!refMin || !refMax) return 'normal';
    if (value < refMin) return 'low';
    if (value > refMax) return 'high';
    return 'normal';
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/medical-documents')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{document.file_name}</h1>
          <div className="flex flex-wrap gap-2 mt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {format(new Date(document.document_date || document.uploaded_at), 'dd MMMM yyyy', { locale: ru })}
            </div>
            {results && results.length > 0 && results[0].laboratory_name && (
              <div className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                {results[0].laboratory_name}
              </div>
            )}
          </div>
        </div>
        
        {!document.ai_processed && (
          <Button onClick={handleParse} disabled={parseDocument.isPending}>
            {parseDocument.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Activity className="mr-2 h-4 w-4" />
            Обработать AI
          </Button>
        )}
      </div>

      {/* Document Metadata Editor */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">📝 Информация о документе</CardTitle>
            {!isEditingMetadata ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingMetadata(true)}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Редактировать
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingMetadata(false)}
                >
                  Отмена
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit(onSaveMetadata)}
                  disabled={updateDocument.isPending}
                >
                  {updateDocument.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Сохранить
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditingMetadata ? (
            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Тип документа</Label>
                  <Select
                    value={watch('document_type')}
                    onValueChange={(value) => setValue('document_type', value as DocumentType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inbody">📊 InBody анализ</SelectItem>
                      <SelectItem value="blood_test">🩸 Анализ крови</SelectItem>
                      <SelectItem value="medical_report">📋 Медицинское заключение</SelectItem>
                      <SelectItem value="progress_photo">📸 Фото прогресса</SelectItem>
                      <SelectItem value="other">📄 Другой документ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Дата документа</Label>
                  <Input
                    type="date"
                    {...register('document_date')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Теги (через запятую)</Label>
                <Input
                  {...register('tags')}
                  placeholder="анализ крови, холестерин, контроль"
                />
              </div>

              <div className="space-y-2">
                <Label>Заметки</Label>
                <Textarea
                  {...register('notes')}
                  placeholder="Ваши заметки к документу..."
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="hidden-from-trainer"
                  checked={watch('hidden_from_trainer')}
                  onCheckedChange={(checked) => setValue('hidden_from_trainer', checked)}
                />
                <Label htmlFor="hidden-from-trainer" className="cursor-pointer">
                  Скрыть от тренера
                </Label>
              </div>
            </form>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Тип документа:</span>
                <Badge variant="secondary">{documentTypeLabels[document.document_type]}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Дата документа:</span>
                <span className="font-medium">
                  {format(new Date(document.document_date || document.uploaded_at), 'dd MMMM yyyy', { locale: ru })}
                </span>
              </div>
              {document.tags && document.tags.length > 0 && (
                <div className="flex items-start justify-between gap-2">
                  <span className="text-muted-foreground">Теги:</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {document.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {document.notes && (
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Заметки:</span>
                  <p className="text-foreground whitespace-pre-wrap">{document.notes}</p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Видимость для тренера:</span>
                <Badge variant={document.hidden_from_trainer ? 'secondary' : 'default'}>
                  {document.hidden_from_trainer ? '🔒 Скрыт' : '👁️ Виден'}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processing Progress */}
      {processingStage && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <p className="font-medium">
                  {processingStages[processingStage]?.label || 'Обработка документа...'}
                </p>
              </div>
              <Progress value={processingProgress} className="h-2" />
              <p className="text-sm text-muted-foreground">
                Это может занять 10-15 секунд. Gemini анализирует весь PDF...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : results && results.length > 0 ? (
        <div className="space-y-8">
          {/* Summary Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Обзор</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Всего показателей</p>
                  <p className="text-2xl font-bold">{results.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Категорий</p>
                  <p className="text-2xl font-bold">{Object.keys(groupedResults || {}).length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Дата анализа</p>
                  <p className="text-lg font-semibold">
                    {results[0]?.test_date && format(new Date(results[0].test_date), 'dd.MM.yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Лаборатория</p>
                  <p className="text-lg font-semibold truncate">
                    {results[0]?.laboratory_name || 'Не указана'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Biomarkers by Category */}
          {groupedResults && Object.entries(groupedResults).map(([category, categoryResults]) => (
            <div key={category}>
              <h2 className="text-xl font-semibold mb-4 capitalize">
                {categoryNames[category] || category}
              </h2>
              <div className="space-y-2">
                {categoryResults.map(result => (
                  <Card
                    key={result.id}
                    className="p-4 cursor-pointer hover:shadow-md transition-all"
                    onClick={() => result.biomarker_id && navigate(`/biomarkers/${result.biomarker_id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">
                          {result.biomarker_master?.display_name || result.raw_test_name}
                        </h3>
                        {result.biomarker_master?.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {result.biomarker_master.description}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-2xl font-bold">
                            {result.normalized_value}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {result.normalized_unit}
                          </p>
                        </div>
                        
                        <Badge
                          variant="outline"
                          className={cn(
                            getStatusColor(result.normalized_value, result.ref_range_min, result.ref_range_max) === 'low' && 'text-yellow-600 bg-yellow-50 border-yellow-200',
                            getStatusColor(result.normalized_value, result.ref_range_min, result.ref_range_max) === 'normal' && 'text-green-600 bg-green-50 border-green-200',
                            getStatusColor(result.normalized_value, result.ref_range_min, result.ref_range_max) === 'high' && 'text-red-600 bg-red-50 border-red-200'
                          )}
                        >
                          {getStatusColor(result.normalized_value, result.ref_range_min, result.ref_range_max) === 'low' && 'Ниже'}
                          {getStatusColor(result.normalized_value, result.ref_range_min, result.ref_range_max) === 'normal' && 'Норма'}
                          {getStatusColor(result.normalized_value, result.ref_range_min, result.ref_range_max) === 'high' && 'Выше'}
                        </Badge>
                        
                        {(result.ref_range_min !== null && result.ref_range_max !== null) && (
                          <p className="text-xs text-muted-foreground whitespace-nowrap">
                            {result.ref_range_min} - {result.ref_range_max}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              Данные не извлечены. Нажмите "Обработать AI" чтобы извлечь биомаркеры из документа.
            </p>
            <Button onClick={handleParse} disabled={parseDocument.isPending}>
              {parseDocument.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Обработать документ
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
