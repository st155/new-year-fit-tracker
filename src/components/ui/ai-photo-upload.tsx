import { useState, useRef } from "react";
import { Camera, Upload, X, Brain, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AIPhotoUploadProps {
  onDataExtracted?: (analysisResult: any) => void;
  onPhotoUploaded?: (photoUrl: string) => void;
  existingPhotoUrl?: string;
  className?: string;
  label?: string;
  goalId?: string;
}

export function AIPhotoUpload({ 
  onDataExtracted, 
  onPhotoUploaded,
  existingPhotoUrl, 
  className,
  label = "Upload fitness tracker screenshot",
  goalId
}: AIPhotoUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingPhotoUrl || null);
  const [dragActive, setDragActive] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const handleFileSelect = async (file: File) => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please sign in to continue",
        variant: "destructive",
      });
      return;
    }

    console.log('Starting AI-powered file upload:', file.name, file.type, file.size);

    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select an image",
        variant: "destructive",
      });
      return;
    }

    // Проверка размера файла (максимум 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must not exceed 5MB",
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
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      console.log('Uploading to path:', filePath);

      // Загружаем файл в Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('progress-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful:', uploadData);

      // Получаем публичный URL
      const { data: urlData } = supabase.storage
        .from('progress-photos')
        .getPublicUrl(filePath);

      const photoUrl = urlData.publicUrl;
      console.log('Public URL:', photoUrl);

      onPhotoUploaded?.(photoUrl);

      toast({
        title: "Photo uploaded!",
        description: "Starting AI analysis...",
      });

      // Запускаем анализ с помощью ChatGPT
      setAnalyzing(true);
      await analyzeWithAI(photoUrl);

    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: `Failed to upload photo: ${error.message}`,
        variant: "destructive",
      });
      setPreviewUrl(existingPhotoUrl || null);
    } finally {
      setUploading(false);
    }
  };

  const analyzeWithAI = async (imageUrl: string) => {
    try {
      console.log('Starting AI analysis for:', imageUrl);

      const { data, error } = await supabase.functions.invoke('analyze-fitness-data', {
        body: {
          imageUrl,
          userId: user!.id,
          goalId,
          measurementDate: new Date().toISOString().split('T')[0]
        }
      });

      if (error) {
        console.error('AI analysis error:', error);
        throw error;
      }

      console.log('AI analysis result:', data);
      setAnalysisResult(data);

      if (data.success && data.saved) {
        toast({
          title: "Analysis complete!",
          description: data.message,
        });
        onDataExtracted?.(data);
      } else {
        toast({
          title: "Analysis complete",
          description: data.message || "No data found in the image",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Error analyzing image:', error);
      toast({
        title: "Analysis error",
        description: "Failed to analyze the image with AI",
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
    onPhotoUploaded?.('');
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
    <div className={cn("space-y-4", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        className="hidden"
      />

      {previewUrl ? (
        <Card className="relative overflow-hidden group animate-fade-in">
          <div className="aspect-square w-full">
            <img
              src={previewUrl}
              alt="Fitness tracker screenshot"
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
                className="animate-scale-in"
              >
                <Camera className="h-4 w-4 mr-1" />
                Replace
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={removePhoto}
                disabled={uploading || analyzing}
                className="animate-scale-in"
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
                    <Brain className="h-8 w-8 animate-pulse text-primary" />
                  ) : (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  )}
                </div>
                <p className="text-sm">
                  {analyzing ? "Analyzing with AI..." : "Uploading photo..."}
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
                  {analysisResult.analysis?.dataQuality === 'high' ? 'High quality' :
                   analysisResult.analysis?.dataQuality === 'medium' ? 'Medium quality' : 'Low quality'}
                </Badge>
              </div>
              <p className="text-xs">
                {analysisResult.message}
              </p>
              {analysisResult.savedMeasurements && analysisResult.savedMeasurements.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {analysisResult.savedMeasurements.map((measurement: any, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {measurement.metric}: {measurement.value} {measurement.unit}
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
            "border-2 border-dashed transition-colors duration-300 cursor-pointer hover:border-primary/50",
            dragActive ? "border-primary bg-primary/10" : "border-border",
            (uploading || analyzing) && "pointer-events-none opacity-50"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !uploading && !analyzing && fileInputRef.current?.click()}
        >
          <div className="p-8 text-center space-y-4 animate-fade-in">
            <div className={cn(
              "mx-auto w-16 h-16 rounded-full flex items-center justify-center transition-colors duration-300",
              dragActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {uploading || analyzing ? (
                analyzing ? (
                  <Brain className="h-8 w-8 animate-pulse text-primary" />
                ) : (
                  <Loader2 className="h-6 w-6 animate-spin" />
                )
              ) : (
                <Brain className="h-8 w-8" />
              )}
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium">{label}</h3>
              <p className="text-sm text-muted-foreground">
                {uploading 
                  ? "Uploading photo..." 
                  : analyzing
                  ? "Analyzing data with AI..."
                  : "Drag and drop fitness tracker screenshot or click to select"
                }
              </p>
              <p className="text-xs text-muted-foreground">
                AI will automatically extract data: weight, body fat %, heart rate, steps and other metrics
              </p>
              <p className="text-xs text-muted-foreground">
                Supported: JPG, PNG, WebP (up to 5MB)
              </p>
            </div>

            {!uploading && !analyzing && (
              <Button variant="outline" size="sm" className="animate-scale-in">
                <Upload className="h-4 w-4 mr-2" />
                Select screenshot
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}