import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PDFViewerPanel } from '@/components/medical-documents/PDFViewerPanel';
import { ExtractionDashboard } from '@/components/medical-documents/ExtractionDashboard';
import { PageLoader } from '@/components/ui/page-loader';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const MedicalIngestionCockpit = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const queryClient = useQueryClient();

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

  // Auto-process pending documents
  useEffect(() => {
    if (document?.processing_status === 'pending') {
      triggerProcessing();
    }
  }, [document?.id, document?.processing_status]);

  const triggerProcessing = async () => {
    if (!documentId) return;

    try {
      console.log('[Cockpit] Auto-processing pending document:', documentId);
      
      const { error } = await supabase.functions.invoke('parse-lab-report', {
        body: { documentId }
      });

      if (error) throw error;

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['medical-document', documentId] });
      toast.success('Документ обрабатывается');
    } catch (error: any) {
      console.error('[Cockpit] Auto-processing failed:', error);
      toast.error('Ошибка обработки', { description: error.message });
    }
  };

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

      {/* Right: Extraction Dashboard (60%) */}
      <div className="w-3/5 flex flex-col overflow-hidden">
        <ExtractionDashboard
          documentId={documentId!}
          category={document.category || 'lab_blood'}
        />
      </div>
    </div>
  );
};

export default MedicalIngestionCockpit;
