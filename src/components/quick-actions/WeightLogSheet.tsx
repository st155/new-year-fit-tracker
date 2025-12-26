/**
 * WeightLogSheet - Quick weight logging form
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Scale, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface WeightLogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WeightLogSheet({ open, onOpenChange }: WeightLogSheetProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [weight, setWeight] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight || !user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.from("unified_metrics").insert({
        user_id: user.id,
        metric_name: "Weight",
        metric_category: "body_composition",
        value: parseFloat(weight),
        unit: "kg",
        source: "manual",
        measurement_date: new Date().toISOString().split("T")[0],
      });

      if (error) throw error;

      setSuccess(true);
      toast({
        title: t("common.success", "Success"),
        description: t("quickActions.weightSaved", "Weight logged successfully"),
      });

      setTimeout(() => {
        setWeight("");
        setSuccess(false);
        onOpenChange(false);
      }, 1000);
    } catch (error) {
      console.error("Error logging weight:", error);
      toast({
        title: t("common.error", "Error"),
        description: t("quickActions.weightError", "Failed to log weight"),
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
      title={t("quickActions.logWeight", "Log Weight")}
      snapPoints={[40]}
    >
      <form onSubmit={handleSubmit} className="space-y-6 pt-4">
        <div className="flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center">
            <Scale className="h-10 w-10 text-blue-500" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="weight" className="text-base">
            {t("quickActions.weightLabel", "Current Weight")}
          </Label>
          <div className="relative">
            <Input
              id="weight"
              type="number"
              step="0.1"
              min="20"
              max="300"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="75.5"
              className="text-2xl h-14 text-center pr-12"
              autoFocus
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
              kg
            </span>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-12 text-lg"
          disabled={!weight || isLoading || success}
        >
          {success ? (
            <>
              <Check className="h-5 w-5 mr-2" />
              {t("common.saved", "Saved!")}
            </>
          ) : isLoading ? (
            t("common.saving", "Saving...")
          ) : (
            t("common.save", "Save")
          )}
        </Button>
      </form>
    </BottomSheet>
  );
}
