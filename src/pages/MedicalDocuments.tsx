import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BulkDocumentUpload } from '@/components/medical-documents/BulkDocumentUpload';
import { DocumentsGrid } from '@/components/medical-documents/DocumentsGrid';
import { DocumentFilters } from '@/components/medical-documents/DocumentFilters';
import { DocumentStats } from '@/components/medical-documents/DocumentStats';
import { MigrationStatus } from '@/components/medical-documents/MigrationStatus';
import { DocumentTrends } from '@/components/medical-documents/DocumentTrends';
import { HealthRecommendations } from '@/components/medical-documents/HealthRecommendations';
import { FileText, Upload, Database, TrendingUp, Lightbulb } from 'lucide-react';
import '@/components/medical-documents/medical-documents.css';

const MedicalDocuments = () => {
  const [filterType, setFilterType] = useState<string>('all');

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
          <DocumentFilters 
            filterType={filterType} 
            onFilterChange={setFilterType}
          />
          <DocumentStats />
          <DocumentsGrid filterType={filterType} />
        </TabsContent>

        <TabsContent value="trends">
          <DocumentTrends />
        </TabsContent>

        <TabsContent value="recommendations">
          <HealthRecommendations />
        </TabsContent>

        <TabsContent value="upload">
          <BulkDocumentUpload />
        </TabsContent>

        <TabsContent value="migration">
          <MigrationStatus />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MedicalDocuments;
