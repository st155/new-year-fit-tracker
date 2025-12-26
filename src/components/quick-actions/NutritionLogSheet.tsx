/**
 * NutritionLogSheet - Quick water/meal logging
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Droplets, UtensilsCrossed, Check, Coffee, Apple, Salad } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface NutritionLogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type LogType = "water" | "meal";

const waterOptions = [
  { id: "250", label: "250 ml", icon: "💧" },
  { id: "500", label: "500 ml", icon: "💧💧" },
  { id: "1000", label: "1 L", icon: "🫗" },
];

const mealOptions = [
  { id: "breakfast", label: "Breakfast", icon: Coffee },
  { id: "snack", label: "Snack", icon: Apple },
  { id: "lunch", label: "Lunch", icon: Salad },
  { id: "dinner", label: "Dinner", icon: UtensilsCrossed },
];

export function NutritionLogSheet({ open, onOpenChange }: NutritionLogSheetProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [logType, setLogType] = useState<LogType>("water");
  const [selected, setSelected] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleLog = async () => {
    if (!selected) return;

    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      setSuccess(true);
      toast({
        title: t("common.success", "Success"),
        description: logType === "water" 
          ? t("quickActions.waterLogged", "Water intake logged")
          : t("quickActions.mealLogged", "Meal logged"),
      });

      setTimeout(() => {
        setSelected(null);
        setSuccess(false);
        onOpenChange(false);
      }, 1000);
    } catch (error) {
      console.error("Error logging:", error);
      toast({
        title: t("common.error", "Error"),
        description: t("quickActions.logError", "Failed to log"),
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
      title={t("quickActions.addNutrition", "Add Water/Meal")}
      snapPoints={[55]}
    >
      <div className="space-y-4 pt-4">
        {/* Type selector */}
        <div className="flex gap-2 p-1 bg-muted rounded-xl">
          <button
            onClick={() => { setLogType("water"); setSelected(null); }}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all",
              logType === "water" 
                ? "bg-background shadow-sm text-foreground" 
                : "text-muted-foreground"
            )}
          >
            <Droplets className="h-4 w-4" />
            {t("quickActions.water", "Water")}
          </button>
          <button
            onClick={() => { setLogType("meal"); setSelected(null); }}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all",
              logType === "meal" 
                ? "bg-background shadow-sm text-foreground" 
                : "text-muted-foreground"
            )}
          >
            <UtensilsCrossed className="h-4 w-4" />
            {t("quickActions.meal", "Meal")}
          </button>
        </div>

        {/* Options */}
        {logType === "water" ? (
          <div className="flex gap-3 justify-center">
            {waterOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setSelected(option.id)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-2xl flex-1",
                  "border-2 transition-all",
                  selected === option.id
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-border/50 bg-card hover:bg-accent/50"
                )}
              >
                <span className="text-2xl">{option.icon}</span>
                <span className="font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {mealOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setSelected(option.id)}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-2xl",
                  "border-2 transition-all",
                  selected === option.id
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-border/50 bg-card hover:bg-accent/50"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  selected === option.id ? "bg-amber-500" : "bg-muted"
                )}>
                  <option.icon className={cn(
                    "h-5 w-5",
                    selected === option.id ? "text-white" : "text-muted-foreground"
                  )} />
                </div>
                <span className="font-medium">
                  {t(`quickActions.meals.${option.id}`, option.label)}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Action button */}
        <Button
          onClick={handleLog}
          className={cn(
            "w-full h-12 text-lg",
            logType === "water" ? "bg-blue-500 hover:bg-blue-600" : "bg-amber-500 hover:bg-amber-600"
          )}
          disabled={!selected || isLoading || success}
        >
          {success ? (
            <>
              <Check className="h-5 w-5 mr-2" />
              {t("common.logged", "Logged!")}
            </>
          ) : isLoading ? (
            t("common.saving", "Saving...")
          ) : (
            t("common.log", "Log")
          )}
        </Button>
      </div>
    </BottomSheet>
  );
}
