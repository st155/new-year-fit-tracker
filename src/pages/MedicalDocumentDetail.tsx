import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2, FileText, Calendar, Building2, Activity, Edit2, Save, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
} from "@/components/ui/alert-dialog";
import { useLabTestResults } from '@/hooks/useBiomarkers';
import { useMedicalDocuments, DocumentType } from '@/hooks/useMedicalDocuments';
import { BiomarkerCard } from '@/components/biomarkers/BiomarkerCard';
import { BiomarkerMappingDialog } from '@/components/biomarkers/BiomarkerMappingDialog';
import { PDFViewerPanel } from '@/components/medical-documents/PDFViewerPanel';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { documentsApi } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';

export default function MedicalDocumentDetail() {
  const { t } = useTranslation('medicalDocs');
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const processingStages = {
    'downloading': { label: t('detail.processing.downloading'), progress: 10 },
    'converting': { label: t('detail.processing.converting'), progress: 20 },
    'analyzing': { label: t('detail.processing.analyzing'), progress: 50 },
    'saving': { label: t('detail.processing.saving'), progress: 85 },
    'complete': { label: t('detail.processing.complete'), progress: 100 },
  } as const;
  
  const { documents, updateDocument, deleteDocument } = useMedicalDocuments();
  const { results, isLoading, parseDocument } = useLabTestResults(documentId);
  
  const [processingStage, setProcessingStage] = useState<keyof typeof processingStages | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [isRematching, setIsRematching] = useState(false);
  const [isEditingFileName, setIsEditingFileName] = useState(false);
  const [editedFileName, setEditedFileName] = useState('');
  
  const document = documents?.find(d => d.id === documentId);
  const unmatchedResults = results?.filter(r => !r.biomarker_id) || [];

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
      setEditedFileName(document.file_name);
    }
  }, [document, setValue]);

  const handleDelete = async () => {
    if (!documentId) return;
    try {
      await deleteDocument.mutateAsync(documentId);
      showSuccessToast(t('detail.toast.deleted'), t('detail.toast.deletedDesc'));
      navigate('/medical-documents');
    } catch (error: any) {
      showErrorToast(t('detail.toast.deleteError'), error.message);
    }
  };

  const handleSaveFileName = async () => {
    if (!documentId || !editedFileName.trim()) return;
    try {
      await updateDocument.mutateAsync({
        documentId,
        updates: { file_name: editedFileName.trim() },
      });
      setIsEditingFileName(false);
      showSuccessToast(t('detail.toast.filenameSaved'), t('detail.toast.filenameDesc'));
    } catch (error: any) {
      showErrorToast(t('detail.toast.error'), error.message);
    }
  };

  if (!document) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <p className="text-muted-foreground">{t('detail.notFound')}</p>
          <Button onClick={() => navigate('/medical-documents')} variant="outline" className="mt-4">
            {t('detail.back')}
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
            title: t('detail.toast.processingComplete'),
            description: updatedDoc.ai_summary || t('detail.toast.biomarkersExtracted'),
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

  const handleResetAndRetry = async () => {
    if (!documentId) return;
    
    try {
      // Reset processing status in database
      await supabase
        .from('medical_documents')
        .update({
          ai_processed: false,
          processing_status: 'pending',
          processing_error: null,
          processing_error_details: null
        })
        .eq('id', documentId);
      
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['medical-documents'] });
      
      showSuccessToast(t('detail.toast.statusReset'), t('detail.toast.statusResetDesc'));
      
      // Trigger parsing
      await handleParse();
    } catch (error: any) {
      showErrorToast(t('detail.toast.resetError'), error.message);
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
    inbody: t('detail.types.inbody'),
    blood_test: t('detail.types.blood_test'),
    fitness_report: t('detail.types.fitness_report'),
    progress_photo: t('detail.types.progress_photo'),
    vo2max: t('detail.types.vo2max'),
    caliper: t('detail.types.caliper'),
    prescription: t('detail.types.prescription'),
    training_program: t('detail.types.training_program'),
    other: t('detail.types.other'),
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
    lipids: t('detail.categories.lipids'),
    metabolic: t('detail.categories.metabolic'),
    hormones: t('detail.categories.hormones'),
    liver: t('detail.categories.liver'),
    kidney: t('detail.categories.kidney'),
    blood_count: t('detail.categories.blood_count'),
    vitamins: t('detail.categories.vitamins'),
    minerals: t('detail.categories.minerals'),
    inflammation: t('detail.categories.inflammation'),
    other: t('detail.categories.other'),
  };

  const getStatusColor = (value: number, refMin?: number, refMax?: number) => {
    if (!refMin || !refMax) return 'normal';
    if (value < refMin) return 'low';
    if (value > refMax) return 'high';
    return 'normal';
  };

  const handleRematch = async () => {
    if (!documentId) return;
    setIsRematching(true);

    try {
      const { data, error } = await documentsApi.rematchBiomarkers(documentId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['lab-test-results', documentId] });
      
      showSuccessToast(
        t('detail.toast.rematchComplete'),
        t('detail.toast.rematchResult', { matched: data?.rematchedCount || 0, total: data?.totalUnmatched || 0 })
      );
    } catch (error: any) {
      showErrorToast(t('detail.toast.rematchError'), error.message);
    } finally {
      setIsRematching(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
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
          {isEditingFileName ? (
            <div className="flex items-center gap-2">
              <Input
                value={editedFileName}
                onChange={(e) => setEditedFileName(e.target.value)}
                className="text-xl font-bold max-w-xl"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveFileName();
                  if (e.key === 'Escape') {
                    setIsEditingFileName(false);
                    setEditedFileName(document.file_name);
                  }
                }}
              />
              <Button size="sm" onClick={handleSaveFileName} disabled={updateDocument.isPending}>
                <Save className="h-4 w-4" />
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => {
                  setIsEditingFileName(false);
                  setEditedFileName(document.file_name);
                }}
              >
                {t('detail.cancel')}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{document.file_name}</h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingFileName(true)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
          )}
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
        
        <div className="flex items-center gap-2">
          {(!document.ai_processed || 
            document.processing_status === 'error' || 
            (document.ai_processed && results?.length === 0)) && (
            <Button onClick={handleParse} disabled={parseDocument.isPending}>
              {parseDocument.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Activity className="mr-2 h-4 w-4" />
              {t('detail.processAI')}
            </Button>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('detail.deleteConfirmTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('detail.deleteConfirmDesc')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('detail.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                  {t('detail.delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Split View: PDF + Content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* PDF Viewer - Left Side (40%) */}
        <div className="lg:col-span-2">
          <PDFViewerPanel
            documentId={documentId!}
            storagePath={document.storage_path}
          />
        </div>

        {/* Content - Right Side (60%) */}
        <div className="lg:col-span-3 space-y-6">

          {/* Document Metadata Editor */}
          <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">📝 {t('detail.infoTitle')}</CardTitle>
            {!isEditingMetadata ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingMetadata(true)}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                {t('detail.edit')}
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingMetadata(false)}
                >
                  {t('detail.cancel')}
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
                  {t('detail.save')}
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
                  <Label>{t('detail.labels.documentType')}</Label>
                  <Select
                    value={watch('document_type')}
                    onValueChange={(value) => setValue('document_type', value as DocumentType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inbody">📊 {t('detail.types.inbody')}</SelectItem>
                      <SelectItem value="blood_test">🩸 {t('detail.types.blood_test')}</SelectItem>
                      <SelectItem value="fitness_report">📋 {t('detail.types.fitness_report')}</SelectItem>
                      <SelectItem value="progress_photo">📸 {t('detail.types.progress_photo')}</SelectItem>
                      <SelectItem value="vo2max">🫁 {t('detail.types.vo2max')}</SelectItem>
                      <SelectItem value="caliper">📏 {t('detail.types.caliper')}</SelectItem>
                      <SelectItem value="prescription">💊 {t('detail.types.prescription')}</SelectItem>
                      <SelectItem value="training_program">🏋️ {t('detail.types.training_program')}</SelectItem>
                      <SelectItem value="other">📄 {t('detail.types.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('detail.labels.documentDate')}</Label>
                  <Input
                    type="date"
                    {...register('document_date')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('detail.labels.tags')}</Label>
                <Input
                  {...register('tags')}
                  placeholder={t('detail.labels.tagsPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('detail.labels.notes')}</Label>
                <Textarea
                  {...register('notes')}
                  placeholder={t('detail.labels.notesPlaceholder')}
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
                  {t('detail.labels.hideFromTrainer')}
                </Label>
              </div>
            </form>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('detail.labels.documentType')}:</span>
                <Badge variant="secondary">{documentTypeLabels[document.document_type]}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('detail.labels.documentDate')}:</span>
                <span className="font-medium">
                  {format(new Date(document.document_date || document.uploaded_at), 'dd MMMM yyyy', { locale: ru })}
                </span>
              </div>
              {document.tags && document.tags.length > 0 && (
                <div className="flex items-start justify-between gap-2">
                  <span className="text-muted-foreground">{t('detail.labels.tags')}:</span>
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
                  <span className="text-muted-foreground">{t('detail.labels.notes')}:</span>
                  <p className="text-foreground whitespace-pre-wrap">{document.notes}</p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('detail.labels.trainerVisibility')}:</span>
                <Badge variant={document.hidden_from_trainer ? 'secondary' : 'default'}>
                  {document.hidden_from_trainer ? t('detail.labels.hidden') : t('detail.labels.visible')}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Alert with Reset Button */}
      {document.processing_status === 'error' && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('detail.error.title')}</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <p>{document.processing_error || t('detail.error.unknown')}</p>
            <Button 
              onClick={handleResetAndRetry}
              variant="outline"
              size="sm"
              className="w-fit"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Processing Progress */}
      {processingStage && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <p className="font-medium">
                  {processingStages[processingStage]?.label || t('detail.processing.inProgress')}
                </p>
              </div>
              <Progress value={processingProgress} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {t('detail.processing.hint')}
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
          {/* Unmatched Biomarkers Alert */}
          {unmatchedResults.length > 0 && (
            <Alert className="border-yellow-500/50 bg-yellow-500/10">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertTitle>{t('detail.unmatched.title')}</AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                <span>
                  {t('detail.unmatched.description', { count: unmatchedResults.length })}
                </span>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleRematch}
                    disabled={isRematching}
                  >
                    {isRematching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t('detail.unmatched.rematch')}
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => setShowMappingDialog(true)}
                  >
                    {t('detail.unmatched.manualMatch')}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Summary Stats */}
          <Card>
            <CardHeader>
              <CardTitle>{t('detail.summary.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('detail.summary.totalIndicators')}</p>
                  <p className="text-2xl font-bold">{results.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('detail.summary.categories')}</p>
                  <p className="text-2xl font-bold">{Object.keys(groupedResults || {}).length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('detail.summary.analysisDate')}</p>
                  <p className="text-lg font-semibold">
                    {results[0]?.test_date && format(new Date(results[0].test_date), 'dd.MM.yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('detail.summary.laboratory')}</p>
                  <p className="text-lg font-semibold truncate">
                    {results[0]?.laboratory_name || t('detail.summary.notSpecified')}
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
                          {getStatusColor(result.normalized_value, result.ref_range_min, result.ref_range_max) === 'low' && t('detail.status.low')}
                          {getStatusColor(result.normalized_value, result.ref_range_min, result.ref_range_max) === 'normal' && t('detail.status.normal')}
                          {getStatusColor(result.normalized_value, result.ref_range_min, result.ref_range_max) === 'high' && t('detail.status.high')}
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
              {t('detail.empty.title')}. {t('detail.empty.description')}
            </p>
            <Button onClick={handleParse} disabled={parseDocument.isPending}>
              {parseDocument.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('detail.empty.processButton')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Biomarker Mapping Dialog */}
      <BiomarkerMappingDialog
        open={showMappingDialog}
        onOpenChange={setShowMappingDialog}
        unmatchedResults={unmatchedResults}
      />
        </div>
      </div>
    </div>
  );
}
