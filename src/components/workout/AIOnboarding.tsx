import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { aiTrainingApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Target, Calendar, Dumbbell, AlertCircle } from "lucide-react";

interface AIOnboardingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function AIOnboarding({ open, onOpenChange, onSuccess }: AIOnboardingProps) {
  const { t } = useTranslation('workouts');
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [formData, setFormData] = useState({
    primary_goal: 'hypertrophy',
    experience_level: 'intermediate',
    days_per_week: 4,
    equipment: ['full_gym'] as string[],
    preferred_workout_duration: 60,
    injuries_limitations: ''
  });

  const handleSubmit = async () => {
    setIsGenerating(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Save preferences
      const { error: prefError } = await supabase
        .from('ai_training_preferences')
        .upsert({
          user_id: user.id,
          ...formData,
          equipment: JSON.stringify(formData.equipment)
        });

      if (prefError) throw prefError;

      // Generate plan
      const { data, error } = await aiTrainingApi.generatePlan(user.id);

      if (error) throw error;

      toast({
        title: t('aiOnboarding.planCreatedToast'),
        description: t('aiOnboarding.planCreatedDesc'),
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error generating plan:', error);
      toast({
        title: t('aiOnboarding.error'),
        description: error.message || t('common:tryAgainLater'),
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {t('aiOnboarding.setupTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('aiOnboarding.stepDescription', { step, total: 4 })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Target className="w-5 h-5 text-primary" />
                <h3>{t('aiOnboarding.primaryGoal')}</h3>
              </div>
              <RadioGroup value={formData.primary_goal} onValueChange={(v) => setFormData({ ...formData, primary_goal: v })}>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="strength" id="strength" />
                  <Label htmlFor="strength" className="flex-1 cursor-pointer">
                    <div className="font-medium">{t('aiOnboarding.goals.strength')}</div>
                    <div className="text-sm text-muted-foreground">{t('aiOnboarding.strengthDesc')}</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="hypertrophy" id="hypertrophy" />
                  <Label htmlFor="hypertrophy" className="flex-1 cursor-pointer">
                    <div className="font-medium">{t('aiOnboarding.goals.hypertrophy')}</div>
                    <div className="text-sm text-muted-foreground">{t('aiOnboarding.hypertrophyDesc')}</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="fat_loss" id="fat_loss" />
                  <Label htmlFor="fat_loss" className="flex-1 cursor-pointer">
                    <div className="font-medium">{t('aiOnboarding.goals.fatLoss')}</div>
                    <div className="text-sm text-muted-foreground">{t('aiOnboarding.fatLossDesc')}</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="endurance" id="endurance" />
                  <Label htmlFor="endurance" className="flex-1 cursor-pointer">
                    <div className="font-medium">{t('aiOnboarding.goals.endurance')}</div>
                    <div className="text-sm text-muted-foreground">{t('aiOnboarding.enduranceDesc')}</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Dumbbell className="w-5 h-5 text-primary" />
                <h3>{t('aiOnboarding.experienceTitle')}</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-base mb-3 block">{t('aiOnboarding.experienceLabel')}</Label>
                  <RadioGroup value={formData.experience_level} onValueChange={(v) => setFormData({ ...formData, experience_level: v })}>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                      <RadioGroupItem value="beginner" id="beginner" />
                      <Label htmlFor="beginner" className="flex-1 cursor-pointer">
                        <div className="font-medium">{t('aiOnboarding.experienceLevels.beginner')}</div>
                        <div className="text-sm text-muted-foreground">{t('aiOnboarding.beginnerDesc')}</div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                      <RadioGroupItem value="intermediate" id="intermediate" />
                      <Label htmlFor="intermediate" className="flex-1 cursor-pointer">
                        <div className="font-medium">{t('aiOnboarding.experienceLevels.intermediate')}</div>
                        <div className="text-sm text-muted-foreground">{t('aiOnboarding.intermediateDesc')}</div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                      <RadioGroupItem value="advanced" id="advanced" />
                      <Label htmlFor="advanced" className="flex-1 cursor-pointer">
                        <div className="font-medium">{t('aiOnboarding.experienceLevels.advanced')}</div>
                        <div className="text-sm text-muted-foreground">{t('aiOnboarding.advancedDesc')}</div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label className="text-base mb-3 block">{t('aiOnboarding.trainingDaysLabel')}</Label>
                  <RadioGroup value={String(formData.days_per_week)} onValueChange={(v) => setFormData({ ...formData, days_per_week: parseInt(v) })}>
                    <div className="grid grid-cols-3 gap-2">
                      {[3, 4, 5, 6].map(days => (
                        <div key={days} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                          <RadioGroupItem value={String(days)} id={`days-${days}`} />
                          <Label htmlFor={`days-${days}`} className="cursor-pointer font-medium">
                            {t('aiOnboarding.daysFormat', { count: days })}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Calendar className="w-5 h-5 text-primary" />
                <h3>{t('aiOnboarding.equipmentTitle')}</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-base mb-3 block">{t('aiOnboarding.equipmentLabel')}</Label>
                  <div className="space-y-2">
                    {[
                      { value: 'full_gym', label: t('aiOnboarding.equipmentOptions.fullGym'), desc: t('aiOnboarding.fullGymDesc') },
                      { value: 'dumbbells_only', label: t('aiOnboarding.equipmentOptions.dumbbells'), desc: t('aiOnboarding.dumbbellsOnlyDesc') },
                      { value: 'bodyweight', label: t('aiOnboarding.equipmentOptions.bodyweight'), desc: t('aiOnboarding.bodyweightDesc') }
                    ].map(option => (
                      <div key={option.value} className="flex items-center space-x-2 p-3 border rounded-lg">
                        <Checkbox
                          id={option.value}
                          checked={formData.equipment.includes(option.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({ ...formData, equipment: [option.value] });
                            }
                          }}
                        />
                        <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                          <div className="font-medium">{option.label}</div>
                          <div className="text-sm text-muted-foreground">{option.desc}</div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-base mb-3 block">{t('aiOnboarding.durationLabel')}</Label>
                  <RadioGroup value={String(formData.preferred_workout_duration)} onValueChange={(v) => setFormData({ ...formData, preferred_workout_duration: parseInt(v) })}>
                    <div className="grid grid-cols-3 gap-2">
                      {[45, 60, 75, 90].map(duration => (
                        <div key={duration} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                          <RadioGroupItem value={String(duration)} id={`duration-${duration}`} />
                          <Label htmlFor={`duration-${duration}`} className="cursor-pointer font-medium">
                            {duration} {t('units.min')}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <AlertCircle className="w-5 h-5 text-primary" />
                <h3>{t('aiOnboarding.limitationsTitle')}</h3>
              </div>
              <Textarea
                placeholder={t('aiOnboarding.placeholders.injuries')}
                value={formData.injuries_limitations}
                onChange={(e) => setFormData({ ...formData, injuries_limitations: e.target.value })}
                rows={4}
              />
              <p className="text-sm text-muted-foreground">
                {t('aiOnboarding.limitationsHint')}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => step > 1 ? setStep(step - 1) : onOpenChange(false)}
            disabled={isGenerating}
          >
            {step === 1 ? t('common:cancel') : t('aiOnboarding.buttons.back')}
          </Button>
          
          {step < 4 ? (
            <Button onClick={() => setStep(step + 1)}>
              {t('aiOnboarding.buttons.continue')}
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('aiOnboarding.generating')}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {t('aiOnboarding.generatePlan')}
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
