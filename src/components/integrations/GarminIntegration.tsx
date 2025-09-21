import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Download, ExternalLink, Activity, Heart } from 'lucide-react';

interface GarminIntegrationProps {
  userId: string;
}

export function GarminIntegration({ userId }: GarminIntegrationProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    setIsConnecting(true);
    
    try {
      // В реальном приложении здесь был бы OAuth процесс с Garmin Connect IQ
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: 'Подключение к Garmin',
        description: 'OAuth интеграция с Garmin будет доступна в следующих обновлениях.',
      });
      
    } catch (error) {
      console.error('Connection error:', error);
      toast({
        title: 'Ошибка подключения',
        description: 'Не удалось подключиться к Garmin Connect.',
        variant: 'destructive'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.fit') || file.name.endsWith('.tcx') || file.name.endsWith('.gpx')) {
        setSelectedFile(file);
      } else {
        toast({
          title: 'Неверный формат файла',
          description: 'Поддерживаются файлы: .fit, .tcx, .gpx',
          variant: 'destructive'
        });
      }
    }
  };

  const processGarminFile = async () => {
    if (!selectedFile) return;

    setIsSyncing(true);
    try {
      // Имитируем обработку файла Garmin
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Пример данных, которые мы бы извлекли из .fit файла
      const mockGarminData = [
        { type: 'heart_rate_avg', value: 145, unit: 'bpm', date: new Date().toISOString().split('T')[0] },
        { type: 'heart_rate_max', value: 182, unit: 'bpm', date: new Date().toISOString().split('T')[0] },
        { type: 'calories', value: 420, unit: 'kcal', date: new Date().toISOString().split('T')[0] },
        { type: 'distance', value: 5.2, unit: 'km', date: new Date().toISOString().split('T')[0] },
        { type: 'elevation_gain', value: 156, unit: 'm', date: new Date().toISOString().split('T')[0] }
      ];

      // Сохраняем данные через Edge Function
      const { data, error } = await supabase.functions.invoke('garmin-import', {
        body: {
          userId,
          garminData: mockGarminData,
          fileName: selectedFile.name,
          fileType: selectedFile.name.split('.').pop()
        }
      });

      if (error) throw error;

      toast({
        title: 'Файл обработан',
        description: `Импортировано ${mockGarminData.length} показателей из Garmin.`,
      });

      setSelectedFile(null);
      
    } catch (error) {
      console.error('Processing error:', error);
      toast({
        title: 'Ошибка обработки',
        description: 'Не удалось обработать файл Garmin.',
        variant: 'destructive'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            G
          </div>
          Garmin Connect
        </CardTitle>
        <CardDescription>
          Подключите устройства Garmin для автоматической синхронизации тренировок и показателей здоровья.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* OAuth подключение */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <h4 className="font-medium">Автоматическая синхронизация</h4>
              <p className="text-sm text-muted-foreground">
                Подключите аккаунт Garmin Connect для автоматического импорта данных
              </p>
            </div>
            <Button 
              onClick={handleConnect}
              disabled={isConnecting}
              variant={isConnected ? "outline" : "default"}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Подключение...
                </>
              ) : isConnected ? (
                'Подключено'
              ) : (
                'Подключить'
              )}
            </Button>
          </div>

          {/* Ручной импорт файлов */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Импорт файлов активности</h4>
            
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-3">
              <h5 className="font-medium text-blue-900 mb-2">Как экспортировать из Garmin Connect:</h5>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. Войдите в Garmin Connect (web или приложение)</li>
                <li>2. Откройте конкретную активность</li>
                <li>3. Нажмите на ⚙️ (настройки) → "Экспорт"</li>
                <li>4. Выберите формат: FIT, TCX или GPX</li>
                <li>5. Загрузите файл сюда</li>
              </ol>
            </div>

            <div className="space-y-2">
              <Label htmlFor="garmin-file">Выберите файл активности</Label>
              <Input
                id="garmin-file"
                type="file"
                accept=".fit,.tcx,.gpx"
                onChange={handleFileSelect}
                disabled={isSyncing}
              />
            </div>

            {selectedFile && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    {selectedFile.name}
                  </span>
                  <Badge variant="secondary" className="ml-auto">
                    {selectedFile.name.split('.').pop()?.toUpperCase()}
                  </Badge>
                </div>
              </div>
            )}

            <Button 
              onClick={processGarminFile}
              disabled={!selectedFile || isSyncing}
              className="w-full"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Обработка файла...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Импортировать данные
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-2 text-xs text-muted-foreground">
          <p>• FIT: полные данные тренировок и биометрии</p>
          <p>• TCX: данные тренировок с GPS треками</p>
          <p>• GPX: GPS треки без биометрических данных</p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open('https://connect.garmin.com', '_blank')}
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            Garmin Connect
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open('https://developer.garmin.com/connect-iq/', '_blank')}
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            API Docs
          </Button>
        </div>

        <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-start gap-2">
            <Heart className="w-4 h-4 text-yellow-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-900 mb-1">В разработке</p>
              <p className="text-yellow-800">
                Автоматическая синхронизация с Garmin Connect API будет доступна в ближайших обновлениях.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}