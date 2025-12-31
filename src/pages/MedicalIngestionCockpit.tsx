import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { documentsApi } from '@/lib/api';
import { PDFViewerPanel } from '@/components/medical-documents/PDFViewerPanel';
import { ExtractionDashboard } from '@/components/medical-documents/ExtractionDashboard';
import { DetectedRxPanel } from '@/components/biostack/DetectedRxPanel';
import { ErrorDetailsPanel } from '@/components/medical-documents/ErrorDetailsPanel';
import { useDoctorRecommendations } from '@/hooks/biostack/useDoctorRecommendations';
import { PageLoader } from '@/components/ui/page-loader';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const MedicalIngestionCockpit = () => {
  const { t } = useTranslation('medicalDocs');
  const { documentId } = useParams<{ documentId: string }>();
  const queryClient = useQueryClient();
  const { recommendations } = useDoctorRecommendations(documentId || '');
  const [isRetrying, setIsRetrying] = useState(false);

  const { data: document, isLoading, error } = useQuery({
    queryKey: ['medical-document', documentId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('medical_documents')
        .select('*')
        .eq('id', documentId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!documentId,
    refetchInterval: (query) => {
      const doc = query.state.data;
      return doc?.processing_status === 'pending' || doc?.processing_status === 'processing' ? 3000 : false;
    },
  });

  // Retry/Reprocess mutation
  const retryMutation = useMutation({
    mutationFn: async () => {
      if (!documentId) throw new Error('No document ID');
      
      setIsRetrying(true);
      
      // First reset processing status to pending
      await supabase
        .from('medical_documents')
        .update({ 
          processing_status: 'pending',
          processing_error: null,
          processing_error_details: null
        })
        .eq('id', documentId);
      
      // Then invoke parse-lab-report
      const { error } = await documentsApi.parseLabReport(documentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-document', documentId] });
      toast.success(t('ingestion.retryStarted'));
    },
    onError: (error: any) => {
      console.error('Retry failed:', error);
      toast.error(t('ingestion.retryError'), { description: error.message });
    },
    onSettled: () => {
      setIsRetrying(false);
    }
  });

  // Auto-process pending documents (removed useEffect to avoid duplicate calls)
  // Users can manually retry via ErrorDetailsPanel if needed

  if (isLoading) {
    return <PageLoader message={t('ingestion.loading')} />;
  }

  if (error || !document) {
    return (
      <div className="h-screen bg-neutral-950 flex items-center justify-center p-8">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t('ingestion.loadError')}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="h-screen bg-neutral-950 flex overflow-hidden">
      {/* Left: PDF Viewer (40%) */}
      <div className="w-2/5 border-r border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
        <PDFViewerPanel documentId={documentId!} storagePath={document.storage_path} />
      </div>

      {/* Right: Error Panel OR Extraction Dashboard + DetectedRxPanel (60%) */}
      <div className="w-3/5 flex flex-col overflow-y-auto">
        {/* Show ErrorDetailsPanel if document has error status */}
        {document.processing_status === 'error' && (
          <div className="p-4">
            <ErrorDetailsPanel
              documentId={documentId!}
              processingError={document.processing_error || t('ingestion.unknownError')}
              processingErrorDetails={document.processing_error_details}
              onRetry={() => retryMutation.mutate()}
              isRetrying={isRetrying}
            />
          </div>
        )}
        
        {/* Show Extraction Dashboard for completed documents */}
        {document.processing_status === 'completed' && (
          <>
            {/* Reprocess button for lab documents with potential missing data */}
            {(document.category === 'lab_blood' || document.category === 'lab_urine') && (
              <div className="px-4 pt-4">
                <button
                  onClick={() => retryMutation.mutate()}
                  disabled={isRetrying}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-purple-500/50 text-purple-400 rounded-lg hover:bg-neutral-800 hover:border-purple-500 transition-all disabled:opacity-50"
                >
                  <span>🔄</span>
                  <span>{isRetrying ? t('ingestion.reprocessing') : t('ingestion.reprocess')}</span>
                </button>
              </div>
            )}
            
            <ExtractionDashboard
              documentId={documentId!}
              category={document.category || 'lab_blood'}
            />
            
            {/* DetectedRxPanel (conditionally rendered) */}
            {recommendations.length > 0 && (
              <div className="mt-4 px-4 pb-4">
                <DetectedRxPanel documentId={documentId!} />
              </div>
            )}
          </>
        )}
        
        {/* Show loading state for pending/processing documents */}
        {(document.processing_status === 'pending' || document.processing_status === 'processing') && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" />
              <p className="text-green-400 font-mono">
                {document.processing_status === 'pending' ? t('ingestion.pending') : t('ingestion.processingAI')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MedicalIngestionCockpit;
