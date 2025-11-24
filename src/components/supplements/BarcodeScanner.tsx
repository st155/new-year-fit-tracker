import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SupplementInfoCard } from "@/components/biostack/SupplementInfoCard";

type ScanStep = 'idle' | 'processing' | 'enriching' | 'results';

export function BarcodeScanner() {
  const { toast } = useToast();
  const [scanStep, setScanStep] = useState<ScanStep>('idle');
  const [scannedProduct, setScannedProduct] = useState<any>(null);
  const [enrichedProduct, setEnrichedProduct] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // For now, prompt user to manually enter barcode
    const barcode = prompt("Enter the barcode number:");
    if (!barcode) return;

    await scanBarcode(barcode);
  };

  const scanBarcode = async (barcode: string) => {
    setScanStep('processing');
    try {
      // Step 1: Scan barcode
      const { data, error } = await supabase.functions.invoke(
        "scan-supplement-barcode",
        {
          body: {
            barcode,
            create_if_not_found: true,
          },
        }
      );

      if (error) throw error;

      if (data.found) {
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
        const { data: enrichData, error: enrichError } = await supabase.functions.invoke(
          "enrich-supplement-info",
          {
            body: { productId: data.product.id }
          }
        );

        if (enrichError) {
          console.error("Enrichment failed:", enrichError);
          // Continue with basic product data
          setEnrichedProduct(data.product);
        } else {
          setEnrichedProduct(enrichData.product);
        }

        setScanStep('results');
        toast({
          title: "Product found!",
          description: `${data.product.name} by ${data.product.brand}`,
        });
      } else {
        toast({
          title: "Product not found",
          description: "This product is not in our database",
          variant: "destructive",
        });
        setScanStep('idle');
      }
    } catch (error: any) {
      console.error("Error scanning barcode:", error);
      toast({
        title: "Scan failed",
        description: error.message,
        variant: "destructive",
      });
      setScanStep('idle');
    }
  };

  const handleManualEntry = () => {
    const barcode = prompt("Enter the barcode number:");
    if (barcode) {
      scanBarcode(barcode);
    }
  };

  return (
    <div className="space-y-6">
      {scanStep === 'idle' && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Scan Barcode</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <Camera className="mr-2 h-4 w-4" />
                Upload Barcode Photo
              </Button>

              <Button
                variant="outline"
                onClick={handleManualEntry}
                className="w-full"
              >
                Enter Barcode Manually
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
              Scan or enter the UPC/EAN barcode from your supplement bottle
            </p>
          </CardContent>
        </Card>
      )}

      {scanStep === 'processing' && (
        <Card className="glass-card">
          <CardContent className="py-12 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-green-500" />
            <p className="text-lg font-medium">Scanning barcode...</p>
            <p className="text-sm text-muted-foreground">Looking up product information</p>
          </CardContent>
        </Card>
      )}

      {scanStep === 'enriching' && (
        <Card className="glass-card">
          <CardContent className="py-12 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
            <p className="text-lg font-medium">Enriching data...</p>
            <p className="text-sm text-muted-foreground">Gathering comprehensive information about this supplement</p>
          </CardContent>
        </Card>
      )}

      {scanStep === 'results' && enrichedProduct && (
        <div className="space-y-4">
          <SupplementInfoCard
            product={enrichedProduct}
            onAddToStack={() => {
              toast({
                title: "Added to stack",
                description: `${enrichedProduct.name} added to your supplement stack`,
              });
              setScanStep('idle');
              setEnrichedProduct(null);
              setScannedProduct(null);
            }}
            onRate={() => {
              toast({
                title: "Rating feature",
                description: "Rating functionality coming soon!",
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
            Scan Another
          </Button>
        </div>
      )}
    </div>
  );
}
