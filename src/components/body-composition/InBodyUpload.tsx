import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Upload, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { inbodyApi } from "@/lib/api";
import { convertPdfToImages } from "@/lib/pdf-to-image";

interface InBodyUploadProps {
  onUploadSuccess?: () => void;
  onSuccess?: () => void;
}

export const InBodyUpload = ({ onUploadSuccess, onSuccess }: InBodyUploadProps) => {
  const { t } = useTranslation('body');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<'idle' | 'uploading' | 'saving' | 'complete'>('idle');
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: t('upload.invalidFile'),
        description: t('upload.pleaseUploadPdf'),
        variant: "destructive"
      });
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: t('upload.fileTooLarge'),
        description: t('upload.maxFileSize'),
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: t('upload.authError'),
          description: t('upload.pleaseLogin'),
          variant: "destructive"
        });
        return;
      }

      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      
      console.log('Starting upload for:', fileName);
      
      setUploading(true);
      setUploadProgress(0);
      setUploadStage('uploading');
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('inbody-pdfs')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        toast({
          title: t('upload.uploadFailed'),
          description: uploadError.message,
          variant: "destructive"
        });
        setUploading(false);
        setUploadStage('idle');
        return;
      }

      setUploadProgress(80);
      setUploadStage('saving');
      console.log('Upload successful, creating database record...');

      const { data: uploadRecord, error: dbError } = await supabase
        .from('inbody_uploads')
        .insert({
          user_id: user.id,
          file_name: file.name,
          storage_path: uploadData.path,
          file_size: file.size,
          status: 'uploaded'
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database insert error:', dbError);
        toast({
          title: t('upload.databaseError'),
          description: dbError.message,
          variant: "destructive"
        });
        setUploading(false);
        setUploadStage('idle');
        return;
      }

      setUploadProgress(100);
      setUploadStage('complete');
      console.log('Upload complete:', uploadRecord);

      toast({
        title: t('toasts.pdfUploaded'),
        description: t('toasts.analysisStarted')
      });

      // Автоматический запуск анализа в фоновом режиме
      setTimeout(async () => {
        try {
          console.log('Starting automatic analysis for upload:', uploadRecord.id);
          
          const { data: { signedUrl }, error: signedUrlError } = await supabase.storage
            .from('inbody-pdfs')
            .createSignedUrl(uploadData.path, 300);

          if (signedUrlError) throw signedUrlError;
          if (!signedUrl) throw new Error('Failed to get signed URL');

          console.log('Converting PDF to images...');
          
          // Увеличиваем таймаут до 3 минут для больших файлов
          const images = await convertPdfToImages(signedUrl, {
            fetchTimeoutMs: 180000,
            scale: 1.5,
            onProgress: (current, total) => {
              console.log(`PDF conversion progress: ${current}/${total} pages`);
            },
          });

          if (!images || images.length === 0) {
            throw new Error(t('history.cannotConvertPdf'));
          }

          console.log(`Converted ${images.length} pages, sending to AI for analysis...`);

          const { data: analysisData, error: analysisError } = await inbodyApi.parse(images, uploadRecord.id);

          if (analysisError) {
            console.error('Analysis error:', analysisError);
            throw analysisError;
          }

          console.log('Analysis completed successfully:', analysisData);

          const reportsCount = analysisData?.reports_count || analysisData?.analyses?.length || 1;
          toast({
            title: t('toasts.analysisComplete'),
            description: reportsCount > 1 
              ? t('toasts.reportsCreated', { count: reportsCount })
              : t('toasts.dataExtracted')
          });
          
          // Обновляем данные после успешного анализа
          if (onUploadSuccess) onUploadSuccess();
          if (onSuccess) onSuccess();
        } catch (analysisError) {
          console.error('Auto-analysis error:', analysisError);
          toast({
            title: t('toasts.analysisError'),
            description: t('toasts.tryManualAnalysis'),
            variant: "destructive"
          });
        }
      }, 100);

      if (onUploadSuccess) {
        onUploadSuccess();
      }
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: t('upload.uploadError'),
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setTimeout(() => {
        setUploadStage('idle');
        setUploadProgress(0);
      }, 2000);
    }
  };

  return (
    <Card className="border-2 border-dashed border-primary/20 bg-card/50 backdrop-blur-sm hover:border-primary/40 transition-all">
      <CardContent className="flex flex-col items-center justify-center py-12 px-6">
        <div className="mb-4">
          {uploading ? (
            <div className="rounded-full bg-primary/10 p-6">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            </div>
          ) : (
            <div className="rounded-full bg-primary/10 p-6">
              <FileText className="h-12 w-12 text-primary" />
            </div>
          )}
        </div>

        <h3 className="text-xl font-semibold mb-2">{t('upload.title')}</h3>
        <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
          {uploading && uploadStage === 'uploading'
            ? t('upload.uploadingToCloud')
            : uploading && uploadStage === 'saving'
            ? t('upload.savingToDatabase')
            : t('upload.description')}
        </p>

        {uploading && (
          <div className="w-full max-w-md mb-6 space-y-2">
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-sm text-center text-muted-foreground">
              {uploadProgress}%
            </p>
          </div>
        )}

        <div className="relative inline-flex">
          <Button
            variant="default"
            size="lg"
            disabled={uploading}
            type="button"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('upload.uploading')}
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {t('upload.selectPdf')}
              </>
            )}
          </Button>
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading}
          />
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          {t('upload.formatHint')}
        </p>
      </CardContent>
    </Card>
  );
};
