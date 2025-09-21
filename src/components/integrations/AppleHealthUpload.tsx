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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Проверка размера файла (макс 500MB)
    const maxSize = 500 * 1024 * 1024; // 500MB в байтах
    if (file.size > maxSize) {
      await ErrorLogger.logFileUploadError(
        'Apple Health file too large',
        { 
          fileName: file.name, 
          fileSize: file.size, 
          maxSize,
          fileSizeMB: Math.round(file.size / 1024 / 1024)
        },
        user?.id
      );
      
      toast({
        title: 'Файл слишком большой',
        description: `Размер файла: ${Math.round(file.size / 1024 / 1024)}MB. Максимальный размер: 500MB`,
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

      // Создаем уникальное имя файла
      const fileName = `apple-health-${Date.now()}-${file.name}`;
      const filePath = `${user?.id}/${fileName}`;

      // Загружаем файл в Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('apple-health-uploads')
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      setUploadProgress(50);
      setUploadStatus('processing');

      // Отправляем файл на обработку в Edge Function
      const { data: processData, error: processError } = await supabase.functions.invoke('process-apple-health', {
        body: {
          userId: user?.id,
          filePath: uploadData.path
        }
      });

      if (processError) {
        throw new Error(`Processing failed: ${processError.message}`);
      }

      setUploadProgress(100);
      setUploadStatus('complete');
      setUploadResult(processData);

      toast({
        title: 'Успешно загружено!',
        description: `Обработано записей: ${processData.recordsProcessed || 0}`
      });

      onUploadComplete?.(processData);

    } catch (error: any) {
      console.error('Apple Health upload error:', error);
      
      await ErrorLogger.logFileUploadError(
        'Apple Health upload failed',
        { 
          fileName: file.name, 
          fileSize: file.size,
          error: error.message,
          stage: uploadStatus
        },
        user?.id
      );

      setUploadStatus('error');
      toast({
        title: 'Ошибка загрузки',
        description: error.message || 'Не удалось обработать файл Apple Health',
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
                    Поддерживается только ZIP-архив экспорта (макс. 500MB)
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
                <strong>Успешно импортировано!</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• Обработано записей: {uploadResult.recordsProcessed || 0}</li>
                  <li>• Новых показателей: {uploadResult.newMetrics || 0}</li>
                  <li>• Ошибок: {uploadResult.errors || 0}</li>
                </ul>
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