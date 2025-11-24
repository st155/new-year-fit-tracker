import { useState, useRef, useCallback } from "react";
import Webcam from "react-webcam";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, RotateCcw, Sparkles, Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface BottleScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ExtractedData {
  brand: string;
  supplement_name: string;
  dosage_per_serving: string;
  servings_per_container: number;
  form: string;
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

type ScanStep = 'camera' | 'preview' | 'analyzing' | 'results';

export function BottleScanner({ isOpen, onClose, onSuccess }: BottleScannerProps) {
  const [step, setStep] = useState<ScanStep>('camera');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [editedData, setEditedData] = useState<ExtractedData | null>(null);
  
  const webcamRef = useRef<Webcam>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    setStep('camera');
    setCapturedImage(null);
    setScanResult(null);
    setEditedData(null);
    onClose();
  }, [onClose]);

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
      setCapturedImage(compressed);
      setStep('preview');
    }
  }, []);

  // Retake photo
  const handleRetake = useCallback(() => {
    setCapturedImage(null);
    setStep('camera');
  }, []);

  // Analyze with AI
  const handleAnalyze = useCallback(async () => {
    if (!capturedImage) return;

    setStep('analyzing');
    
    try {
      // Setup 90 second timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Analysis timeout - please try again with better lighting')), 90000)
      );

      const analyzePromise = supabase.functions.invoke('scan-supplement-bottle', {
        body: { imageBase64: capturedImage },
      });

      const { data, error } = await Promise.race([analyzePromise, timeoutPromise]) as any;

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to analyze bottle');
      }

      setScanResult(data);
      setEditedData(data.extracted);
      setStep('results');
      
      toast({
        title: "✅ Bottle analyzed!",
        description: `Detected: ${data.extracted.supplement_name}`,
      });
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Failed to analyze bottle. Please try again.",
        variant: "destructive",
      });
      setStep('preview');
    }
  }, [capturedImage, toast]);

  // Add to stack mutation
  const addToStackMutation = useMutation({
    mutationFn: async () => {
      if (!scanResult || !editedData) throw new Error('No scan result');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Parse dosage_per_serving into amount and unit
      const dosageMatch = editedData.dosage_per_serving.match(/^([\d.]+)\s*(.+)$/);
      const dosageAmount = dosageMatch ? parseFloat(dosageMatch[1]) : 0;
      const dosageUnit = dosageMatch ? dosageMatch[2].trim() : 'mg';

      // Find or create product
      let productId: string | null = null;
      
      const { data: existingProduct } = await supabase
        .from('supplement_products')
        .select('id')
        .ilike('name', editedData.supplement_name)
        .maybeSingle();

      if (existingProduct) {
        productId = existingProduct.id;
      } else {
        const { data: newProduct, error: productError } = await supabase
          .from('supplement_products')
          .insert({
            name: editedData.supplement_name,
            brand: editedData.brand || 'Unknown',
            dosage_amount: dosageAmount,
            dosage_unit: dosageUnit,
            form: editedData.form || null,
            servings_per_container: editedData.servings_per_container || null,
          })
          .select('id')
          .single();

        if (productError) throw productError;
        productId = newProduct.id;
      }

      // Insert into user_stack
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
          servings_remaining: editedData.servings_per_container,
          reorder_threshold: Math.floor(editedData.servings_per_container * 0.2),
        });

      if (stackError) throw stackError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-stack'] });
      toast({
        title: "✅ Added to stack!",
        description: `${editedData?.supplement_name} is now in your supplement stack.`,
      });
      handleClose();
      onSuccess();
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-neutral-950 border border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Camera className="h-5 w-5 text-blue-400" />
            Scan Supplement Bottle
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera View */}
          {step === 'camera' && (
            <div className="space-y-4">
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
                  Capture
                </Button>
                <Button onClick={handleClose} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Preview View */}
          {step === 'preview' && capturedImage && (
            <div className="space-y-4">
              <div className="relative aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-blue-500/50">
                <img src={capturedImage} alt="Captured bottle" className="w-full h-full object-contain" />
              </div>
              
              <div className="flex gap-2 justify-center">
                <Button
                  onClick={handleAnalyze}
                  size="lg"
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  Analyze with AI
                </Button>
                <Button onClick={handleRetake} variant="outline">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retake
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

          {/* Results View */}
          {step === 'results' && scanResult && editedData && (
            <div className="space-y-4">
              <div className="p-4 bg-neutral-900 rounded-lg border border-green-500/20 space-y-3">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-5 w-5 text-green-400 shrink-0 mt-1" />
                  <div className="flex-1 space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Supplement Name</Label>
                      <Input
                        value={editedData.supplement_name}
                        onChange={(e) => setEditedData({ ...editedData, supplement_name: e.target.value })}
                        className="mt-1 bg-neutral-950"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Brand</Label>
                      <Input
                        value={editedData.brand}
                        onChange={(e) => setEditedData({ ...editedData, brand: e.target.value })}
                        className="mt-1 bg-neutral-950"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Dosage</Label>
                        <Input
                          value={editedData.dosage_per_serving}
                          onChange={(e) => setEditedData({ ...editedData, dosage_per_serving: e.target.value })}
                          className="mt-1 bg-neutral-950"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Servings</Label>
                        <Input
                          type="number"
                          value={editedData.servings_per_container}
                          onChange={(e) => setEditedData({ ...editedData, servings_per_container: parseInt(e.target.value) })}
                          className="mt-1 bg-neutral-950"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Suggestions */}
                <div className="p-3 bg-green-500/5 rounded border border-green-500/20 space-y-2">
                  <p className="text-xs text-green-400 font-semibold">🤖 AI Suggestions:</p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>⏰ Best time: <span className="text-foreground capitalize">{scanResult.suggestions.intake_times.join(', ')}</span></p>
                    <p>🔬 Tracking: <span className="text-foreground">{scanResult.suggestions.linked_biomarkers.length} biomarker(s)</span></p>
                    <p>🎯 Goal: <span className="text-foreground">{scanResult.suggestions.target_outcome}</span></p>
                  </div>
                  <p className="text-xs text-muted-foreground italic mt-2">
                    {scanResult.suggestions.ai_rationale}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 justify-center">
                <Button
                  onClick={() => addToStackMutation.mutate()}
                  disabled={addToStackMutation.isPending}
                  size="lg"
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                >
                  {addToStackMutation.isPending ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-5 w-5 mr-2" />
                  )}
                  Add to Stack
                </Button>
                <Button onClick={handleRetake} variant="outline">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Scan Another
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
