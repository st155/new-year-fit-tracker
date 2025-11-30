import { useState, useRef, useCallback } from "react";
import Webcam from "react-webcam";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, RotateCcw, Sparkles, Loader2, Plus, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SupplementInfoCard } from "./SupplementInfoCard";

interface BottleScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (scannedData: {
    name?: string;
    brand?: string;
    dosage?: number;
    photoUrl?: string;
    productId?: string;
  }) => void;
}

interface ExtractedData {
  brand: string;
  supplement_name: string;
  dosage_per_serving: string;
  servings_per_container: number;
  form: string;
  barcode?: string | null;
  recommended_daily_intake?: string | null;
  ingredients?: string[] | null;
  warnings?: string | null;
  expiration_info?: string | null;
}

interface ScanResult {
  extracted: ExtractedData;
  suggestions: {
    intake_times: string[];
    linked_biomarkers: string[];
    ai_rationale: string;
    target_outcome: string;
  };
}

type ScanStep = 'camera-front' | 'camera-back' | 'preview' | 'analyzing' | 'enriching' | 'info-card';

export function BottleScanner({ isOpen, onClose, onSuccess }: BottleScannerProps) {
  const [step, setStep] = useState<ScanStep>('camera-front');
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null); // Legacy for backward compatibility
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [editedData, setEditedData] = useState<ExtractedData | null>(null);
  const [enrichedProduct, setEnrichedProduct] = useState<any>(null);
  const [productId, setProductId] = useState<string | null>(null);
  const [sharedUsage, setSharedUsage] = useState(false);
  const [approximateServings, setApproximateServings] = useState(0);
  const [isQuickMatch, setIsQuickMatch] = useState(false);
  
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    setStep('camera-front');
    setFrontImage(null);
    setBackImage(null);
    setCapturedImage(null);
    setScanResult(null);
    setEditedData(null);
    setEnrichedProduct(null);
    setProductId(null);
    setIsQuickMatch(false);
    onClose();
  }, [onClose]);

  // Helper: Add or update product in library
  const addToLibrary = async (productId: string, productName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('[BOTTLE-SCANNER] Adding to library...');
      const { data: existingLibEntry, error: libCheckError } = await supabase
        .from('user_supplement_library')
        .select('id, scan_count')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle();

      if (libCheckError) {
        console.error('[BOTTLE-SCANNER] Error checking library:', libCheckError);
        return;
      }

      if (existingLibEntry) {
        // Update scan count
        console.log('[BOTTLE-SCANNER] Updating library scan count...');
        const { error: updateError } = await supabase
          .from('user_supplement_library')
          .update({ scan_count: existingLibEntry.scan_count + 1 })
          .eq('id', existingLibEntry.id);

        if (updateError) {
          console.error('[BOTTLE-SCANNER] Library update error:', updateError);
        } else {
          console.log('[BOTTLE-SCANNER] ✅ Library scan count updated');
          queryClient.invalidateQueries({ queryKey: ['supplement-library'] });
          queryClient.invalidateQueries({ queryKey: ['library-check', productId] });
          toast({
            title: "📚 Scan Recorded",
            description: `${productName} scan count updated.`,
          });
        }
      } else {
        // Create new entry
        console.log('[BOTTLE-SCANNER] Creating new library entry...');
        const { error: libraryError } = await supabase
          .from('user_supplement_library')
          .insert({
            user_id: user.id,
            product_id: productId,
            scan_count: 1,
          });

        if (libraryError) {
          console.error('[BOTTLE-SCANNER] ❌ Library creation failed:', libraryError);
          toast({
            title: "⚠️ Library warning",
            description: "Product found but couldn't add to library.",
          });
        } else {
          console.log('[BOTTLE-SCANNER] ✅ Added to library');
          queryClient.invalidateQueries({ queryKey: ['supplement-library'] });
          queryClient.invalidateQueries({ queryKey: ['library-check', productId] });
          toast({
            title: "📚 Added to Library",
            description: `${productName} saved to your library.`,
          });
        }
      }
    } catch (error) {
      console.error('[BOTTLE-SCANNER] Library operation error:', error);
    }
  };

  // Compress image before upload
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

  // Capture photo from webcam
  const handleCapture = useCallback(async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      const compressed = await compressImage(imageSrc);
      
      if (step === 'camera-front') {
        setFrontImage(compressed);
        setCapturedImage(compressed); // Set legacy for backward compatibility
        setStep('camera-back');
        toast({
          title: "📸 Лицевая сторона готова",
          description: "Теперь сфотографируйте заднюю сторону с баркодом",
        });
      } else if (step === 'camera-back') {
        setBackImage(compressed);
        setStep('preview');
      }
    }
  }, [step, toast]);

  // Upload from gallery
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const compressed = await compressImage(base64);
      
      if (step === 'camera-front') {
        setFrontImage(compressed);
        setCapturedImage(compressed);
        setStep('camera-back');
        toast({
          title: "📸 Лицевая сторона загружена",
          description: "Теперь загрузите заднюю сторону с баркодом",
        });
      } else if (step === 'camera-back') {
        setBackImage(compressed);
        setStep('preview');
      }
    };
    reader.readAsDataURL(file);
  }, [step, toast]);

  // Retake photo
  const handleRetake = useCallback((side: 'front' | 'back') => {
    if (side === 'front') {
      setFrontImage(null);
      setCapturedImage(null);
      setStep('camera-front');
    } else {
      setBackImage(null);
      setStep('camera-back');
    }
  }, []);

  // Skip back side (optional)
  const handleSkipBackSide = useCallback(() => {
    setStep('preview');
    toast({
      title: "ℹ️ Задняя сторона пропущена",
      description: "Баркод не будет извлечен, но AI все равно проанализирует добавку",
    });
  }, [toast]);


  // Create product and enrich
  const createProductAndEnrich = async (extracted: ExtractedData, suggestions: any) => {
    console.log('[BOTTLE-SCANNER] Starting product creation with:', { extracted, suggestions });
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('[BOTTLE-SCANNER] User authenticated:', user.id);

      // Parse dosage with null safety
      const dosageString = extracted.dosage_per_serving || '';
      console.log('[BOTTLE-SCANNER] Parsing dosage:', dosageString);
      
      // Step 1: Extract number and remaining string
      const basicMatch = dosageString.match(/^([\d.]+)\s*(.*)$/);
      const dosageAmount = basicMatch ? parseFloat(basicMatch[1]) || 1 : 1; // Minimum 1 for CHECK constraint
      
      // Step 2: Extract ONLY valid unit from the remaining string
      const validUnits = ['mg', 'g', 'mcg', 'IU', 'ml', 'serving'];
      const remainingString = basicMatch ? basicMatch[2].toLowerCase() : '';
      
      // Find valid unit at the start of the remaining string
      let dosageUnit = 'mg'; // default
      for (const unit of validUnits) {
        if (remainingString.startsWith(unit.toLowerCase())) {
          dosageUnit = unit;
          break;
        }
      }
      
      // Validate form field against database constraint
      const validForms = ['capsule', 'tablet', 'powder', 'liquid', 'gummy', 'softgel', 'other'];
      const extractedForm = (extracted.form || '').toLowerCase();
      const validatedForm = validForms.includes(extractedForm) ? extractedForm : 'capsule';

      console.log('[BOTTLE-SCANNER] Parsed dosage:', { dosageAmount, dosageUnit, form: validatedForm });

      // Find or create product
      let newProductId: string | null = null;
      
      console.log('[BOTTLE-SCANNER] Checking for existing product:', extracted.supplement_name, extracted.brand);
      const { data: existingProduct, error: checkError } = await supabase
        .from('supplement_products')
        .select('id')
        .ilike('name', extracted.supplement_name)
        .ilike('brand', extracted.brand || 'Unknown')
        .maybeSingle();

      if (checkError) {
        console.error('[BOTTLE-SCANNER] Error checking existing product:', checkError);
      }

      if (existingProduct) {
        console.log('[BOTTLE-SCANNER] Found existing product:', existingProduct.id);
        newProductId = existingProduct.id;
      } else {
        console.log('[BOTTLE-SCANNER] Creating new product...');
        const { data: newProduct, error: productError } = await supabase
          .from('supplement_products')
          .insert({
            name: extracted.supplement_name || 'Unknown Supplement',
            brand: extracted.brand || 'Unknown',
            dosage_amount: Math.max(dosageAmount, 1), // Ensure > 0 for CHECK constraint
            dosage_unit: dosageUnit || 'mg',
            form: validatedForm, // Use validated form
            servings_per_container: Math.max(extracted.servings_per_container || 30, 1),
            recommended_daily_intake: extracted.recommended_daily_intake || null,
            ingredients: extracted.ingredients || null,
            warnings: extracted.warnings || null,
            expiration_info: extracted.expiration_info || null,
          })
          .select('id')
          .single();

        if (productError) {
          console.error('[BOTTLE-SCANNER] ❌ Product creation failed:', productError);
          throw productError;
        }
        
        console.log('[BOTTLE-SCANNER] ✅ Product created:', newProduct.id);
        newProductId = newProduct.id;
      }

      setProductId(newProductId);

      // Add to library automatically using helper function
      await addToLibrary(newProductId, extracted.supplement_name);

      // Start enrichment with label data
      console.log('[BOTTLE-SCANNER] Starting enrichment with label data...');
      setStep('enriching');
      
      try {
        const { data: enrichData, error: enrichError } = await supabase.functions.invoke('enrich-supplement-info', {
          body: { 
            productId: newProductId,
            labelData: extracted // Pass label data to enrichment
          }
        });

        if (enrichError) {
          console.error('[BOTTLE-SCANNER] Enrichment error:', enrichError);
          throw enrichError;
        }
        
        console.log('[BOTTLE-SCANNER] Enrichment response:', enrichData);
        
        if (!enrichData?.success) {
          throw new Error(enrichData?.error || 'Enrichment failed');
        }

        console.log('[BOTTLE-SCANNER] ✅ Enrichment successful');
        
        // Add serving_size info and barcode from scanned data
        const enrichedProductData = {
          ...enrichData.product,
          barcode: extracted.barcode || null,  // Pass barcode to UI
          serving_size: dosageAmount.toString(),
          serving_unit: dosageUnit,
          recommended_dosage: scanResult?.suggestions?.ai_rationale?.split('.')?.[0] || 'As directed',
        };
        
        setEnrichedProduct(enrichedProductData);
        
        toast({
          title: "✅ Supplement enriched!",
          description: "Complete product information loaded.",
        });
      } catch (enrichError) {
        console.warn('[BOTTLE-SCANNER] ⚠️ Enrichment failed, using basic data:', enrichError);
        
        // Fallback: use basic product data without enrichment
        const basicProduct = {
          id: newProductId,
          name: extracted.supplement_name || 'Unknown Supplement',
          brand: extracted.brand || 'Unknown',
          barcode: extracted.barcode || null,  // Pass barcode to UI
          dosage_amount: dosageAmount,
          dosage_unit: dosageUnit,
          form: extracted.form || 'capsules',
          servings_per_container: extracted.servings_per_container || 30,
          serving_size: dosageAmount.toString(),
          serving_unit: dosageUnit,
          recommended_dosage: scanResult?.suggestions?.ai_rationale?.split('.')?.[0] || 'As directed',
        };
        
        console.log('[BOTTLE-SCANNER] Using fallback basic product:', basicProduct);
        setEnrichedProduct(basicProduct);
        
        toast({
          title: "ℹ️ Basic info loaded",
          description: "Showing extracted information (enrichment unavailable).",
        });
      }
      
      console.log('[BOTTLE-SCANNER] ✅ Moving to info-card step');
      setStep('info-card');
      
    } catch (error) {
      console.error('[BOTTLE-SCANNER] ❌ CRITICAL ERROR in product creation:', error);
      console.error('[BOTTLE-SCANNER] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error,
        extracted,
        suggestions
      });
      
      // Show detailed error to user
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast({
        title: "❌ Failed to process supplement",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
      
      // Return to preview so user can try again
      setStep('preview');
    }
  };

  // Analyze with AI
  const handleAnalyze = useCallback(async () => {
    if (!frontImage) return;

    setStep('analyzing');
    
    try {
      // Setup 90 second timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Analysis timeout - please try again with better lighting')), 90000)
      );

      const analyzePromise = supabase.functions.invoke('scan-supplement-bottle', {
        body: { 
          frontImageBase64: frontImage,
          backImageBase64: backImage || undefined,
        },
      });

      const { data, error } = await Promise.race([analyzePromise, timeoutPromise]) as any;

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to analyze bottle');
      }

      setScanResult(data);
      setEditedData(data.extracted);
      
      // 🆕 QUICK MATCH HANDLING
      if (data.quick_match && data.productId) {
        console.log('[BOTTLE-SCANNER] ⚡ QUICK MATCH! Product found by barcode:', data.productId);
        setProductId(data.productId);
        setIsQuickMatch(true);
        
        // Fetch full product data for info card
        const { data: productData, error: fetchError } = await supabase
          .from('supplement_products')
          .select('*')
          .eq('id', data.productId)
          .single();
        
        if (fetchError) {
          console.error('[BOTTLE-SCANNER] Error fetching product:', fetchError);
          throw fetchError;
        }
        
        if (productData) {
          setEnrichedProduct({
            ...productData,
            barcode: data.extracted.barcode,
          });
        }
        
        // Add to library (or update scan count)
        await addToLibrary(data.productId, data.extracted.supplement_name);
        
        toast({
          title: "⚡ Мгновенное распознавание!",
          description: `${data.extracted.supplement_name} найден по баркоду`,
        });
        
        setStep('info-card');
        return; // Skip enrichment
      }
      
      // Regular flow (product not found by barcode)
      toast({
        title: "✅ Bottle analyzed!",
        description: `Detected: ${data.extracted.supplement_name}`,
      });

      // Create product and enrich immediately
      await createProductAndEnrich(data.extracted, data.suggestions);
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Failed to analyze bottle. Please try again.",
        variant: "destructive",
      });
      setStep('preview');
    }
  }, [frontImage, backImage, toast]);

  // Add to stack mutation (product already created)
  const addToStackMutation = useMutation({
    mutationFn: async () => {
      if (!scanResult || !editedData || !productId) throw new Error('No product data');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Insert into user_stack
      const servingsToUse = sharedUsage ? approximateServings : editedData.servings_per_container;
      const { error: stackError } = await supabase
        .from('user_stack')
        .insert({
          user_id: user.id,
          product_id: productId,
          stack_name: editedData.supplement_name,
          is_active: true,
          intake_times: scanResult.suggestions.intake_times,
          linked_biomarker_ids: scanResult.suggestions.linked_biomarkers,
          target_outcome: scanResult.suggestions.target_outcome,
          ai_suggested: true,
          ai_rationale: scanResult.suggestions.ai_rationale,
          servings_remaining: servingsToUse,
          reorder_threshold: Math.floor(servingsToUse * 0.2),
          approximate_servings: sharedUsage,
          shared_with_others: sharedUsage,
        });

      if (stackError) throw stackError;
      
      return { productId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-stack'] });
      queryClient.invalidateQueries({ queryKey: ['supplement-library'] });
      queryClient.invalidateQueries({ queryKey: ['library-check', productId] });
      queryClient.invalidateQueries({ queryKey: ['stack-check', productId] });
      toast({
        title: "✅ Added to stack!",
        description: `${editedData?.supplement_name} is now in your supplement stack.`,
      });
      
      // Pass scanned data to callback
      onSuccess({
        name: editedData?.supplement_name,
        brand: editedData?.brand,
        dosage: editedData?.dosage_per_serving ? parseFloat(editedData.dosage_per_serving) : undefined,
        photoUrl: frontImage || capturedImage || undefined,
        productId: data?.productId
      });
      
      handleClose();
    },
    onError: (error) => {
      console.error('Add to stack error:', error);
      toast({
        title: "Failed to add supplement",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAddToStack = async () => {
    await addToStackMutation.mutateAsync();
  };

  const handleSaveToLibraryOnly = () => {
    toast({
      title: "📚 Добавлено в библиотеку",
      description: `${enrichedProduct?.name} сохранен в вашей библиотеке`,
    });
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-neutral-950 border border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Camera className="h-5 w-5 text-blue-400" />
            Scan Supplement Bottle
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera View - Front Side */}
          {step === 'camera-front' && (
            <div className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-400 flex items-center gap-2">
                  <span className="text-xl">📦</span>
                  <span className="font-medium">Шаг 1 из 2:</span> Сфотографируйте <strong>лицевую сторону</strong> (название, бренд, дозировка)
                </p>
              </div>
              
              <div className="relative aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{
                    facingMode: "environment",
                    width: 1280,
                    height: 720,
                  }}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="flex gap-2 justify-center">
                <Button
                  onClick={handleCapture}
                  size="lg"
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Сделать фото
                </Button>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  size="lg"
                  variant="outline"
                >
                  <Upload className="h-5 w-5 mr-2" />
                  Загрузить из галереи
                </Button>
                <Button onClick={handleClose} variant="outline">
                  Отмена
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

          {/* Camera View - Back Side */}
          {step === 'camera-back' && (
            <div className="space-y-4">
              {frontImage && (
                <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                  <img src={frontImage} alt="Front side preview" className="w-16 h-16 object-cover rounded border border-green-500/50" />
                  <div className="flex-1">
                    <p className="text-sm text-green-400 font-medium">✅ Лицевая сторона готова</p>
                  </div>
                </div>
              )}
              
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-sm text-blue-400 flex items-center gap-2">
                  <span className="text-xl">🔲</span>
                  <span className="font-medium">Шаг 2 из 2:</span> Сфотографируйте <strong>заднюю сторону</strong> с баркодом и составом
                </p>
              </div>
              
              <div className="relative aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{
                    facingMode: "environment",
                    width: 1280,
                    height: 720,
                  }}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="flex gap-2 justify-center flex-wrap">
                <Button
                  onClick={handleCapture}
                  size="lg"
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Сделать фото
                </Button>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  size="lg"
                  variant="outline"
                >
                  <Upload className="h-5 w-5 mr-2" />
                  Загрузить из галереи
                </Button>
                <Button onClick={() => handleRetake('front')} variant="outline" size="lg">
                  ← Переснять лицевую
                </Button>
                <Button onClick={handleSkipBackSide} variant="ghost" size="lg" className="text-muted-foreground">
                  Пропустить →
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

          {/* Preview View */}
          {step === 'preview' && frontImage && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-green-400 flex items-center gap-2">
                    <span>📦 Лицевая сторона</span>
                  </div>
                  <div className="relative aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-green-500/50">
                    <img src={frontImage} alt="Front side" className="w-full h-full object-contain" />
                  </div>
                  <Button onClick={() => handleRetake('front')} variant="outline" size="sm" className="w-full">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Переснять
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium text-blue-400 flex items-center gap-2">
                    <span>🔲 Задняя сторона</span>
                  </div>
                  {backImage ? (
                    <>
                      <div className="relative aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-blue-500/50">
                        <img src={backImage} alt="Back side" className="w-full h-full object-contain" />
                      </div>
                      <Button onClick={() => handleRetake('back')} variant="outline" size="sm" className="w-full">
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Переснять
                      </Button>
                    </>
                  ) : (
                    <div className="aspect-video bg-neutral-900 rounded-lg flex items-center justify-center border border-dashed border-neutral-700">
                      <p className="text-sm text-muted-foreground">Не загружено</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2 justify-center">
                <Button
                  onClick={handleAnalyze}
                  size="lg"
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  Анализировать с AI
                </Button>
              </div>
            </div>
          )}

          {/* Analyzing State */}
          {step === 'analyzing' && (
            <div className="py-12 text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-400 mx-auto" />
              <div className="space-y-2">
                <p className="text-lg font-semibold text-foreground">🤖 Analyzing bottle with Gemini Vision...</p>
                <p className="text-sm text-muted-foreground">Extracting supplement information from label</p>
                <div className="text-xs text-yellow-400 mt-3 space-y-1">
                  <p>⏱️ This may take 10-30 seconds...</p>
                  <p className="text-muted-foreground">Reading text, identifying brand, dosage, and servings</p>
                </div>
              </div>
            </div>
          )}

          {/* Enriching State */}
          {step === 'enriching' && (
            <div className="py-12 text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-green-400 mx-auto" />
              <div className="space-y-2">
                <p className="text-lg font-semibold text-foreground">🧬 Enriching supplement data...</p>
                <p className="text-sm text-muted-foreground">Fetching detailed information, benefits, and research</p>
                <div className="text-xs text-green-400 mt-3 space-y-1">
                  <p>⏱️ Getting comprehensive product details...</p>
                  <p className="text-muted-foreground">This creates a Vivino-style information card</p>
                </div>
              </div>
            </div>
          )}

          {/* Info Card View */}
          {step === 'info-card' && enrichedProduct && (
            <div className="space-y-4">
              {isQuickMatch && (
                <div className="bg-cyan-500/10 border border-cyan-500/50 rounded-lg p-3 flex items-center gap-2 animate-pulse">
                  <span className="text-2xl">⚡</span>
                  <div>
                    <p className="text-cyan-400 font-semibold">Мгновенно найден по баркоду!</p>
                    <p className="text-xs text-cyan-300/70">Продукт уже в базе данных</p>
                  </div>
                </div>
              )}
              <SupplementInfoCard
                product={enrichedProduct}
                onAddToStack={handleAddToStack}
                onSaveToLibraryOnly={handleSaveToLibraryOnly}
                onRate={() => {/* future feature */}}
              />
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
