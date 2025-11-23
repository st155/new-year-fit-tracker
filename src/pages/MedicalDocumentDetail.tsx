import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, FileText, Calendar, Building2, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useLabTestResults } from '@/hooks/useBiomarkers';
import { useMedicalDocuments } from '@/hooks/useMedicalDocuments';
import { BiomarkerCard } from '@/components/biomarkers/BiomarkerCard';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

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
  
  const { documents } = useMedicalDocuments();
  const { results, isLoading, parseDocument } = useLabTestResults(documentId);
  
  const [processingStage, setProcessingStage] = useState<keyof typeof processingStages | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  
  const document = documents?.find(d => d.id === documentId);

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
