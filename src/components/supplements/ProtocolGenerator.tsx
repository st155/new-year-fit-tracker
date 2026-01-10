import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supplementsApi } from "@/lib/api";
import { Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProtocolPreview } from "./ProtocolPreview";
import { useTranslation } from 'react-i18next';

interface ProtocolGeneratorProps {
  onClose: () => void;
}

const GOAL_OPTIONS = [
  "muscle_gain",
  "weight_loss",
  "energy",
  "recovery",
  "focus",
  "sleep",
  "immunity",
  "joint_health",
];

const HEALTH_CONDITIONS = [
  "vitamin_d_deficiency",
  "iron_deficiency",
  "b12_deficiency",
  "magnesium_deficiency",
  "joint_pain",
  "chronic_fatigue",
];

const DIETARY_RESTRICTIONS = [
  "vegan",
  "vegetarian",
  "gluten_free",
  "dairy_free",
  "keto",
];

export function ProtocolGenerator({ onClose }: ProtocolGeneratorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation('supplements');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedProtocol, setGeneratedProtocol] = useState<any>(null);
  const [formData, setFormData] = useState({
    goals: [] as string[],
    health_conditions: [] as string[],
    dietary_restrictions: [] as string[],
    protocol_duration_days: 30,
  });

  const toggleSelection = (category: keyof typeof formData, value: string) => {
    const current = formData[category] as string[];
    setFormData({
      ...formData,
      [category]: current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    });
  };

  const handleGenerate = async () => {
    if (formData.goals.length === 0) {
      toast({
        title: t('protocol.selectGoalRequired'),
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supplementsApi.generateProtocol({
        user_id: user?.id,
        goals: formData.goals,
        health_conditions: formData.health_conditions,
        dietary_restrictions: formData.dietary_restrictions,
        protocol_duration_days: formData.protocol_duration_days,
      });

      if (error) throw error;
      if (!data) throw new Error('No data returned');

      setGeneratedProtocol(data.protocol);
      toast({ title: t('protocol.generatedSuccess') });
    } catch (error: any) {
      console.error("Error generating protocol:", error);
      toast({
        title: t('protocol.generateFailed'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (generatedProtocol) {
    return (
      <ProtocolPreview
        protocol={generatedProtocol}
        onClose={onClose}
        onRegenerate={() => setGeneratedProtocol(null)}
      />
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('protocol.generateTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label className="text-base">{t('protocol.selectGoals')}</Label>
            <div className="grid grid-cols-2 gap-3">
              {GOAL_OPTIONS.map((goal) => (
                <div key={goal} className="flex items-center space-x-2">
                  <Checkbox
                    id={goal}
                    checked={formData.goals.includes(goal)}
                    onCheckedChange={() => toggleSelection("goals", goal)}
                  />
                  <label
                    htmlFor={goal}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize cursor-pointer"
                  >
                    {goal.replace("_", " ")}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-base">{t('protocol.healthConditions')}</Label>
            <div className="grid grid-cols-2 gap-3">
              {HEALTH_CONDITIONS.map((condition) => (
                <div key={condition} className="flex items-center space-x-2">
                  <Checkbox
                    id={condition}
                    checked={formData.health_conditions.includes(condition)}
                    onCheckedChange={() =>
                      toggleSelection("health_conditions", condition)
                    }
                  />
                  <label
                    htmlFor={condition}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize cursor-pointer"
                  >
                    {condition.replace(/_/g, " ")}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-base">{t('protocol.dietaryRestrictions')}</Label>
            <div className="grid grid-cols-2 gap-3">
              {DIETARY_RESTRICTIONS.map((restriction) => (
                <div key={restriction} className="flex items-center space-x-2">
                  <Checkbox
                    id={restriction}
                    checked={formData.dietary_restrictions.includes(restriction)}
                    onCheckedChange={() =>
                      toggleSelection("dietary_restrictions", restriction)
                    }
                  />
                  <label
                    htmlFor={restriction}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize cursor-pointer"
                  >
                    {restriction.replace("_", " ")}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-base">
              {t('protocol.duration', { days: formData.protocol_duration_days })}
            </Label>
            <Slider
              value={[formData.protocol_duration_days]}
              onValueChange={([value]) =>
                setFormData({ ...formData, protocol_duration_days: value })
              }
              min={7}
              max={90}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              {t('protocol.durationHint')}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            {t('common:actions.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || formData.goals.length === 0}
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('protocol.generating')}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {t('protocol.generate')}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
