import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Upload, RotateCcw, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useProcessSupplementPhoto } from '@/hooks/biostack/useProcessSupplementPhoto';

interface ProductPhotoUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
}

type Step = 'camera' | 'preview' | 'processing' | 'comparison' | 'uploading';

export function ProductPhotoUploader({ isOpen, onClose, productId, productName }: ProductPhotoUploaderProps) {
  const [step, setStep] = useState<Step>('camera');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const processPhoto = useProcessSupplementPhoto();

  const handleClose = useCallback(() => {
    setStep('camera');
    setCapturedImage(null);
    setProcessedImage(null);
    onClose();
  }, [onClose]);

  const compressImage = async (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 800;
        const scale = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scale;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = base64;
    });
  };

  const handleCapture = useCallback(async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      const compressed = await compressImage(imageSrc);
      setCapturedImage(compressed);
      setStep('preview');
    }
  }, []);

  const convertToJpeg = useCallback(async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      // Convert HEIC or any format to JPEG
      const jpegBase64 = await convertToJpeg(file);
      const compressed = await compressImage(jpegBase64);
      setCapturedImage(compressed);
      setStep('preview');
    } catch (error) {
      console.error('File conversion error:', error);
      toast({
        title: 'Conversion failed',
        description: 'Could not process the image file',
        variant: 'destructive',
      });
    }
  }, [convertToJpeg, toast]);

  const handleAutoEnhance = useCallback(async () => {
    if (!capturedImage) return;
    
    setStep('processing');
    
    try {
      const enhanced = await processPhoto.mutateAsync(capturedImage);
      setProcessedImage(enhanced);
      setStep('comparison');
    } catch (error) {
      console.error('Enhancement failed:', error);
      // Fall back to preview with original
      setStep('preview');
    }
  }, [capturedImage, processPhoto]);

  const uploadPhotoMutation = useMutation({
    mutationFn: async (imageToUpload: string) => {
      if (!imageToUpload) throw new Error('No image to upload');

      // Convert base64 to Blob
      const base64Data = imageToUpload.replace(/^data:image\/\w+;base64,/, '');
      const byteCharacters = atob(base64Data);
      const byteArray = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([byteArray], { type: 'image/jpeg' });
      
      // Upload to supplement-images bucket
      const fileName = `${productId}_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('supplement-images')
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('supplement-images')
        .getPublicUrl(fileName);
      
      // Update product with image URL
      const { error: updateError } = await supabase
        .from('supplement_products')
        .update({ image_url: urlData.publicUrl })
        .eq('id', productId);
      
      if (updateError) throw updateError;
      
      return urlData.publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplement-library'] });
      queryClient.invalidateQueries({ queryKey: ['manual-supplements-today'] });
      queryClient.invalidateQueries({ queryKey: ['protocol-supplements-today'] });
      queryClient.invalidateQueries({ queryKey: ['active-protocols'] });
      toast({
        title: '✅ Photo uploaded',
        description: `Photo added to ${productName}`,
      });
      handleClose();
    },
    onError: (error) => {
      console.error('Photo upload error:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload photo',
        variant: 'destructive',
      });
    },
  });

  const handleUploadOriginal = useCallback(() => {
    if (!capturedImage) return;
    setStep('uploading');
    uploadPhotoMutation.mutate(capturedImage);
  }, [capturedImage, uploadPhotoMutation]);

  const handleUploadEnhanced = useCallback(() => {
    if (!processedImage) return;
    setStep('uploading');
    uploadPhotoMutation.mutate(processedImage);
  }, [processedImage, uploadPhotoMutation]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-neutral-950 border-blue-500/30">
        <DialogHeader>
          <DialogTitle>Add Photo: {productName}</DialogTitle>
        </DialogHeader>

        {step === 'camera' && (
          <div className="space-y-4">
            <div className="aspect-video bg-neutral-900 rounded-lg overflow-hidden">
              <Webcam
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: 'environment' }}
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="flex gap-3">
              <Button onClick={handleCapture} className="flex-1 bg-blue-500 hover:bg-blue-600">
                <Camera className="h-4 w-4 mr-2" />
                Capture Photo
              </Button>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </Button>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        )}

        {step === 'preview' && capturedImage && (
          <div className="space-y-4">
            <div className="aspect-video bg-neutral-900 rounded-lg overflow-hidden">
              <img src={capturedImage} alt="Preview" className="w-full h-full object-contain" />
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setCapturedImage(null);
                  setStep('camera');
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Retake
              </Button>
              <Button
                onClick={handleAutoEnhance}
                className="flex-1 bg-purple-500 hover:bg-purple-600"
                disabled={processPhoto.isPending}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                🪄 Auto-enhance
              </Button>
              <Button 
                onClick={handleUploadOriginal} 
                className="flex-1 bg-green-500 hover:bg-green-600"
              >
                Upload Original
              </Button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto" />
            <div className="space-y-2">
              <p className="text-lg font-medium">🪄 AI Processing...</p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• Removing background</p>
                <p>• Correcting perspective</p>
                <p>• Enhancing image</p>
              </div>
            </div>
          </div>
        )}

        {step === 'comparison' && capturedImage && processedImage && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-center text-muted-foreground">Before</p>
                <div className="aspect-square bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800">
                  <img src={capturedImage} alt="Original" className="w-full h-full object-contain" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-center text-green-400 font-medium">After ✨</p>
                <div className="aspect-square bg-white rounded-lg overflow-hidden border-2 border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                  <img src={processedImage} alt="Enhanced" className="w-full h-full object-contain" />
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setProcessedImage(null);
                  setStep('preview');
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                variant="outline"
                onClick={handleUploadOriginal}
                className="flex-1"
              >
                Use Original
              </Button>
              <Button
                onClick={handleUploadEnhanced}
                className="flex-1 bg-green-500 hover:bg-green-600"
              >
                ✓ Use Enhanced
              </Button>
            </div>
          </div>
        )}

        {step === 'uploading' && (
          <div className="py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-muted-foreground">Uploading photo...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
