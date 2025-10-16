import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentUpload } from '@/components/medical-documents/DocumentUpload';
import { DocumentsList } from '@/components/medical-documents/DocumentsList';
import { MigrationStatus } from '@/components/medical-documents/MigrationStatus';
import { FileText, Upload, Database } from 'lucide-react';

const MedicalDocuments = () => {
  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Медицинские документы</h1>
        <p className="text-muted-foreground">
          Управление вашими медицинскими документами, анализами и фотографиями прогресса
        </p>
      </div>

      <Tabs defaultValue="documents" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            Документы
          </TabsTrigger>
          <TabsTrigger value="upload" className="gap-2">
            <Upload className="h-4 w-4" />
            Загрузка
          </TabsTrigger>
          <TabsTrigger value="migration" className="gap-2">
            <Database className="h-4 w-4" />
            Миграция
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents">
          <DocumentsList />
        </TabsContent>

        <TabsContent value="upload">
          <DocumentUpload />
        </TabsContent>

        <TabsContent value="migration">
          <MigrationStatus />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MedicalDocuments;
