import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Upload, Heart, Info, Camera } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface VO2MaxUploadProps {
  onSuccess?: () => void;
}

export function VO2MaxUpload({ onSuccess }: VO2MaxUploadProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualValue, setManualValue] = useState('');
  const [measurementDate, setMeasurementDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [isUploading, setIsUploading] = useState(false);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !manualValue) return;

    setIsSubmitting(true);
    try {
      const value = parseFloat(manualValue);
      if (isNaN(value) || value < 10 || value > 100) {
        toast.error('VO2Max должен быть от 10 до 100 мл/кг/мин');
        return;
      }

      // First, ensure user_metrics record exists
      const { data: existingMetric } = await supabase
        .from('user_metrics')
        .select('id')
        .eq('user_id', user.id)
        .eq('metric_name', 'VO2Max')
        .maybeSingle();

      let metricId = existingMetric?.id;

      if (!metricId) {
        const { data: newMetric, error: metricError } = await supabase
          .from('user_metrics')
          .insert([{
            user_id: user.id,
            metric_name: 'VO2Max',
            metric_category: 'performance',
            unit: 'ml/kg/min',
            source: 'manual',
          }])
          .select('id')
          .single();

        if (metricError) throw metricError;
        metricId = newMetric.id;
      }

      // Insert the value
      const { error } = await supabase.from('metric_values').insert({
        user_id: user.id,
        metric_id: metricId,
        value: value,
        measurement_date: measurementDate,
      });

      if (error) throw error;

      toast.success(`VO2Max ${value} мл/кг/мин сохранён!`);
      setManualValue('');
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['unified-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['widget-data'] });
      
      onSuccess?.();
    } catch (error) {
      console.error('Error saving VO2Max:', error);
      toast.error('Не удалось сохранить VO2Max');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScreenshotUpload = useCallback(async (file: File) => {
    if (!user?.id) return;

    setIsUploading(true);
    try {
      // Upload to storage
      const fileName = `vo2max/${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('medical-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create document record for AI analysis
      const { data: doc, error: docError } = await supabase
        .from('medical_documents')
        .insert([{
          user_id: user.id,
          file_name: file.name,
          document_type: 'vo2max',
          storage_path: fileName,
          processing_status: 'pending',
        }])
        .select('id')
        .single();

      if (docError) throw docError;

      // Trigger AI analysis
      const { error: analysisError } = await supabase.functions.invoke('analyze-document', {
        body: { documentId: doc.id, documentType: 'vo2max' },
      });

      if (analysisError) {
        console.warn('AI analysis failed:', analysisError);
        toast.info('Скриншот загружен, но автоанализ недоступен. Введите значение вручную.');
      } else {
        toast.success('Скриншот загружен! AI анализирует данные...');
      }

      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      onSuccess?.();
    } catch (error) {
      console.error('Error uploading screenshot:', error);
      toast.error('Не удалось загрузить скриншот');
    } finally {
      setIsUploading(false);
    }
  }, [user?.id, queryClient, onSuccess]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Файл слишком большой (макс. 10MB)');
        return;
      }
      handleScreenshotUpload(file);
    }
  };

  return (
    <Card className="border-teal-500/30 bg-gradient-to-br from-teal-500/5 to-cyan-500/5">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-lg">
            <Heart className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg">Добавить VO2Max</CardTitle>
            <CardDescription>
              Загрузите скриншот или введите значение вручную
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-blue-500/30 bg-blue-500/10">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-sm text-muted-foreground">
            <strong>Источники VO2Max:</strong> Oura Ring автоматически передаёт данные. 
            WHOOP не отдаёт VO2Max через API — загрузите скриншот из приложения.
            Apple Watch показывает VO2Max, но Apple Health не интегрирован напрямую.
          </AlertDescription>
        </Alert>

        {/* Screenshot upload */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Загрузить скриншот</Label>
          <div className="flex gap-2">
            <Label
              htmlFor="vo2max-screenshot"
              className="flex-1 flex items-center justify-center gap-2 h-12 px-4 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-teal-500/50 hover:bg-teal-500/5 cursor-pointer transition-colors"
            >
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Camera className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Выберите фото или скриншот
                  </span>
                </>
              )}
            </Label>
            <Input
              id="vo2max-screenshot"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-muted-foreground/20" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">или</span>
          </div>
        </div>

        {/* Manual input */}
        <form onSubmit={handleManualSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="vo2max-value" className="text-xs">
                VO2Max (мл/кг/мин)
              </Label>
              <Input
                id="vo2max-value"
                type="number"
                step="0.1"
                min="10"
                max="100"
                placeholder="43.5"
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="vo2max-date" className="text-xs">
                Дата измерения
              </Label>
              <Input
                id="vo2max-date"
                type="date"
                value={measurementDate}
                onChange={(e) => setMeasurementDate(e.target.value)}
              />
            </div>
          </div>
          <Button 
            type="submit" 
            disabled={isSubmitting || !manualValue}
            className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Сохранить VO2Max
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
