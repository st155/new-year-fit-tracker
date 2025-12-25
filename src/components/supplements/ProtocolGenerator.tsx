import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supplementsApiExtended } from "@/lib/api/client";
import { Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProtocolPreview } from "./ProtocolPreview";

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
        title: "Please select at least one goal",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supplementsApiExtended.generateProtocol({
        user_id: user?.id,
        goals: formData.goals,
        health_conditions: formData.health_conditions,
        dietary_restrictions: formData.dietary_restrictions,
        protocol_duration_days: formData.protocol_duration_days,
      });

      if (error) throw error;
      if (!data) throw new Error('No data returned');

      setGeneratedProtocol(data.protocol);
      toast({ title: "Protocol generated successfully!" });
    } catch (error: any) {
      console.error("Error generating protocol:", error);
      toast({
        title: "Failed to generate protocol",
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
            Generate AI Protocol
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label className="text-base">Select Your Goals</Label>
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
            <Label className="text-base">Health Conditions (Optional)</Label>
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
            <Label className="text-base">Dietary Restrictions (Optional)</Label>
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
              Protocol Duration: {formData.protocol_duration_days} days
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
              Recommended: 30-60 days for best results
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || formData.goals.length === 0}
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Protocol
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
