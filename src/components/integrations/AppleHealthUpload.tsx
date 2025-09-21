import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileX, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ErrorLogger } from '@/lib/error-logger';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
// import JSZip from 'jszip'; // Убираем статический импорт

interface AppleHealthUploadProps {
  onUploadComplete?: (data: any) => void;
}

export function AppleHealthUpload({ onUploadComplete }: AppleHealthUploadProps) {
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

    // Проверка размера файла (макс 2GB)
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB в байтах
    if (file.size > maxSize) {
      await ErrorLogger.logFileUploadError(
        'Apple Health file too large',
        { fileName: file.name, fileSize: file.size, maxSize, fileSizeMB: sizeMB },
        user?.id
      );
      toast({
        title: 'Файл слишком большой',
        description: `Размер файла: ${sizeMB}MB. Максимальный размер: 2048MB`,
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
        title: 'Неверный формат файла',
        description: 'Загрузите ZIP-архив экспорта Apple Health',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsUploading(true);
      setUploadStatus('uploading');
      setUploadProgress(0);

      // Новый подход: большие файлы (>100MB) обрабатываем на клиенте
      if (sizeMB > 100) {
        setUploadStatus('processing');
        setProcessingPhase('Парсим архив локально (большой файл)...');
        await ErrorLogger.logAppleHealthDiagnostics('client_import_start', { fileName: file.name, sizeMB }, user?.id || undefined);

        // Читаем архив и извлекаем Export.xml (динамический импорт JSZip)
        const JSZip = (await import('jszip')).default;
        const arrayBuffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        const xmlEntry = Object.values(zip.files).find((f: any) =>
          f.name.toLowerCase().endsWith('.xml') && f.name.toLowerCase().includes('export')
        ) as any;
        if (!xmlEntry) throw new Error('Export XML not found in ZIP');

        const xmlContent = await xmlEntry.async('string');
        setUploadProgress(70);
        setProcessingPhase('Извлекаем записи из XML...');

        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlContent, 'text/xml');
        const allRecords = Array.from(doc.querySelectorAll('Record')) as Element[];

        await ErrorLogger.logAppleHealthDiagnostics('client_import_xml_ready', { totalRecords: allRecords.length }, user?.id || undefined);

        const maxToProcess = Math.min(allRecords.length, 5000);
        const batchSize = 100;
        let created = 0;
        const allowedTypes = new Set([
          'HKQuantityTypeIdentifierStepCount',
          'HKQuantityTypeIdentifierHeartRate',
          'HKQuantityTypeIdentifierActiveEnergyBurned',
          'HKQuantityTypeIdentifierBasalEnergyBurned',
          'HKQuantityTypeIdentifierDistanceWalkingRunning',
          'HKQuantityTypeIdentifierVO2Max',
          'HKQuantityTypeIdentifierBodyMass'
        ]);

        let batch: any[] = [];
        for (let i = 0; i < maxToProcess; i++) {
          const r = allRecords[i];
          const type = r.getAttribute('type') || '';
          if (!allowedTypes.has(type)) continue;

          const value = parseFloat(r.getAttribute('value') || 'NaN');
          const startDate = r.getAttribute('startDate');
          if (!startDate || Number.isNaN(value)) continue;

          batch.push({
            user_id: user?.id,
            record_type: type,
            value,
            unit: r.getAttribute('unit') || '',
            start_date: startDate,
            end_date: r.getAttribute('endDate') || startDate,
            source_name: r.getAttribute('sourceName') || 'Apple Health',
            source_version: r.getAttribute('sourceVersion') || null,
            device: r.getAttribute('device') || null,
            metadata: { imported_from: 'apple_health_export_client', index: i }
          });

          if (batch.length === batchSize || i === maxToProcess - 1) {
            try {
              const { error } = await supabase.from('health_records').insert(batch);
              if (error) {
                console.error('Batch insert error:', error);
                await ErrorLogger.logAppleHealthDiagnostics('client_import_batch_error', { error: error.message, batchSize: batch.length }, user?.id || undefined);
                throw error;
              }
              created += batch.length;
              console.log(`Batch inserted: ${batch.length} records, total: ${created}`);
              batch = [];
              setUploadProgress(p => Math.min(95, p + 3));
            } catch (error: any) {
              console.error('Critical batch error:', error);
              await ErrorLogger.logAppleHealthDiagnostics('client_import_critical_error', { 
                error: error.message, 
                batchIndex: Math.floor(i / batchSize),
                recordsProcessed: created
              }, user?.id || undefined);
              throw error;
            }
          }
        }

        // Аггрегируем последние 30 дней
        setProcessingPhase('Создаем сводные данные...');
        console.log('Starting daily aggregation...');
        const endDate = new Date();
        let aggregatedDays = 0;
        for (let d = 0; d <= 30; d++) {
          const date = new Date(endDate);
          date.setDate(endDate.getDate() - d);
          const dateStr = date.toISOString().split('T')[0];
          try {
            await supabase.rpc('aggregate_daily_health_data', { p_user_id: user?.id, p_date: dateStr });
            aggregatedDays++;
          } catch (aggError: any) {
            console.warn(`Aggregation failed for ${dateStr}:`, aggError.message);
          }
        }
        console.log(`Aggregated ${aggregatedDays} days`);

        await ErrorLogger.logAppleHealthDiagnostics('client_import_complete', { created, totalConsidered: maxToProcess, aggregatedDays }, user?.id || undefined);
        setUploadProgress(100);
        setUploadStatus('complete');
        setProcessingPhase(`Импорт завершен (клиент). Создано записей: ${created}, агрегировано дней: ${aggregatedDays}.`);
        toast({ title: 'Импорт завершен', description: `Импортировано ${created} записей из ${maxToProcess}. Агрегировано ${aggregatedDays} дней.` });
        
        // Вызываем callback если есть
        if (onUploadComplete) {
          onUploadComplete({ created, totalConsidered: maxToProcess, aggregatedDays });
        }
        return;
      }

      // Для файлов <=100MB — прежний путь через Storage + Edge Function
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

      // Загружаем файл в Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('apple-health-uploads')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      clearInterval(uploadProgressInterval);
      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log('File uploaded successfully:', uploadData);
      setUploadProgress(60);
      setProcessingPhase('Файл загружен, начинаем обработку...');
      setUploadStatus('processing');

      // Отправляем файл на обработку в Edge Function
      console.log('Calling process-apple-health function...');
      const { data: processData, error: processError } = await supabase.functions.invoke('process-apple-health', {
        body: { userId: user?.id, filePath: uploadData.path }
      });

      console.log('Function response:', { data: processData, error: processError });
      if (processError) {
        console.error('Function invocation error:', processError);
        throw new Error(`Processing failed: ${processError.message || 'Edge Function returned an error'}`);
      }

      // Отслеживаем прогресс фоновой обработки
      const currentRequestId = processData?.results?.requestId;
      setRequestId(currentRequestId);
      if (currentRequestId) {
        setUploadProgress(70);
        setProcessingPhase('Фоновая обработка запущена...');
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
              switch (phase) {
                case 'apple_health_file_found':
                  setUploadProgress(p => Math.max(p, 75));
                  setProcessingPhase('Файл найден в хранилище...');
                  break;
                case 'apple_health_download_success':
                  setUploadProgress(p => Math.max(p, 80));
                  setProcessingPhase('Файл скачан для обработки...');
                  break;
                case 'apple_health_background_phase':
                  const phaseData = JSON.parse(String(latestLog.error_details) || '{}');
                  if (phaseData.phase === 'data_extraction') {
                    setUploadProgress(p => Math.max(p, 85));
                    setProcessingPhase('Извлекаем данные из архива...');
                  } else if (phaseData.phase === 'xml_parsing') {
                    setUploadProgress(p => Math.max(p, 90));
                    setProcessingPhase('Анализируем данные здоровья...');
                  } else if (phaseData.phase === 'database_insertion') {
                    setUploadProgress(p => Math.max(p, 95));
                    setProcessingPhase('Сохраняем данные в базу...');
                  }
                  break;
                case 'apple_health_processing_complete':
                  setUploadProgress(100);
                  setProcessingPhase('Обработка завершена!');
                  setUploadStatus('complete');
                  clearInterval(statusInterval);
                  break;
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

        // Авто-стоп проверки через 5 минут
        setTimeout(() => {
          clearInterval(statusInterval);
          if (uploadStatus === 'processing') {
            setUploadProgress(p => Math.max(p, 100));
            setUploadStatus('complete');
            setProcessingPhase('Обработка может продолжаться в фоновом режиме');
          }
        }, 5 * 60 * 1000);
      } else {
        setUploadProgress(100);
        setUploadStatus('complete');
      }

      setUploadResult(processData);
      toast({ title: 'Файл загружен успешно!', description: `Размер: ${lastFileSizeMB ?? 0}MB. Обработка началась в фоновом режиме.` });

    } catch (error: any) {
      console.error('Apple Health upload error:', error);
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
        { fileName: file.name, fileSize: file.size, fileSizeMB: sizeMB, error: error.message, stage: uploadStatus, errorCode: error.statusCode || error.status },
        user?.id
      );

      setUploadStatus('error');
      toast({ title: 'Ошибка загрузки', description: errorMessage, variant: 'destructive' });
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
          Apple Health Data
        </CardTitle>
        <CardDescription>
          Загрузите экспорт данных Apple Health для автоматического импорта ваших показателей здоровья
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {uploadStatus === 'idle' && (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Как экспортировать данные из Apple Health:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                  <li>Откройте приложение "Здоровье" на iPhone</li>
                  <li>Нажмите на свой профиль (верхний правый угол)</li>
                  <li>Выберите "Экспорт данных здоровья"</li>
                  <li>Дождитесь создания архива и отправьте его себе</li>
                  <li>Загрузите полученный ZIP-файл сюда</li>
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
                  <h3 className="font-medium">Загрузить файл Apple Health</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Поддерживается только ZIP-архив экспорта (макс. 2GB)
                  </p>
                </div>
                <Button type="button">
                  Выбрать файл
                </Button>
              </label>
            </div>
          </div>
        )}

        {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="font-medium mb-2">
                {uploadStatus === 'uploading' ? 'Загружаем файл...' : 'Обрабатываем данные...'}
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
                  ID запроса: {requestId.slice(0, 8)}...
                </p>
              )}
            </div>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Обработка больших файлов может занять несколько минут. Пожалуйста, не закрывайте страницу.
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
              Загрузить еще один файл
            </Button>
          </div>
        )}

        {uploadStatus === 'error' && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <FileX className="h-4 w-4" />
              <AlertDescription>
                Не удалось обработать файл. Проверьте, что это корректный экспорт Apple Health, и попробуйте снова.
              </AlertDescription>
            </Alert>
            <Button onClick={resetUpload} variant="outline" className="w-full">
              Попробовать снова
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}