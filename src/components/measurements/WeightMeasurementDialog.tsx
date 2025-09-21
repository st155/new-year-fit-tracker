import { useState, useRef } from "react";
import { Camera, Scale, Upload, Loader2, Save, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface WeightMeasurementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: string;
  onMeasurementAdded?: () => void;
}

export function WeightMeasurementDialog({
  open,
  onOpenChange,
  goalId,
  onMeasurementAdded
}: WeightMeasurementDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [manualWeight, setManualWeight] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("manual");

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Ошибка",
          description: "Размер файла не должен превышать 10 МБ",
          variant: "destructive",
        });
        return;
      }

      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImageWithAI = async () => {
    if (!selectedImage) return;

    setLoading(true);
    try {
      // Создаем FormData для отправки изображения
      const formData = new FormData();
      formData.append('image', selectedImage);

      const { data, error } = await supabase.functions.invoke('analyze-weight-scale', {
        body: formData,
      });

      if (error) throw error;

      if (data.weight) {
        setAiAnalysisResult(data.weight.toString());
        toast({
          title: "Анализ завершен!",
          description: `Обнаружен вес: ${data.weight} кг`,
        });
      } else {
        toast({
          title: "Не удалось определить вес",
          description: data.message || "Попробуйте сделать более четкое фото весов",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error analyzing image:', error);
      toast({
        title: "Ошибка анализа",
        description: "Не удалось проанализировать изображение",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveMeasurement = async (weight: string) => {
    if (!weight || !user) return;

    const weightValue = parseFloat(weight);
    if (isNaN(weightValue)) {
      toast({
        title: "Ошибка",
        description: "Введите корректное значение веса",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('measurements')
        .insert({
          user_id: user.id,
          goal_id: goalId,
          value: weightValue,
          unit: 'кг',
          source: activeTab === 'manual' ? 'manual' : 'ai_photo',
          measurement_date: new Date().toISOString().split('T')[0],
          photo_url: activeTab === 'photo' && selectedImage ? 
            await uploadPhoto(selectedImage) : null
        });

      if (error) throw error;

      toast({
        title: "Успех!",
        description: "Измерение веса добавлено",
      });

      onMeasurementAdded?.();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error saving measurement:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить измерение",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    try {
      const fileName = `weight_${user?.id}_${Date.now()}.${file.name.split('.').pop()}`;
      
      const { data, error } = await supabase.storage
        .from('progress-photos')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('progress-photos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  };

  const resetForm = () => {
    setManualWeight("");
    setSelectedImage(null);
    setImagePreview(null);
    setAiAnalysisResult(null);
    setActiveTab("manual");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Добавить вес
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Вручную</TabsTrigger>
            <TabsTrigger value="photo">Фото весов</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="weight">Вес (кг)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      placeholder="70.5"
                      value={manualWeight}
                      onChange={(e) => setManualWeight(e.target.value)}
                    />
                  </div>
                  
                  <Button
                    onClick={() => saveMeasurement(manualWeight)}
                    disabled={!manualWeight || loading}
                    className="w-full"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Сохранить
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="photo" className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {!imagePreview ? (
                    <div
                      className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Нажмите, чтобы выбрать фото весов
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ИИ попытается определить ваш вес
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Предпросмотр"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            setSelectedImage(null);
                            setImagePreview(null);
                            setAiAnalysisResult(null);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>

                      {aiAnalysisResult ? (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-green-800 mb-2">
                            ИИ определил вес: <strong>{aiAnalysisResult} кг</strong>
                          </p>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => saveMeasurement(aiAnalysisResult)}
                              disabled={loading}
                              size="sm"
                              className="flex-1"
                            >
                              {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Save className="h-4 w-4 mr-2" />
                              )}
                              Сохранить результат
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={analyzeImageWithAI}
                              disabled={loading}
                            >
                              Повторить анализ
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          onClick={analyzeImageWithAI}
                          disabled={loading}
                          className="w-full"
                        >
                          {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Camera className="h-4 w-4 mr-2" />
                          )}
                          Анализировать фото
                        </Button>
                      )}
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}