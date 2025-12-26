/**
 * SupplementsSheet - Quick supplement logging
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pill, Check, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SupplementsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Mock data - replace with real hook
const mockSupplements = [
  { id: "1", name: "Vitamin D3", dosage: "5000 IU", time: "Morning", taken: false },
  { id: "2", name: "Omega-3", dosage: "2g", time: "Morning", taken: false },
  { id: "3", name: "Magnesium", dosage: "400mg", time: "Evening", taken: true },
  { id: "4", name: "Zinc", dosage: "25mg", time: "Evening", taken: false },
];

export function SupplementsSheet({ open, onOpenChange }: SupplementsSheetProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [supplements, setSupplements] = useState(mockSupplements);
  const [isLoading, setIsLoading] = useState(false);

  const pendingCount = supplements.filter((s) => !s.taken).length;
  const allTaken = pendingCount === 0;

  const toggleSupplement = (id: string) => {
    setSupplements((prev) =>
      prev.map((s) => (s.id === id ? { ...s, taken: !s.taken } : s))
    );
  };

  const markAllTaken = async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      setSupplements((prev) => prev.map((s) => ({ ...s, taken: true })));
      
      toast({
        title: t("common.success", "Success"),
        description: t("quickActions.allSupplementsTaken", "All supplements marked as taken"),
      });

      setTimeout(() => {
        onOpenChange(false);
      }, 1000);
    } catch (error) {
      console.error("Error marking supplements:", error);
      toast({
        title: t("common.error", "Error"),
        description: t("quickActions.supplementsError", "Failed to update supplements"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("quickActions.takeSupplements", "Take Supplements")}
      snapPoints={[60]}
    >
      <div className="space-y-4 pt-4">
        {/* Status indicator */}
        <div className="flex items-center justify-center gap-3 py-2">
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center",
            allTaken ? "bg-emerald-500/20" : "bg-amber-500/20"
          )}>
            {allTaken ? (
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            ) : (
              <Pill className="h-8 w-8 text-amber-500" />
            )}
          </div>
          <div>
            <p className="font-semibold text-lg">
              {allTaken 
                ? t("quickActions.allDone", "All done!") 
                : t("quickActions.pendingCount", "{{count}} pending", { count: pendingCount })}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("quickActions.todaysSupplements", "Today's supplements")}
            </p>
          </div>
        </div>

        {/* Supplement list */}
        <div className="space-y-2">
          {supplements.map((supplement) => (
            <button
              key={supplement.id}
              onClick={() => toggleSupplement(supplement.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
                "border border-border/50",
                supplement.taken 
                  ? "bg-emerald-500/10 border-emerald-500/30" 
                  : "bg-card hover:bg-accent/50"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                supplement.taken ? "bg-emerald-500" : "bg-muted"
              )}>
                {supplement.taken ? (
                  <Check className="h-4 w-4 text-white" />
                ) : (
                  <Pill className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 text-left">
                <p className={cn(
                  "font-medium",
                  supplement.taken && "line-through text-muted-foreground"
                )}>
                  {supplement.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {supplement.dosage} • {supplement.time}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Action button */}
        {!allTaken && (
          <Button
            onClick={markAllTaken}
            className="w-full h-12 text-lg bg-emerald-500 hover:bg-emerald-600"
            disabled={isLoading}
          >
            <CheckCircle2 className="h-5 w-5 mr-2" />
            {isLoading 
              ? t("common.saving", "Saving...") 
              : t("quickActions.markAllTaken", "Mark All as Taken")}
          </Button>
        )}
      </div>
    </BottomSheet>
  );
}
