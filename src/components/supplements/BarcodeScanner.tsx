import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SupplementInfoCard } from "@/components/biostack/SupplementInfoCard";
import { supplementsApi } from "@/lib/api";
import { useTranslation } from "react-i18next";

type ScanStep = 'idle' | 'processing' | 'enriching' | 'results';

export function BarcodeScanner() {
  const { toast } = useToast();
  const { t } = useTranslation('supplements');
  const [scanStep, setScanStep] = useState<ScanStep>('idle');
  const [scannedProduct, setScannedProduct] = useState<any>(null);
  const [enrichedProduct, setEnrichedProduct] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // For now, prompt user to manually enter barcode
    const barcode = prompt(t('scanner.enterBarcodePrompt'));
    if (!barcode) return;

    await scanBarcode(barcode);
  };

  const scanBarcode = async (barcode: string) => {
    setScanStep('processing');
    try {
      // Step 1: Scan barcode
      const { data, error } = await supplementsApi.scanBarcode(barcode, true);

      if (error) throw error;

      if (data?.found) {
        setScannedProduct(data.product);
        
        // Add to library automatically
        const { data: { user } } = await supabase.auth.getUser();
        if (user && data.product.id) {
          const { data: existing } = await supabase
            .from('user_supplement_library')
            .select('scan_count')
            .eq('user_id', user.id)
            .eq('product_id', data.product.id)
            .maybeSingle();

          if (existing) {
            await supabase
              .from('user_supplement_library')
              .update({ scan_count: existing.scan_count + 1 })
              .eq('user_id', user.id)
              .eq('product_id', data.product.id);
          } else {
            await supabase
              .from('user_supplement_library')
              .insert({
                user_id: user.id,
                product_id: data.product.id,
                scan_count: 1,
              });
          }
        }
        
        // Step 2: Enrich product data
        setScanStep('enriching');
        const { data: enrichData, error: enrichError } = await supplementsApi.enrich(data.product.id);

        if (enrichError) {
          console.error("Enrichment failed:", enrichError);
          // Continue with basic product data
          setEnrichedProduct(data.product);
        } else {
          setEnrichedProduct(enrichData?.product);
        }

        setScanStep('results');
        toast({
          title: t('scanner.productFound'),
          description: `${data.product.name} by ${data.product.brand}`,
        });
      } else {
        toast({
          title: t('scanner.productNotFound'),
          description: t('scanner.notInDatabase'),
          variant: "destructive",
        });
        setScanStep('idle');
      }
    } catch (error: any) {
      console.error("Error scanning barcode:", error);
      toast({
        title: t('scanner.scanFailed'),
        description: error.message,
        variant: "destructive",
      });
      setScanStep('idle');
    }
  };

  const handleManualEntry = () => {
    const barcode = prompt(t('scanner.enterBarcodePrompt'));
    if (barcode) {
      scanBarcode(barcode);
    }
  };

  return (
    <div className="space-y-6">
      {scanStep === 'idle' && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>{t('scanner.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <Camera className="mr-2 h-4 w-4" />
                {t('scanner.uploadPhoto')}
              </Button>

              <Button
                variant="outline"
                onClick={handleManualEntry}
                className="w-full"
              >
                {t('scanner.enterManually')}
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            <p className="text-xs text-muted-foreground text-center">
              {t('scanner.hint')}
            </p>
          </CardContent>
        </Card>
      )}

      {scanStep === 'processing' && (
        <Card className="glass-card">
          <CardContent className="py-12 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-green-500" />
            <p className="text-lg font-medium">{t('scanner.scanning')}</p>
            <p className="text-sm text-muted-foreground">{t('scanner.lookingUp')}</p>
          </CardContent>
        </Card>
      )}

      {scanStep === 'enriching' && (
        <Card className="glass-card">
          <CardContent className="py-12 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
            <p className="text-lg font-medium">{t('scanner.enriching')}</p>
            <p className="text-sm text-muted-foreground">{t('scanner.gatheringInfo')}</p>
          </CardContent>
        </Card>
      )}

      {scanStep === 'results' && enrichedProduct && (
        <div className="space-y-4">
          <SupplementInfoCard
            product={enrichedProduct}
            onAddToStack={() => {
              toast({
                title: t('scanner.addedToStack'),
                description: t('scanner.addedToStackDesc', { name: enrichedProduct.name }),
              });
              setScanStep('idle');
              setEnrichedProduct(null);
              setScannedProduct(null);
            }}
            onRate={() => {
              toast({
                title: t('scanner.ratingFeature'),
                description: t('scanner.ratingComingSoon'),
              });
            }}
          />

          <Button
            variant="outline"
            onClick={() => {
              setScanStep('idle');
              setEnrichedProduct(null);
              setScannedProduct(null);
            }}
            className="w-full"
          >
            {t('scanner.scanAnother')}
          </Button>
        </div>
      )}
    </div>
  );
}
