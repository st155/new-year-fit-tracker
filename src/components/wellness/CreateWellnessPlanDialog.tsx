import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useCreateWellnessPlan, useCreateActivities, generateActivitiesFromPlan } from "@/hooks/useWellnessActivities";
import { parseActivityDescription, getActivityConfig, ACTIVITY_TYPES, ActivityType } from "@/lib/wellness-activity-types";
import { toast } from "sonner";
import { Sparkles, Calendar, Check, Plus, Minus } from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";
import { getDateLocale } from "@/lib/date-locale";

interface CreateWellnessPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type Step = 'describe' | 'review' | 'period';

export function CreateWellnessPlanDialog({ open, onOpenChange, onSuccess }: CreateWellnessPlanDialogProps) {
  const { t } = useTranslation('activity');
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('describe');
  const [description, setDescription] = useState('');
  const [parsedActivities, setParsedActivities] = useState<Record<string, number>>({});
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [isCreating, setIsCreating] = useState(false);

  const createPlan = useCreateWellnessPlan();
  const createActivities = useCreateActivities();

  const handleParse = () => {
    const parsed = parseActivityDescription(description);
    if (Object.keys(parsed).length === 0) {
      toast.error(t('plan.parseError'), {
        description: t('plan.parseErrorHint')
      });
      return;
    }
    setParsedActivities(parsed);
    setStep('review');
  };

  const handleAdjustCount = (type: string, delta: number) => {
    setParsedActivities(prev => {
      const newCount = Math.max(0, (prev[type] || 0) + delta);
      if (newCount === 0) {
        const { [type]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [type]: newCount };
    });
  };

  const handleAddActivity = (type: ActivityType) => {
    setParsedActivities(prev => ({
      ...prev,
      [type]: (prev[type] || 0) + 1
    }));
  };

  const handleCreate = async () => {
    if (!user?.id) return;
    
    setIsCreating(true);
    try {
      // Create plan
      const startDate = startOfWeek(addDays(new Date(), 7), { weekStartsOn: 1 });
      
      const plan = await createPlan.mutateAsync({
        user_id: user.id,
        name: `Wellness ${format(startDate, 'dd MMM', { locale: getDateLocale() })}`,
        description: description,
        duration_weeks: durationWeeks,
        activities_config: parsedActivities,
        start_date: format(startDate, 'yyyy-MM-dd'),
      });

      // Generate and create activities
      const activities = generateActivitiesFromPlan(
        plan.id,
        user.id,
        parsedActivities,
        startDate,
        durationWeeks
      );

      if (activities.length > 0) {
        await createActivities.mutateAsync(activities);
      }

      toast.success(t('plan.created'), {
        description: t('plan.createdDesc', { count: activities.length, weeks: durationWeeks })
      });

      onSuccess?.();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast.error(t('plan.createError'), { description: error.message });
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setStep('describe');
    setDescription('');
    setParsedActivities({});
    setDurationWeeks(4);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  const totalWeeklyActivities = Object.values(parsedActivities).reduce((a, b) => a + b, 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-neutral-900 border-neutral-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            {t('plan.title')}
          </DialogTitle>
          <DialogDescription>
            {step === 'describe' && t('plan.stepDescribe')}
            {step === 'review' && t('plan.stepReview')}
            {step === 'period' && t('plan.stepPeriod')}
          </DialogDescription>
        </DialogHeader>

        {step === 'describe' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('plan.descriptionLabel')}</Label>
              <Textarea
                placeholder={t('plan.descriptionPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="bg-neutral-800 border-neutral-700"
              />
              <p className="text-xs text-muted-foreground">
                {t('plan.descriptionHint')}
              </p>
            </div>

            <Button 
              onClick={handleParse} 
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500"
              disabled={!description.trim()}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {t('plan.parse')}
            </Button>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            <div className="space-y-3">
              {Object.entries(parsedActivities).map(([type, count]) => {
                const config = getActivityConfig(type);
                return (
                  <div 
                    key={type} 
                    className={`flex items-center justify-between p-3 rounded-lg ${config.bgColor} ${config.borderColor} border`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{config.icon}</span>
                      <span className={config.color}>{config.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleAdjustCount(type, -1)}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-6 text-center font-medium">{count}x</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleAdjustCount(type, 1)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add more activities */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t('plan.addActivity')}</Label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(ACTIVITY_TYPES) as ActivityType[])
                  .filter(type => !parsedActivities[type] && type !== 'other' && type !== 'rest')
                  .slice(0, 6)
                  .map(type => {
                    const config = getActivityConfig(type);
                    return (
                      <Badge
                        key={type}
                        variant="outline"
                        className={`cursor-pointer hover:${config.bgColor} ${config.borderColor}`}
                        onClick={() => handleAddActivity(type)}
                      >
                        {config.icon} {config.label}
                      </Badge>
                    );
                  })}
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              {t('plan.totalWeekly')}: <span className="text-cyan-400 font-medium">{totalWeeklyActivities}</span>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('describe')} className="flex-1">
                {t('common:back')}
              </Button>
              <Button 
                onClick={() => setStep('period')} 
                className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500"
                disabled={Object.keys(parsedActivities).length === 0}
              >
                {t('common:next')}
              </Button>
            </div>
          </div>
        )}

        {step === 'period' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('plan.periodLabel')}</Label>
              <Select value={String(durationWeeks)} onValueChange={(v) => setDurationWeeks(Number(v))}>
                <SelectTrigger className="bg-neutral-800 border-neutral-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{t('plan.weeks', { count: 1 })}</SelectItem>
                  <SelectItem value="2">{t('plan.weeks', { count: 2 })}</SelectItem>
                  <SelectItem value="4">{t('plan.weeks', { count: 4 })}</SelectItem>
                  <SelectItem value="8">{t('plan.weeks', { count: 8 })}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-neutral-800 rounded-lg space-y-2">
              <p className="text-sm text-muted-foreground">{t('plan.willCreate')}</p>
              <p className="text-lg font-semibold text-cyan-400">
                {t('plan.activitiesCount', { count: totalWeeklyActivities * durationWeeks })}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('plan.startDate')}: {format(startOfWeek(addDays(new Date(), 7), { weekStartsOn: 1 }), 'dd MMMM yyyy', { locale: getDateLocale() })}
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('review')} className="flex-1">
                {t('common:back')}
              </Button>
              <Button 
                onClick={handleCreate} 
                className="flex-1 bg-gradient-to-r from-green-500 to-cyan-500"
                disabled={isCreating}
              >
                {isCreating ? t('plan.creating') : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    {t('common:create')}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
