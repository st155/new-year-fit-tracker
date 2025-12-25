import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, AlertCircle, Database } from "lucide-react";
import { documentsApi } from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MigrationResult {
  migrated: number;
  total: number;
  errors?: Array<{ upload_id?: string; record_id?: string; error: string }>;
}

export const MigrationStatus = () => {
  const [isMigrating, setIsMigrating] = useState(false);
  const [result, setResult] = useState<{
    inbody?: MigrationResult;
    photos?: MigrationResult;
    total_migrated?: number;
  } | null>(null);
  const { toast } = useToast();

  const handleMigration = async () => {
    setIsMigrating(true);
    setResult(null);

    try {
      const { data, error } = await documentsApi.migrateToMedicalDocuments('migrate_all');

      if (error) throw error;

      setResult(data as any);
      
      toast({
        title: "Миграция завершена",
        description: `Успешно перенесено ${data.total_migrated} документов`,
      });
    } catch (error) {
      console.error('Migration error:', error);
      toast({
        title: "Ошибка миграции",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Миграция данных в новую систему
        </CardTitle>
        <CardDescription>
          Перенос InBody анализов и фотографий прогресса в универсальную систему медицинских документов
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!result && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Эта операция переместит все ваши существующие InBody PDF и фотографии прогресса в новую систему хранения. 
              Старые данные останутся доступными, но будут помечены как мигрированные.
            </AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Миграция успешно завершена</span>
            </div>

            {result.inbody && (
              <div className="border rounded-lg p-3 space-y-1">
                <div className="font-medium">InBody документы</div>
                <div className="text-sm text-muted-foreground">
                  Перенесено: {result.inbody.migrated} из {result.inbody.total}
                </div>
                {result.inbody.errors && result.inbody.errors.length > 0 && (
                  <div className="text-sm text-destructive">
                    Ошибок: {result.inbody.errors.length}
                  </div>
                )}
              </div>
            )}

            {result.photos && (
              <div className="border rounded-lg p-3 space-y-1">
                <div className="font-medium">Фотографии прогресса</div>
                <div className="text-sm text-muted-foreground">
                  Перенесено: {result.photos.migrated} из {result.photos.total}
                </div>
                {result.photos.errors && result.photos.errors.length > 0 && (
                  <div className="text-sm text-destructive">
                    Ошибок: {result.photos.errors.length}
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 border-t">
              <div className="text-lg font-semibold">
                Всего перенесено: {result.total_migrated}
              </div>
            </div>
          </div>
        )}

        <Button
          onClick={handleMigration}
          disabled={isMigrating}
          className="w-full"
        >
          {isMigrating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isMigrating ? 'Миграция...' : result ? 'Повторить миграцию' : 'Начать миграцию'}
        </Button>
      </CardContent>
    </Card>
  );
};
