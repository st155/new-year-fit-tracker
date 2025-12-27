import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileX, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ErrorLogger } from '@/lib/error-logger';
import { supabase } from '@/integrations/supabase/client';
import { healthApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface AppleHealthUploadProps {
  onUploadComplete?: (data: any) => void;
}

export function AppleHealthUpload({ onUploadComplete }: AppleHealthUploadProps) {
  const { t } = useTranslation('integrations');
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'complete' | 'error'>('idle');
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [processingPhase, setProcessingPhase] = useState<string>('');
  const [requestId, setRequestId] = useState<string>('');
  const [lastFileSizeMB, setLastFileSizeMB] = useState<number | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const sizeMB = Math.round(file.size / 1024 / 1024);
    setLastFileSizeMB(sizeMB);

    // Информируем о больших файлах
    if (sizeMB > 200) {
      toast({
        title: t('appleHealth.largeFile'),
        description: t('appleHealth.largeFileDesc', { size: sizeMB }),
        variant: 'default'
      });
    }

    // Проверка размера файла (макс 2GB)
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB в байтах
    if (file.size > maxSize) {
      await ErrorLogger.logFileUploadError(
        'Apple Health file too large',
        { 
          fileName: file.name, 
          fileSize: file.size, 
          maxSize,
          fileSizeMB: sizeMB
        },
        user?.id
      );
      
      toast({
        title: t('appleHealth.fileTooLarge'),
        description: t('appleHealth.fileTooLargeDesc', { size: sizeMB }),
        variant: 'destructive'
      });
      return;
    }

    // Проверка типа файла
    if (!file.name.toLowerCase().endsWith('.zip')) {
      await ErrorLogger.logFileUploadError(
        'Invalid Apple Health file format',
        { fileName: file.name, fileType: file.type },
        user?.id
      );
      
      toast({
        title: t('appleHealth.wrongFormat'),
        description: t('appleHealth.wrongFormatDesc'),
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsUploading(true);
      setUploadStatus('uploading');
      setUploadProgress(0);

      console.log(`Starting Apple Health upload: ${file.name}, size: ${file.size} bytes (${Math.round(file.size / 1024 / 1024)}MB)`);

      // Создаем уникальное имя файла
      const fileName = `apple-health-${Date.now()}-${file.name}`;
      const filePath = `${user?.id}/${fileName}`;

      console.log(`Upload path: ${filePath}`);

      // Реалистичное отслеживание прогресса загрузки
      const uploadProgressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev < 30) return prev + 2;
          if (prev < 50) return prev + 1;
          return prev;
        });
      }, 200);

      // Загружаем файл в Supabase Storage с увеличенным timeout
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('apple-health-uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      clearInterval(uploadProgressInterval);
      
      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log('File uploaded successfully:', uploadData);
      setUploadProgress(60);
      setProcessingPhase(t('appleHealth.phases.uploaded'));
      setUploadStatus('processing');

      // Отправляем файл на обработку в Edge Function
      console.log('Calling apple-health-import function...');
      
      const { data: processData, error: processError } = await healthApi.importAppleHealth(user?.id!, uploadData.path);

      console.log('Function response:', { data: processData, error: processError });

      if (processError) {
        console.error('Function invocation error:', processError);
        throw new Error(`Processing failed: ${processError.message || 'Edge Function returned an error'}`);
      }

      // Отслеживаем прогресс фоновой обработки
      const processResults = processData?.results as Record<string, unknown> | undefined;
      const currentRequestId = processResults?.requestId as string | undefined;
      setRequestId(currentRequestId);
      
      if (currentRequestId) {
        setUploadProgress(70);
        setProcessingPhase(t('appleHealth.phases.background'));
        
        // Проверяем статус обработки каждые 3 секунды
        const statusInterval = setInterval(async () => {
          try {
            const { data: logs } = await supabase
              .from('error_logs')
              .select('*')
              .eq('source', 'apple_health')
              .contains('error_details', { requestId: currentRequestId })
              .order('created_at', { ascending: false })
              .limit(5);

            if (logs && logs.length > 0) {
              const latestLog = logs[0];
              const phase = latestLog.error_type;
              
              // Обновляем прогресс в зависимости от фазы
              switch (phase) {
                case 'apple_health_file_found':
                  setUploadProgress(p => Math.max(p, 75));
                  setProcessingPhase(t('appleHealth.phases.fileFound'));
                  break;
                case 'apple_health_download_success':
                  setUploadProgress(p => Math.max(p, 80));
                  setProcessingPhase(t('appleHealth.phases.downloaded'));
                  break;
                case 'apple_health_streaming_start':
                  setUploadProgress(p => Math.max(p, 72));
                  setProcessingPhase(t('appleHealth.phases.streaming'));
                  break;
                case 'apple_health_streaming_active':
                  setUploadProgress(p => Math.max(p, 80));
                  setProcessingPhase(t('appleHealth.phases.streamingActive'));
                  break;
                case 'apple_health_streaming_progress': {
                  try {
                    const details = JSON.parse(String(latestLog.error_details) || '{}');
                    const rp = Number(details.recordsProcessed || 0);
                    const approx = 85 + Math.min(14, Math.floor(rp / 1000));
                    setUploadProgress(p => Math.max(p, Math.min(99, approx)));
                    setProcessingPhase(t('appleHealth.phases.streamingProgress', { count: rp }));
                  } catch {
                    setUploadProgress(p => Math.max(p, 88));
                    setProcessingPhase(t('appleHealth.phases.streamingActive'));
                  }
                  break;
                }
                case 'apple_health_background_phase':
              const phaseData = JSON.parse(String(latestLog.error_details) || '{}');
                if (phaseData.phase === 'data_extraction') {
                      setUploadProgress(p => Math.max(p, 85));
                      setProcessingPhase(t('appleHealth.phases.extracting'));
                    } else if (phaseData.phase === 'xml_parsing') {
                      setUploadProgress(p => Math.max(p, 90));
                      setProcessingPhase(t('appleHealth.phases.parsing'));
                    } else if (phaseData.phase === 'database_insertion') {
                      setUploadProgress(p => Math.max(p, 95));
                      setProcessingPhase(t('appleHealth.phases.saving'));
                    }
                  break;
                case 'apple_health_streaming_complete':
                  setUploadProgress(100);
                  setProcessingPhase(t('appleHealth.phases.complete'));
                  setUploadStatus('complete');
                  clearInterval(statusInterval);
                  break;
                case 'apple_health_processing_complete':
                  setUploadProgress(100);
                  setProcessingPhase(t('appleHealth.phases.complete'));
                  setUploadStatus('complete');
                  clearInterval(statusInterval);
                  break;
                case 'apple_health_streaming_error':
                case 'apple_health_background_processing_error':
                  setUploadStatus('error');
                  clearInterval(statusInterval);
                  throw new Error('Ошибка фоновой обработки');
              }
            }
          } catch (error) {
            console.error('Error checking status:', error);
          }
        }, 3000);

        // Автоматически останавливаем проверку через 5 минут
        setTimeout(() => {
          clearInterval(statusInterval);
          if (uploadStatus === 'processing') {
            setUploadProgress(p => Math.max(p, 100));
            setUploadStatus('complete');
            setProcessingPhase(t('appleHealth.phases.backgroundContinue'));
          }
        }, 5 * 60 * 1000);
      } else {
        setUploadProgress(100);
        setUploadStatus('complete');
      }
      setUploadResult(processData);

      // Показываем информацию о начале фоновой обработки
      const results = processData.results || {};
      toast({
        title: t('appleHealth.uploadSuccess'),
        description: t('appleHealth.uploadSuccessDesc', { size: lastFileSizeMB ?? 0 })
      });

      onUploadComplete?.(processData);

    } catch (error: any) {
      console.error('Apple Health upload error:', error);
      
      // Определяем тип ошибки для более информативного сообщения
      let errorMessage = error.message || 'Не удалось обработать файл Apple Health';
      
      if (error.message?.includes('exceeded the maximum allowed size')) {
        errorMessage = 'Файл превышает максимальный размер Storage (Global file size limit). Обратитесь к администратору для увеличения лимита.';
      } else if (error.message?.includes('Payload too large')) {
        errorMessage = 'Файл слишком большой для загрузки. Попробуйте уменьшить размер архива или обратитесь к администратору.';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Превышено время ожидания загрузки. Попробуйте еще раз или проверьте соединение.';
      } else if (error.message?.includes('Edge Function returned a non-2xx status code') || error.message?.includes('Edge Function returned an error')) {
        errorMessage = 'Ошибка обработки файла на сервере. Проверьте логи или обратитесь к администратору.';
      } else if (error.message?.includes('File not found') || error.message?.includes('Object not found')) {
        errorMessage = 'Файл не найден после загрузки. Попробуйте загрузить файл заново.';
      }
      
      await ErrorLogger.logFileUploadError(
        'Apple Health upload failed',
        { 
          fileName: file.name, 
          fileSize: file.size,
          fileSizeMB: Math.round(file.size / 1024 / 1024),
          error: error.message,
          stage: uploadStatus,
          errorCode: error.statusCode || error.status
        },
        user?.id
      );

      setUploadStatus('error');
      toast({
        title: t('appleHealth.uploadError'),
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetUpload = () => {
    setUploadStatus('idle');
    setUploadProgress(0);
    setUploadResult(null);
    setProcessingPhase('');
    setRequestId('');
    setLastFileSizeMB(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center text-white font-bold text-sm">
            🍎
          </div>
          {t('appleHealth.title')}
        </CardTitle>
        <CardDescription>
          {t('appleHealth.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {uploadStatus === 'idle' && (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{t('appleHealth.howToExport')}</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                  <li>{t('appleHealth.step1')}</li>
                  <li>{t('appleHealth.step2')}</li>
                  <li>{t('appleHealth.step3')}</li>
                  <li>{t('appleHealth.step4')}</li>
                  <li>{t('appleHealth.step5')}</li>
                </ol>
              </AlertDescription>
            </Alert>
            
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".zip"
                onChange={handleFileUpload}
                className="hidden"
                id="apple-health-upload"
                disabled={isUploading}
              />
              <label
                htmlFor="apple-health-upload"
                className="cursor-pointer flex flex-col items-center gap-4"
              >
                <Upload className="h-12 w-12 text-muted-foreground" />
                <div>
                  <h3 className="font-medium">{t('appleHealth.uploadTitle')}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('appleHealth.uploadHint')}
                  </p>
                </div>
                <Button type="button">
                  {t('appleHealth.selectFile')}
                </Button>
              </label>
            </div>
          </div>
        )}

        {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="font-medium mb-2">
                {uploadStatus === 'uploading' ? t('appleHealth.uploading') : t('appleHealth.processing')}
              </h3>
              <Progress value={uploadProgress} className="mb-2" />
              <p className="text-sm text-muted-foreground">
                {uploadProgress.toFixed(0)}%
              </p>
              {processingPhase && (
                <p className="text-xs text-muted-foreground mt-2">
                  {processingPhase}
                </p>
              )}
              {requestId && (
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {t('appleHealth.requestId', { defaultValue: 'ID запроса' })}: {requestId.slice(0, 8)}...
                </p>
              )}
            </div>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t('appleHealth.processingWarning')}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {uploadStatus === 'complete' && uploadResult && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Файл успешно загружен!</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• Размер файла: {uploadResult.results?.fileSizeMB ?? lastFileSizeMB ?? 0}MB</li>
                  <li>• Статус: {uploadResult.results?.status === 'processing_started' ? 'Обработка началась' : 'Готово'}</li>
                  <li>• Обработка данных выполняется в фоновом режиме</li>
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">
                  Результаты обработки будут сохранены автоматически и появятся в ваших метриках.
                </p>
              </AlertDescription>
            </Alert>
            <Button onClick={resetUpload} variant="outline" className="w-full">
              {t('appleHealth.uploadAnother', { defaultValue: 'Загрузить еще один файл' })}
            </Button>
          </div>
        )}

        {uploadStatus === 'error' && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <FileX className="h-4 w-4" />
              <AlertDescription>
                {t('appleHealth.errorProcessing', { defaultValue: 'Не удалось обработать файл. Проверьте, что это корректный экспорт Apple Health, и попробуйте снова.' })}
              </AlertDescription>
            </Alert>
            <Button onClick={resetUpload} variant="outline" className="w-full">
              {t('appleHealth.tryAgain', { defaultValue: 'Попробовать снова' })}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}