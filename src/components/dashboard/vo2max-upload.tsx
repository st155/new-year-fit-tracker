import { useState, useRef } from "react";
import { Heart, Upload, X, Brain, Loader2, CheckCircle, AlertCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { aiApi } from "@/lib/api";

interface VO2MaxUploadProps {
  onDataExtracted?: (analysisResult: any) => void;
  className?: string;
}

export function VO2MaxUpload({ onDataExtracted, className }: VO2MaxUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const handleFileSelect = async (file: File) => {
    if (!user) {
      toast({
        title: "Ошибка",
        description: "Необходимо войти в систему",
        variant: "destructive",
      });
      return;
    }

    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, выберите изображение",
        variant: "destructive",
      });
      return;
    }

    // Проверка размера файла (максимум 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Ошибка",
        description: "Размер файла не должен превышать 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Создаем превью
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // Генерируем уникальное имя файла
      const fileExt = file.name.split('.').pop();
      const fileName = `vo2max_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Загружаем файл в Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('progress-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Получаем публичный URL
      const { data: urlData } = supabase.storage
        .from('progress-photos')
        .getPublicUrl(filePath);

      const photoUrl = urlData.publicUrl;

      toast({
        title: "Скриншот загружен!",
        description: "Анализируем данные VO2Max с помощью ИИ...",
      });

      // Запускаем специализированный анализ VO2Max
      setAnalyzing(true);
      await analyzeVO2MaxWithAI(photoUrl);

    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Ошибка",
        description: `Не удалось загрузить скриншот: ${error.message}`,
        variant: "destructive",
      });
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const analyzeVO2MaxWithAI = async (imageUrl: string) => {
    try {
      console.log('Starting VO2Max AI analysis for:', imageUrl);

      const { data, error } = await aiApi.analyzeFitnessData(
        imageUrl, 
        user!.id, 
        undefined, 
        new Date().toISOString().split('T')[0]
      );

      if (error) {
        console.error('VO2Max analysis error:', error);
        throw error;
      }

      console.log('VO2Max analysis result:', data);
      setAnalysisResult(data);

      if (data.success && data.saved) {
        toast({
          title: "VO2Max данные найдены!",
          description: data.message,
        });
        onDataExtracted?.(data);
      } else {
        toast({
          title: "Анализ завершен",
          description: data.message || "VO2Max данные не найдены на скриншоте",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Error analyzing VO2Max:', error);
      toast({
        title: "Ошибка анализа",
        description: "Не удалось проанализировать скриншот VO2Max",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const removePhoto = () => {
    setPreviewUrl(null);
    setAnalysisResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'high': return 'bg-success/10 text-success border-success/20';
      case 'medium': return 'bg-warning/10 text-warning border-warning/20';
      case 'low': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500" />
          Добавить VO2Max из Whoop
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          className="hidden"
        />

        {previewUrl ? (
          <Card className="relative overflow-hidden group">
            <div className="aspect-video w-full">
              <img
                src={previewUrl}
                alt="Whoop VO2Max screenshot"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || analyzing}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Заменить
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={removePhoto}
                  disabled={uploading || analyzing}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {(uploading || analyzing) && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="flex items-center justify-center mb-2">
                    {analyzing ? (
                      <Brain className="h-8 w-8 animate-pulse text-red-500" />
                    ) : (
                      <Loader2 className="h-8 w-8 animate-spin" />
                    )}
                  </div>
                  <p className="text-sm">
                    {analyzing ? "Анализируем VO2Max данные..." : "Загружаем скриншот..."}
                  </p>
                </div>
              </div>
            )}

            {/* Результаты анализа */}
            {analysisResult && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white p-3">
                <div className="flex items-center gap-2 mb-2">
                  {analysisResult.saved ? (
                    <CheckCircle className="h-4 w-4 text-success" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-warning" />
                  )}
                  <Badge className={getQualityColor(analysisResult.analysis?.dataQuality)}>
                    {analysisResult.analysis?.dataQuality === 'high' ? 'Высокое качество' :
                     analysisResult.analysis?.dataQuality === 'medium' ? 'Среднее качество' : 'Низкое качество'}
                  </Badge>
                </div>
                <p className="text-xs">
                  {analysisResult.message}
                </p>
                {analysisResult.savedMetrics && analysisResult.savedMetrics.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {analysisResult.savedMetrics
                      .filter((metric: any) => metric.metric.toLowerCase().includes('vo2') || metric.metric.toLowerCase().includes('кардио'))
                      .map((metric: any, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        {metric.metric}: {metric.value} {metric.unit}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        ) : (
          <Card
            className={cn(
              "border-2 border-dashed transition-colors duration-300 cursor-pointer hover:border-red-500/50",
              dragActive ? "border-red-500 bg-red-500/10" : "border-border",
              (uploading || analyzing) && "pointer-events-none opacity-50"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !uploading && !analyzing && fileInputRef.current?.click()}
          >
            <div className="p-8 text-center space-y-4">
              <div className={cn(
                "mx-auto w-16 h-16 rounded-full flex items-center justify-center transition-colors duration-300",
                dragActive ? "bg-red-500 text-white" : "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400"
              )}>
                {uploading || analyzing ? (
                  analyzing ? (
                    <Brain className="h-8 w-8 animate-pulse" />
                  ) : (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  )
                ) : (
                  <Heart className="h-8 w-8" />
                )}
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium">Загрузить скриншот VO2Max из Whoop</h3>
                <p className="text-sm text-muted-foreground">
                  {uploading 
                    ? "Загружаем скриншот..." 
                    : analyzing
                    ? "ИИ анализирует данные VO2Max..."
                    : "Перетащите скриншот VO2Max из приложения Whoop"
                  }
                </p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• ИИ автоматически найдет значение VO2Max</p>
                  <p>• Поддерживает скриншоты из приложения Whoop</p>
                  <p>• Данные будут сохранены в вашем профиле</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Поддерживаются: JPG, PNG, WebP (до 5MB)
                </p>
              </div>

              {!uploading && !analyzing && (
                <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20">
                  <Upload className="h-4 w-4 mr-2" />
                  Выбрать скриншот Whoop
                </Button>
              )}
            </div>
          </Card>
        )}

        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <p className="font-medium mb-1">💡 Как получить скриншот VO2Max из Whoop:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Откройте приложение Whoop</li>
            <li>Перейдите в раздел "Trends" или "Health"</li>
            <li>Найдите метрику VO2Max</li>
            <li>Сделайте скриншот экрана с данными</li>
            <li>Загрузите его сюда для автоматического анализа</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}