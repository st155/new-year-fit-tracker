import { useState, useRef } from "react";
import { Camera, Upload, X, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface PhotoUploadProps {
  onPhotoUploaded?: (photoUrl: string) => void;
  existingPhotoUrl?: string;
  className?: string;
  label?: string;
}

export function PhotoUpload({ 
  onPhotoUploaded, 
  existingPhotoUrl, 
  className,
  label
}: PhotoUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation('common');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingPhotoUrl || null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = async (file: File) => {
    if (!user) {
      toast({
        title: t('errors.generic'),
        description: t('errors.authRequired'),
        variant: "destructive",
      });
      return;
    }

    console.log('Starting file upload:', file.name, file.type, file.size);

    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      toast({
        title: t('errors.generic'),
        description: t('errors.invalidImage'),
        variant: "destructive",
      });
      return;
    }

    // Проверка размера файла (максимум 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t('errors.generic'),
        description: t('errors.fileTooLarge', { size: 5 }),
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

      toast({
        title: t('success.uploaded'),
        description: t('success.photoUploaded'),
      });

      onPhotoUploaded?.(photoUrl);
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: t('errors.generic'),
        description: `${t('errors.uploadFailed')}: ${error.message}`,
        variant: "destructive",
      });
      setPreviewUrl(existingPhotoUrl || null);
    } finally {
      setUploading(false);
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
    onPhotoUploaded?.('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
              alt="Progress photo"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
          
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="animate-scale-in"
              >
                <Camera className="h-4 w-4 mr-1" />
                {t('actions.replace')}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={removePhoto}
                disabled={uploading}
                className="animate-scale-in"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {uploading && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                <p className="text-sm">{t('states.loading')}</p>
              </div>
            </div>
          )}
        </Card>
      ) : (
        <Card
          className={cn(
            "border-2 border-dashed transition-colors duration-300 cursor-pointer hover:border-primary/50",
            dragActive ? "border-primary bg-primary/10" : "border-border",
            uploading && "pointer-events-none opacity-50"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <div className="p-8 text-center space-y-4 animate-fade-in">
            <div className={cn(
              "mx-auto w-16 h-16 rounded-full flex items-center justify-center transition-colors duration-300",
              dragActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {uploading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current"></div>
              ) : (
                <Image className="h-8 w-8" />
              )}
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium">{label || t('photoUpload.label')}</h3>
              <p className="text-sm text-muted-foreground">
                {uploading 
                  ? t('states.uploading')
                  : t('photoUpload.dragHint')
                }
              </p>
              <p className="text-xs text-muted-foreground">
                {t('photoUpload.formats')}
              </p>
            </div>

            {!uploading && (
              <Button variant="outline" size="sm" className="animate-scale-in">
                <Upload className="h-4 w-4 mr-2" />
                {t('actions.chooseFile')}
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
