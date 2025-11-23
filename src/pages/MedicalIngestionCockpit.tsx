import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PDFViewerPanel } from '@/components/medical-documents/PDFViewerPanel';
import { ExtractionDashboard } from '@/components/medical-documents/ExtractionDashboard';
import { PageLoader } from '@/components/ui/page-loader';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const MedicalIngestionCockpit = () => {
  const { documentId } = useParams<{ documentId: string }>();

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
  });

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
