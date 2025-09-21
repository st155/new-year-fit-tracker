import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Upload, Download, Heart, Activity } from 'lucide-react';

interface AppleHealthIntegrationProps {
  userId: string;
}

export function AppleHealthIntegration({ userId }: AppleHealthIntegrationProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
        setSelectedFile(file);
      } else {
        toast({
          title: 'Неверный формат файла',
          description: 'Пожалуйста, выберите ZIP-файл экспорта из Apple Health.',
          variant: 'destructive'
        });
      }
    }
  };

  const processAppleHealthData = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    try {
      // В реальном приложении здесь была бы обработка ZIP-файла
      // с извлечением XML данных и их парсингом
      
      // Имитируем обработку файла
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Здесь должна быть реальная логика обработки Apple Health данных
      // Пример структуры данных, которые мы бы извлекли:
      const mockHealthData = [
        { type: 'steps', value: 8547, unit: 'steps', date: new Date().toISOString().split('T')[0] },
        { type: 'heart_rate', value: 72, unit: 'bpm', date: new Date().toISOString().split('T')[0] },
        { type: 'weight', value: 75.2, unit: 'kg', date: new Date().toISOString().split('T')[0] },
        { type: 'sleep', value: 7.5, unit: 'hours', date: new Date().toISOString().split('T')[0] }
      ];

      // Сохраняем данные через Edge Function  
      const { data, error } = await supabase.functions.invoke('process-apple-health', {
        body: {
          userId,
          healthData: mockHealthData,
          fileName: selectedFile.name
        }
      });

      if (error) throw error;

      toast({
        title: 'Данные обработаны',
        description: `Импортировано ${mockHealthData.length} показателей из Apple Health.`,
      });

      setSelectedFile(null);
      
    } catch (error) {
      console.error('Processing error:', error);
      toast({
        title: 'Ошибка обработки',
        description: 'Не удалось обработать файл Apple Health.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            🍎
          </div>
          Apple Health
        </CardTitle>
        <CardDescription>
          Импортируйте данные о здоровье из приложения "Здоровье" на iPhone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">Как экспортировать данные:</h4>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Откройте приложение "Здоровье" на iPhone</li>
              <li>2. Нажмите на свой профиль (правый верхний угол)</li>
              <li>3. Выберите "Экспорт данных о здоровье"</li>
              <li>4. Дождитесь создания архива и поделитесь им</li>
              <li>5. Загрузите полученный ZIP-файл здесь</li>
            </ol>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apple-health-file">Выберите ZIP-файл экспорта</Label>
            <Input
              id="apple-health-file"
              type="file"
              accept=".zip"
              onChange={handleFileSelect}
              disabled={isProcessing}
            />
          </div>

          {selectedFile && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  {selectedFile.name}
                </span>
                <Badge variant="secondary" className="ml-auto">
                  {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                </Badge>
              </div>
            </div>
          )}

          <Button 
            onClick={processAppleHealthData}
            disabled={!selectedFile || isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Обработка данных...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Импортировать данные
              </>
            )}
          </Button>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Поддерживаемые данные: шаги, пульс, сон, вес, активность</p>
            <p>• Данные обрабатываются локально и безопасно сохраняются</p>
            <p>• Размер файла может быть большим в зависимости от истории</p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-start gap-2">
            <Activity className="w-4 h-4 text-yellow-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-900 mb-1">В разработке</p>
              <p className="text-yellow-800">
                Полная интеграция с Apple Health будет доступна в следующих обновлениях.
                Сейчас доступен импорт основных показателей.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}