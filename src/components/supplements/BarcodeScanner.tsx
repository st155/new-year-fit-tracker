import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function BarcodeScanner() {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
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
    setIsProcessing(true);
    try {
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
      }
    } catch (error: any) {
      console.error("Error scanning barcode:", error);
      toast({
        title: "Scan failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
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
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Scan Barcode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-4 w-4" />
                  Upload Barcode Photo
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleManualEntry}
              disabled={isProcessing}
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

      {scannedProduct && (
        <Card className="glass-card border-primary/50 shadow-glow">
          <CardHeader>
            <CardTitle>Scanned Product</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {scannedProduct.image_url && (
              <img
                src={scannedProduct.image_url}
                alt={scannedProduct.name}
                className="w-full h-48 object-contain rounded-lg bg-muted"
              />
            )}

            <div>
              <h4 className="font-semibold text-lg">{scannedProduct.name}</h4>
              <p className="text-sm text-muted-foreground">
                {scannedProduct.brand} • {scannedProduct.category}
              </p>
            </div>

            {scannedProduct.serving_size && (
              <p className="text-sm">
                <span className="text-muted-foreground">Serving:</span>{" "}
                <span className="font-medium">
                  {scannedProduct.serving_size} {scannedProduct.serving_unit}
                </span>
              </p>
            )}

            {scannedProduct.recommended_dosage && (
              <p className="text-sm">
                <span className="text-muted-foreground">Recommended Dosage:</span>{" "}
                <span className="font-medium">{scannedProduct.recommended_dosage}</span>
              </p>
            )}

            {scannedProduct.ingredients && scannedProduct.ingredients.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Ingredients:</p>
                <p className="text-sm text-muted-foreground">
                  {scannedProduct.ingredients.join(", ")}
                </p>
              </div>
            )}

            <Button className="w-full">Add to Inventory</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
