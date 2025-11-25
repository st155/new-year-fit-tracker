import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BulkDocumentUpload } from '@/components/medical-documents/BulkDocumentUpload';
import { DocumentsGrid } from '@/components/medical-documents/DocumentsGrid';
import { DocumentFilters } from '@/components/medical-documents/DocumentFilters';
import { DocumentStats } from '@/components/medical-documents/DocumentStats';
import { MigrationStatus } from '@/components/medical-documents/MigrationStatus';
import { UniversalTrendsView } from '@/components/medical-documents/UniversalTrendsView';
import { RecommendationsHistory } from '@/components/medical-documents/RecommendationsHistory';
import { CategorySummaryDashboard } from '@/components/medical-documents/CategorySummaryDashboard';
import { BatchProcessingDialog } from '@/components/medical-documents/BatchProcessingDialog';
import { HealthAnalysisWidget } from '@/components/medical-documents/HealthAnalysisWidget';
import { FileText, Upload, Database, TrendingUp, Lightbulb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import '@/components/medical-documents/medical-documents.css';

const MedicalDocuments = () => {
  const [filterType, setFilterType] = useState<string>('all');
  const [showBatchDialog, setShowBatchDialog] = useState(false);

  const { data: pendingCount = 0, refetch: refetchPendingCount } = useQuery({
    queryKey: ['pending-documents-count'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await supabase
        .from('medical_documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('processing_status', 'pending');

      if (error) throw error;
      return count || 0;
    }
  });

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <Tabs defaultValue="documents" className="space-y-4">
        <TabsList className="glass-card grid w-full grid-cols-5 h-auto p-1">
          <TabsTrigger value="documents" className="gap-2 data-[state=active]:bg-primary/20">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Документы</span>
          </TabsTrigger>
          <TabsTrigger value="trends" className="gap-2 data-[state=active]:bg-primary/20">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Тренды</span>
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="gap-2 data-[state=active]:bg-primary/20">
            <Lightbulb className="h-4 w-4" />
            <span className="hidden sm:inline">Советы</span>
          </TabsTrigger>
          <TabsTrigger value="upload" className="gap-2 data-[state=active]:bg-primary/20">
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Загрузка</span>
          </TabsTrigger>
          <TabsTrigger value="migration" className="gap-2 data-[state=active]:bg-primary/20">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Миграция</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          <CategorySummaryDashboard />
          <DocumentFilters 
            filterType={filterType} 
            onFilterChange={setFilterType}
            pendingCount={pendingCount}
            onBatchProcess={() => setShowBatchDialog(true)}
          />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <DocumentStats />
            <HealthAnalysisWidget />
          </div>
          <DocumentsGrid filterType={filterType} />
        </TabsContent>

        <TabsContent value="trends">
          <UniversalTrendsView />
        </TabsContent>

        <TabsContent value="recommendations">
          <RecommendationsHistory />
        </TabsContent>

        <TabsContent value="upload">
          <BulkDocumentUpload />
        </TabsContent>

        <TabsContent value="migration">
          <MigrationStatus />
        </TabsContent>
      </Tabs>

      <BatchProcessingDialog
        open={showBatchDialog}
        onOpenChange={setShowBatchDialog}
        onComplete={() => {
          refetchPendingCount();
        }}
      />
    </div>
  );
};

export default MedicalDocuments;
