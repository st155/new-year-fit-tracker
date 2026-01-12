import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sparkles, Loader2, Upload, Camera, Trash2, Check, AlertTriangle, Package, ChevronDown, History } from "lucide-react";
import { useProtocolMessageParser, ParsedSupplement } from "@/hooks/useProtocolMessageParser";
import { useSupplementProtocol } from "@/hooks/supplements/useSupplementProtocol";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { BottleScanner } from "@/components/biostack/BottleScanner";
import { validateIntakeTimes } from "@/lib/supplement-validation";
import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";

type Step = 'input' | 'preview';

interface ProtocolMessageParserProps {
  onProtocolCreated?: () => void;
}

export function ProtocolMessageParser({ onProtocolCreated }: ProtocolMessageParserProps) {
  const { t } = useTranslation('supplements');
  const [step, setStep] = useState<Step>('input');
  const [messageText, setMessageText] = useState('');
  const [parsedSupplements, setParsedSupplements] = useState<ParsedSupplement[]>([]);
  const [protocolName, setProtocolName] = useState('');
  const [protocolDescription, setProtocolDescription] = useState('');
  const [duration, setDuration] = useState(30);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selectedSupplementIndex, setSelectedSupplementIndex] = useState<number | null>(null);
  const [creationProgress, setCreationProgress] = useState({
    step: '',
    current: 0,
    total: 0
  });
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [recentParsings, setRecentParsings] = useState<any[]>([]);

  const INTAKE_TIME_LABELS: Record<string, string> = {
    morning: `🌅 ${t('timeGroups.morning')}`,
    afternoon: `☀️ ${t('timeGroups.afternoon')}`,
    evening: `🌆 ${t('timeGroups.evening')}`,
    before_sleep: `🌙 ${t('timeGroups.before_sleep')}`
  };

  const EXAMPLE_PROTOCOLS = [
    {
      title: t('parser.examples.doctor'),
      text: t('parser.exampleTexts.doctor')
    },
    {
      title: t('parser.examples.family'),
      text: t('parser.exampleTexts.family')
    },
    {
      title: t('parser.examples.store'),
      text: t('parser.exampleTexts.store')
    }
  ];

  const { user } = useAuth();
  const { toast } = useToast();
  const parseMutation = useProtocolMessageParser();
  const { createProtocolFromParsed } = useSupplementProtocol(user?.id);

  // Load recent parsing history
  useEffect(() => {
    if (user?.id && step === 'input') {
      loadRecentParsings();
    }
  }, [user?.id, step]);

  const loadRecentParsings = async () => {
    if (!user?.id) return;
    
    const { data } = await supabase
      .from('protocol_parsing_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (data) {
      setRecentParsings(data);
    }
  };

  const loadParsingHistory = (parsing: any) => {
    setMessageText(parsing.original_text);
    setParsedSupplements(parsing.parsed_supplements);
    setProtocolName(t('parser.protocolFromDate', { date: new Date(parsing.created_at).toLocaleDateString() }));
    setStep('preview');
    
    toast({
      title: t('parser.historyLoaded'),
      description: t('parser.fromHistory', { count: parsing.parsed_supplements.length })
    });
  };

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
        title: t('parser.enterText'),
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
            title: `⚠️ ${supp.supplement_name}: ${t('parser.intakeTimeCorrected')}`,
            description: `${validation.warning}\n\n${t('parser.newTime')} ${correctedTimesText}`,
            duration: 6000,
          });
          return { ...supp, intake_times: validation.suggested };
        }
        return supp;
      });

      setParsedSupplements(validated);
      setProtocolName(t('parser.protocolFromDate', { date: new Date().toLocaleDateString() }));
      setStep('preview');

      // Save to history
      if (user?.id) {
        await supabase
          .from('protocol_parsing_history')
          .insert([{
            user_id: user.id,
            original_text: messageText,
            parsed_supplements: validated as any
          }]);
      }

      toast({
        title: `✅ ${t('parser.foundSupplements', { count: supplements.length })}`,
        description: t('parser.checkDataAndPhotos')
      });
    } catch (error) {
      toast({
        title: t('parser.parseError'),
        description: error instanceof Error ? error.message : t('parser.tryAgain'),
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

  const validateProtocolData = (): { valid: boolean; error: string } => {
    // 1. Название протокола
    if (!protocolName.trim()) {
      return { valid: false, error: t('parser.enterProtocolName') };
    }
    
    if (protocolName.length < 3) {
      return { valid: false, error: t('parser.nameTooShort') };
    }
    
    // 2. Длительность
    if (duration < 1 || duration > 365) {
      return { valid: false, error: t('parser.durationRange') };
    }
    
    // 3. Количество добавок
    if (parsedSupplements.length === 0) {
      return { valid: false, error: t('parser.addAtLeastOne') };
    }
    
    // 4. Валидация каждой добавки
    for (let i = 0; i < parsedSupplements.length; i++) {
      const supp = parsedSupplements[i];
      const suppName = supp.supplement_name || `#${i + 1}`;
      
      // Название
      if (!supp.supplement_name?.trim()) {
        return { valid: false, error: `${suppName}: ${t('parser.specifyName')}` };
      }
      
      // Дозировка
      if (!supp.dosage_amount || supp.dosage_amount <= 0) {
        return { valid: false, error: `${suppName}: ${t('parser.specifyDosage')}` };
      }
      
      if (supp.dosage_amount > 100000) {
        return { valid: false, error: `${suppName}: ${t('parser.dosageTooLarge')}` };
      }
      
      // Единица измерения
      if (!supp.dosage_unit?.trim()) {
        return { valid: false, error: `${suppName}: ${t('parser.specifyUnit')}` };
      }
      
      // Время приема
      if (!supp.intake_times || supp.intake_times.length === 0) {
        return { valid: false, error: `${suppName}: ${t('parser.specifyIntakeTime')}` };
      }
    }
    
    return { valid: true, error: '' };
  };

  const handleCreateProtocol = async () => {
    // Запускаем валидацию
    const validation = validateProtocolData();
    
    if (!validation.valid) {
      toast({
        title: `❌ ${t('parser.validationError')}`,
        description: validation.error,
        variant: "destructive",
        duration: 5000
      });
      return;
    }

    try {
      setCreationProgress({
        step: t('parser.creatingProtocol'),
        current: 0,
        total: parsedSupplements.length
      });
      await createProtocolFromParsed.mutateAsync({
        name: protocolName,
        description: protocolDescription,
        duration,
        supplements: parsedSupplements,
        onProgress: (current: number, total: number, step: string) => {
          setCreationProgress({ step, current, total });
        }
      });

      // 🆕 AUTO-SYNC PROTOCOL ITEMS TO LIBRARY
      console.log('[PROTOCOL-PARSER] Syncing protocol items to library...');
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        // Fetch all protocol items for the newly created protocol
        const { data: protocolData } = await supabase
          .from('protocols')
          .select('id')
          .eq('name', protocolName)
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (protocolData) {
          const { data: items } = await supabase
            .from('protocol_items')
            .select('product_id')
            .eq('protocol_id', protocolData.id);

          if (items && items.length > 0) {
            for (const item of items) {
              await supabase
                .from('user_supplement_library')
                .upsert({
                  user_id: currentUser.id,
                  product_id: item.product_id,
                  source: 'protocol',
                  scan_count: 0,
                }, { onConflict: 'user_id,product_id' });
            }
            console.log('[PROTOCOL-PARSER] ✅ Synced', items.length, 'items to library');
          }
        }
      }

      toast({
        title: `✅ ${t('parser.protocolCreated')}`,
        description: t('parser.supplementsAdded', { count: parsedSupplements.length })
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
      console.error('❌ [Protocol UI] Creation failed:', error);
      
      toast({
        title: t('parser.createError'),
        description: error instanceof Error 
          ? `${error.message}\n\n💡 ${t('parser.checkConsole')}`
          : `${t('parser.tryAgain')}. ${t('parser.checkConsole')}`,
        variant: "destructive",
        duration: 10000
      });
    } finally {
      setCreationProgress({ step: '', current: 0, total: 0 });
    }
  };

  return (
    <div className="space-y-6">
      {step === 'input' && (
        <Card className="p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">📋 {t('parser.title')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('parser.description')}
            </p>
          </div>

          {/* Examples Section */}
          <Collapsible open={examplesOpen} onOpenChange={setExamplesOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-full">
              <ChevronDown className={`h-4 w-4 transition-transform ${examplesOpen ? 'rotate-180' : ''}`} />
              📝 {t('parser.examplesTitle')}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 mt-3">
              {EXAMPLE_PROTOCOLS.map((example, i) => (
                <Card key={i} className="p-3 space-y-2 bg-muted/30">
                  <div className="flex items-start justify-between">
                    <p className="text-xs font-medium">{example.title}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs"
                      onClick={() => setMessageText(example.text)}
                    >
                      {t('parser.useExample')}
                    </Button>
                  </div>
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                    {example.text}
                  </pre>
                </Card>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Recent Parsings History */}
          {recentParsings.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <History className="h-4 w-4" />
                🕐 {t('parser.recentParsings')}
              </Label>
              <div className="space-y-2">
                {recentParsings.map((parsing) => (
                  <Card
                    key={parsing.id}
                    className="p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => loadParsingHistory(parsing)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {t('parser.supplementsCount', { count: parsing.parsed_supplements.length })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(parsing.created_at).toLocaleDateString(undefined, {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {t('parser.load')}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>{t('parser.protocolText')}</Label>
            <Textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={t('parser.enterText')}
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
                {t('parser.analyzing')}
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                {t('parser.recognize')}
              </>
            )}
          </Button>
        </Card>
      )}

      {step === 'preview' && parsedSupplements.length === 0 && (
        <Card className="p-12 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{t('parser.noSupplements')}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {t('parser.allRemoved')}
            </p>
          </div>
          <Button onClick={() => setStep('input')} variant="outline" size="lg">
            {t('parser.backToInput')}
          </Button>
        </Card>
      )}

      {step === 'preview' && parsedSupplements.length > 0 && (
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <div>
            <h3 className="text-lg font-semibold mb-2">{t('parser.protocolSettings')}</h3>
              <div className="grid gap-4">
                <div>
                  <Label>{t('parser.protocolName')}</Label>
                  <Input
                    value={protocolName}
                    onChange={(e) => setProtocolName(e.target.value)}
                    placeholder={t('parser.namePlaceholder')}
                  />
                </div>
                <div>
                  <Label>{t('parser.descriptionOptional')}</Label>
                  <Textarea
                    value={protocolDescription}
                    onChange={(e) => setProtocolDescription(e.target.value)}
                    placeholder={t('parser.descriptionPlaceholder')}
                    rows={2}
                  />
                </div>
                <div>
                  <Label>{t('parser.durationLabel')}</Label>
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
            <h3 className="text-lg font-semibold">{t('parser.supplementsTitle', { count: parsedSupplements.length })}</h3>
            
            {parsedSupplements.map((supp, index) => (
              <Card key={index} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 grid gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">{t('parser.nameLabel')}</Label>
                        <Input
                          value={supp.supplement_name}
                          onChange={(e) => handleUpdateSupplement(index, { supplement_name: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">{t('parser.brandLabel')}</Label>
                        <Input
                          value={supp.brand || ''}
                          onChange={(e) => handleUpdateSupplement(index, { brand: e.target.value })}
                          placeholder={t('parser.brandPlaceholder')}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">{t('parser.dosageLabel')}</Label>
                        <Input
                          type="number"
                          value={supp.dosage_amount}
                          onChange={(e) => handleUpdateSupplement(index, { dosage_amount: parseFloat(e.target.value) })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">{t('parser.unitLabel')}</Label>
                        <Input
                          value={supp.dosage_unit}
                          onChange={(e) => handleUpdateSupplement(index, { dosage_unit: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">{t('parser.formLabel')}</Label>
                        <Input
                          value={supp.form || ''}
                          onChange={(e) => handleUpdateSupplement(index, { form: e.target.value })}
                          placeholder={t('parser.formPlaceholder')}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs mb-2 block">{t('parser.intakeTimeLabel')}</Label>
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
                                {t('parser.aiCorrectionApplied')}
                              </p>
                              <p className="text-xs text-amber-700 dark:text-amber-300">
                                {validation.warning}
                              </p>
                              <div className="flex gap-1 flex-wrap mt-2">
                                <span className="text-xs text-amber-600 dark:text-amber-400">
                                  {t('parser.originalTime')}
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
                        {t('parser.scanBottle')}
                      </Button>
                      <label className="cursor-pointer">
                        <Button size="sm" variant="outline" asChild>
                          <span>
                            <Upload className="h-4 w-4 mr-2" />
                            {t('parser.uploadPhoto')}
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
              {t('common:buttons.back')}
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
                  {t('parser.creatingProtocol')}
                </>
              ) : (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  {t('parser.createProtocol')}
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
            setScannerOpen(false);
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
              title: `✅ ${t('parser.bottleScanned')}`,
              description: scannedData.name 
                ? `${scannedData.name}${scannedData.brand ? ` - ${scannedData.brand}` : ''}`
                : t('parser.dataAddedToSupplement')
            });
            
            setScannerOpen(false);
            setSelectedSupplementIndex(null);
          }}
        />
      )}

      {/* Progress indicator overlay */}
      {createProtocolFromParsed.isPending && creationProgress.total > 0 && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="p-6 space-y-4 max-w-md mx-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <h3 className="font-semibold">{creationProgress.step}</h3>
              </div>
              <Progress 
                value={(creationProgress.current / creationProgress.total) * 100} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground text-center">
                {t('parser.progressText', { current: creationProgress.current, total: creationProgress.total })}
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}