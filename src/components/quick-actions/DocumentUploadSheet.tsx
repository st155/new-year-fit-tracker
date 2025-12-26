/**
 * DocumentUploadSheet - Quick document upload
 */

import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Upload, Check, X, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface DocumentUploadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentUploadSheet({ open, onOpenChange }: DocumentUploadSheetProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast({
          title: t("common.error", "Error"),
          description: t("quickActions.pdfOnly", "Only PDF files are allowed"),
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    try {
      // TODO: Replace with actual upload logic
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setSuccess(true);
      toast({
        title: t("common.success", "Success"),
        description: t("quickActions.documentUploaded", "Document uploaded successfully"),
      });

      setTimeout(() => {
        setSelectedFile(null);
        setSuccess(false);
        onOpenChange(false);
      }, 1000);
    } catch (error) {
      console.error("Error uploading:", error);
      toast({
        title: t("common.error", "Error"),
        description: t("quickActions.uploadError", "Failed to upload document"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("quickActions.uploadDocument", "Upload Document")}
      snapPoints={[45]}
    >
      <div className="space-y-4 pt-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />

        {!selectedFile ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "w-full h-40 rounded-2xl border-2 border-dashed",
              "border-border/50 bg-muted/30",
              "flex flex-col items-center justify-center gap-3",
              "hover:bg-muted/50 hover:border-primary/50 transition-all"
            )}
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-medium">{t("quickActions.tapToUpload", "Tap to upload")}</p>
              <p className="text-sm text-muted-foreground">
                {t("quickActions.pdfFormat", "PDF format only")}
              </p>
            </div>
          </button>
        ) : (
          <div className={cn(
            "w-full p-4 rounded-2xl border-2",
            "border-primary/30 bg-primary/5",
            "flex items-center gap-3"
          )}>
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              onClick={clearFile}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        )}

        <Button
          onClick={handleUpload}
          className="w-full h-12 text-lg"
          disabled={!selectedFile || isLoading || success}
        >
          {success ? (
            <>
              <Check className="h-5 w-5 mr-2" />
              {t("common.uploaded", "Uploaded!")}
            </>
          ) : isLoading ? (
            t("common.uploading", "Uploading...")
          ) : (
            <>
              <Upload className="h-5 w-5 mr-2" />
              {t("common.upload", "Upload")}
            </>
          )}
        </Button>
      </div>
    </BottomSheet>
  );
}
