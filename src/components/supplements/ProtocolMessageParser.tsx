import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Upload, Camera, Trash2, Check, AlertTriangle } from "lucide-react";
import { useProtocolMessageParser, ParsedSupplement } from "@/hooks/useProtocolMessageParser";
import { useSupplementProtocol } from "@/hooks/supplements/useSupplementProtocol";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { BottleScanner } from "@/components/biostack/BottleScanner";
import { validateIntakeTimes } from "@/lib/supplement-validation";
import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";

type Step = 'input' | 'preview';

const INTAKE_TIME_LABELS: Record<string, string> = {
  morning: '🌅 Утро',
  afternoon: '☀️ Обед',
  evening: '🌆 Ужин',
  before_sleep: '🌙 Перед сном'
};

interface ProtocolMessageParserProps {
  onProtocolCreated?: () => void;
}

export function ProtocolMessageParser({ onProtocolCreated }: ProtocolMessageParserProps) {
  const [step, setStep] = useState<Step>('input');
  const [messageText, setMessageText] = useState('');
  const [parsedSupplements, setParsedSupplements] = useState<ParsedSupplement[]>([]);
  const [protocolName, setProtocolName] = useState('');
  const [protocolDescription, setProtocolDescription] = useState('');
  const [duration, setDuration] = useState(30);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selectedSupplementIndex, setSelectedSupplementIndex] = useState<number | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();
  const parseMutation = useProtocolMessageParser();
  const { createProtocolFromParsed } = useSupplementProtocol(user?.id);

  const uploadSupplementPhoto = async (
    photoDataUrl: string, 
    supplementName: string
  ): Promise<string | null> => {
    if (!user?.id) return null;
    
    try {
      // Convert base64 to blob
      const response = await fetch(photoDataUrl);
      const blob = await response.blob();
      
      // Create file name
      const timestamp = Date.now();
      const sanitizedName = supplementName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const fileName = `${user.id}/${timestamp}-${sanitizedName}.jpg`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('supplement-photos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });
      
      if (error) {
        console.error('Upload error:', error);
        return null;
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('supplement-photos')
        .getPublicUrl(fileName);
      
      return publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  };

  const handleParse = async () => {
    if (!messageText.trim()) {
      toast({
        title: "Введите текст протокола",
        variant: "destructive"
      });
      return;
    }

    try {
      const supplements = await parseMutation.mutateAsync(messageText);
      
      // Validate intake times
      const validated = supplements.map(supp => {
        const validation = validateIntakeTimes(supp.supplement_name, supp.intake_times);
        if (!validation.valid && validation.suggested) {
          const correctedTimesText = validation.suggested
            .map(t => INTAKE_TIME_LABELS[t as keyof typeof INTAKE_TIME_LABELS])
            .join(', ');
            
          toast({
            title: `⚠️ ${supp.supplement_name}: время приема скорректировано`,
            description: `${validation.warning}\n\nНовое время: ${correctedTimesText}`,
            duration: 6000,
          });
          return { ...supp, intake_times: validation.suggested };
        }
        return supp;
      });

      setParsedSupplements(validated);
      setProtocolName(`Протокол от ${new Date().toLocaleDateString('ru-RU')}`);
      setStep('preview');

      toast({
        title: `✅ Найдено добавок: ${supplements.length}`,
        description: "Проверьте данные и добавьте фотографии баночек"
      });
    } catch (error) {
      toast({
        title: "Ошибка парсинга",
        description: error instanceof Error ? error.message : "Попробуйте еще раз",
        variant: "destructive"
      });
    }
  };

  const handleUpdateSupplement = (index: number, updates: Partial<ParsedSupplement>) => {
    setParsedSupplements(prev => prev.map((s, i) => i === index ? { ...s, ...updates } : s));
  };

  const handleRemoveSupplement = (index: number) => {
    setParsedSupplements(prev => prev.filter((_, i) => i !== index));
  };

  const handleOpenScanner = (index: number) => {
    setSelectedSupplementIndex(index);
    setScannerOpen(true);
  };

  const handlePhotoUpload = async (index: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      handleUpdateSupplement(index, { photo_url: e.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleCreateProtocol = async () => {
    if (!protocolName.trim()) {
      toast({
        title: "Введите название протокола",
        variant: "destructive"
      });
      return;
    }

    if (parsedSupplements.length === 0) {
      toast({
        title: "Добавьте хотя бы одну добавку",
        variant: "destructive"
      });
      return;
    }

    try {
      await createProtocolFromParsed.mutateAsync({
        name: protocolName,
        description: protocolDescription,
        duration,
        supplements: parsedSupplements
      });

      toast({
        title: "✅ Протокол создан и активирован!",
        description: `${parsedSupplements.length} добавок добавлено. Протокол активен.`
      });

      // Confetti effect
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Switch to The Stack tab
      onProtocolCreated?.();

      // Reset
      setStep('input');
      setMessageText('');
      setParsedSupplements([]);
      setProtocolName('');
      setProtocolDescription('');
      setDuration(30);
    } catch (error) {
      toast({
        title: "Ошибка создания протокола",
        description: error instanceof Error ? error.message : "Попробуйте еще раз",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {step === 'input' && (
        <Card className="p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">📋 Вставьте протокол от доктора/жены</h3>
            <p className="text-sm text-muted-foreground">
              Скопируйте текст сообщения с протоколом добавок. AI автоматически распознает все добавки, дозировки и время приема.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Текст протокола</Label>
            <Textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Утро:
Витамин D 5000 МЕ утром
Магний цитрат 200 мг после еды
Омега-3 по 1000 мг после еды

Обед:
Магний цитрат 200 мг после еды
...
"
              className="min-h-[500px] font-mono text-sm resize-y"
            />
          </div>

          <Button
            onClick={handleParse}
            disabled={parseMutation.isPending || !messageText.trim()}
            className="w-full"
            size="lg"
          >
            {parseMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Анализирую с помощью AI...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Распознать протокол
              </>
            )}
          </Button>
        </Card>
      )}

      {step === 'preview' && (
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Настройки протокола</h3>
              <div className="grid gap-4">
                <div>
                  <Label>Название протокола</Label>
                  <Input
                    value={protocolName}
                    onChange={(e) => setProtocolName(e.target.value)}
                    placeholder="Протокол от доктора Иванова"
                  />
                </div>
                <div>
                  <Label>Описание (опционально)</Label>
                  <Textarea
                    value={protocolDescription}
                    onChange={(e) => setProtocolDescription(e.target.value)}
                    placeholder="Для повышения энергии и улучшения сна"
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Длительность (дней)</Label>
                  <Input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
                    min={1}
                    max={365}
                  />
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Добавки ({parsedSupplements.length})</h3>
            
            {parsedSupplements.map((supp, index) => (
              <Card key={index} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 grid gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Название</Label>
                        <Input
                          value={supp.supplement_name}
                          onChange={(e) => handleUpdateSupplement(index, { supplement_name: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Бренд</Label>
                        <Input
                          value={supp.brand || ''}
                          onChange={(e) => handleUpdateSupplement(index, { brand: e.target.value })}
                          placeholder="NOW Foods, Solgar..."
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Дозировка</Label>
                        <Input
                          type="number"
                          value={supp.dosage_amount}
                          onChange={(e) => handleUpdateSupplement(index, { dosage_amount: parseFloat(e.target.value) })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Единица</Label>
                        <Input
                          value={supp.dosage_unit}
                          onChange={(e) => handleUpdateSupplement(index, { dosage_unit: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Форма</Label>
                        <Input
                          value={supp.form || ''}
                          onChange={(e) => handleUpdateSupplement(index, { form: e.target.value })}
                          placeholder="капсула"
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs mb-2 block">Время приема</Label>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(INTAKE_TIME_LABELS).map(([key, label]) => (
                          <label key={key} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={supp.intake_times.includes(key)}
                              onChange={(e) => {
                                const newTimes = e.target.checked
                                  ? [...supp.intake_times, key]
                                  : supp.intake_times.filter(t => t !== key);
                                handleUpdateSupplement(index, { intake_times: newTimes });
                              }}
                            />
                            <span className="text-sm">{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {supp.timing_notes && (
                      <div className="p-2 bg-muted/30 rounded text-xs">
                        📝 {supp.timing_notes}
                      </div>
                    )}

                    {/* Validation Warning Badge */}
                    {(() => {
                      const validation = validateIntakeTimes(
                        supp.supplement_name, 
                        supp.intake_times
                      );
                      
                      if (validation.suggested) {
                        return (
                          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 space-y-1">
                              <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
                                AI Коррекция применена
                              </p>
                              <p className="text-xs text-amber-700 dark:text-amber-300">
                                {validation.warning}
                              </p>
                              <div className="flex gap-1 flex-wrap mt-2">
                                <span className="text-xs text-amber-600 dark:text-amber-400">
                                  Исходное время:
                                </span>
                                {supp.intake_times.map(time => (
                                  <Badge 
                                    key={time} 
                                    variant="outline" 
                                    className="text-xs border-amber-300 dark:border-amber-700"
                                  >
                                    {INTAKE_TIME_LABELS[time as keyof typeof INTAKE_TIME_LABELS]}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenScanner(index)}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Сканировать баночку
                      </Button>
                      <label className="cursor-pointer">
                        <Button size="sm" variant="outline" asChild>
                          <span>
                            <Upload className="h-4 w-4 mr-2" />
                            Загрузить фото
                          </span>
                        </Button>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handlePhotoUpload(index, file);
                          }}
                        />
                      </label>
                    </div>

                    {supp.photo_url && (
                      <div className="relative w-24 h-24 rounded-lg overflow-hidden border">
                        <img src={supp.photo_url} alt="Supplement" className="w-full h-full object-cover" />
                        <Check className="absolute top-1 right-1 h-5 w-5 text-green-500 bg-white rounded-full p-1" />
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveSupplement(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => setStep('input')}
              variant="outline"
              className="flex-1"
            >
              Назад
            </Button>
            <Button
              onClick={handleCreateProtocol}
              disabled={createProtocolFromParsed.isPending}
              className="flex-1"
              size="lg"
            >
              {createProtocolFromParsed.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Создаю протокол...
                </>
              ) : (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  Создать протокол
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {selectedSupplementIndex !== null && (
        <BottleScanner
          isOpen={scannerOpen}
          onClose={() => {
            setScannerOpen(false);
            setSelectedSupplementIndex(null);
          }}
          onSuccess={async (scannedData) => {
            if (selectedSupplementIndex === null) return;
            
            let photoUrl = scannedData.photoUrl;
            
            // Upload photo to storage if it's a data URL
            if (photoUrl && photoUrl.startsWith('data:')) {
              const uploadedUrl = await uploadSupplementPhoto(
                photoUrl, 
                scannedData.name || parsedSupplements[selectedSupplementIndex].supplement_name
              );
              if (uploadedUrl) {
                photoUrl = uploadedUrl;
              }
            }
            
            // Update supplement with scanned data
            const updatedSupplement = {
              ...parsedSupplements[selectedSupplementIndex],
              supplement_name: scannedData.name || parsedSupplements[selectedSupplementIndex].supplement_name,
              brand: scannedData.brand || parsedSupplements[selectedSupplementIndex].brand,
              dosage_amount: scannedData.dosage || parsedSupplements[selectedSupplementIndex].dosage_amount,
              product_id: scannedData.productId,
              photo_url: photoUrl
            };
            
            handleUpdateSupplement(selectedSupplementIndex, updatedSupplement);
            
            toast({
              title: "✅ Баночка отсканирована!",
              description: scannedData.name 
                ? `${scannedData.name}${scannedData.brand ? ` - ${scannedData.brand}` : ''}`
                : "Данные добавлены к добавке"
            });
            
            setScannerOpen(false);
            setSelectedSupplementIndex(null);
          }}
        />
      )}
    </div>
  );
}