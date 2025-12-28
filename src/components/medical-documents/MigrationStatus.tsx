import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, AlertCircle, Database } from "lucide-react";
import { documentsApi } from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation('medicalDocs');

  const handleMigration = async () => {
    setIsMigrating(true);
    setResult(null);

    try {
      const { data, error } = await documentsApi.migrateToMedicalDocuments('migrate_all');

      if (error) throw error;

      setResult(data as any);
      
      toast({
        title: t('migration.complete'),
        description: t('migration.successDesc', { count: data.total_migrated }),
      });
    } catch (error) {
      console.error('Migration error:', error);
      toast({
        title: t('migration.error'),
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
          {t('migration.title')}
        </CardTitle>
        <CardDescription>
          {t('migration.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!result && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('migration.warning')}
            </AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">{t('migration.success')}</span>
            </div>

            {result.inbody && (
              <div className="border rounded-lg p-3 space-y-1">
                <div className="font-medium">{t('migration.inbodyDocs')}</div>
                <div className="text-sm text-muted-foreground">
                  {t('migration.transferred', { migrated: result.inbody.migrated, total: result.inbody.total })}
                </div>
                {result.inbody.errors && result.inbody.errors.length > 0 && (
                  <div className="text-sm text-destructive">
                    {t('migration.errors', { count: result.inbody.errors.length })}
                  </div>
                )}
              </div>
            )}

            {result.photos && (
              <div className="border rounded-lg p-3 space-y-1">
                <div className="font-medium">{t('migration.progressPhotos')}</div>
                <div className="text-sm text-muted-foreground">
                  {t('migration.transferred', { migrated: result.photos.migrated, total: result.photos.total })}
                </div>
                {result.photos.errors && result.photos.errors.length > 0 && (
                  <div className="text-sm text-destructive">
                    {t('migration.errors', { count: result.photos.errors.length })}
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 border-t">
              <div className="text-lg font-semibold">
                {t('migration.totalTransferred', { count: result.total_migrated })}
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
          {isMigrating ? t('migration.migrating') : result ? t('migration.retry') : t('migration.start')}
        </Button>
      </CardContent>
    </Card>
  );
};
