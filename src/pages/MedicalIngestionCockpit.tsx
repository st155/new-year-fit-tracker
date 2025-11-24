import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

  // Retry mutation
  const retryMutation = useMutation({
    mutationFn: async () => {
      if (!documentId) throw new Error('No document ID');
      
      setIsRetrying(true);
      
      const { error } = await supabase.functions.invoke('parse-lab-report', {
        body: { documentId }
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-document', documentId] });
      toast.success('Документ отправлен на повторную обработку');
    },
    onError: (error: any) => {
      console.error('Retry failed:', error);
      toast.error('Ошибка повторной обработки', { description: error.message });
    },
    onSettled: () => {
      setIsRetrying(false);
    }
  });

  // Auto-process pending documents (removed useEffect to avoid duplicate calls)
  // Users can manually retry via ErrorDetailsPanel if needed

  if (isLoading) {
    return <PageLoader message="Loading document..." />;
  }

  if (error || !document) {
    return (
      <div className="h-screen bg-neutral-950 flex items-center justify-center p-8">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load document. Please try again.
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
              processingError={document.processing_error || 'Unknown error'}
              processingErrorDetails={document.processing_error_details}
              onRetry={() => retryMutation.mutate()}
              isRetrying={isRetrying}
            />
          </div>
        )}
        
        {/* Show Extraction Dashboard for completed documents */}
        {document.processing_status === 'completed' && (
          <>
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
                {document.processing_status === 'pending' ? 'Ожидает обработки...' : 'Обрабатывается AI...'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MedicalIngestionCockpit;
