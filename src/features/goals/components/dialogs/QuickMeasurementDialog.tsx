import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { PhotoUpload } from "@/components/ui/photo-upload";
import { Camera, Calendar, ChevronDown, Check } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn, parseTimeInput, isTimeUnit } from "@/lib/utils";
import { isStrengthWeightGoal, formatStrengthGoal } from "@/lib/units";
import { getIntlLocale } from '@/lib/date-locale';

interface Goal {
  id: string;
  goal_name: string;
  goal_type: string;
  target_value: number;
  target_unit: string;
  target_reps?: number | null;
}

interface QuickMeasurementDialogProps {
  goal: Goal;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onMeasurementAdded: () => void;
}

export function QuickMeasurementDialog({ 
  goal, 
  isOpen, 
  onOpenChange, 
  onMeasurementAdded 
}: QuickMeasurementDialogProps) {
  const { t } = useTranslation('goals');
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [form, setForm] = useState({
    value: '',
    reps: '',
    notes: '',
    measurement_date: new Date().toISOString().split('T')[0],
    photo_url: ''
  });
  
  const isStrength = isStrengthWeightGoal(goal.goal_type, goal.target_unit);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const parseTimeValue = (value: string): number => {
    if (!value) return 0;
    
    const isTimeGoal = isTimeUnit(goal.target_unit) || 
                      goal.goal_name.toLowerCase().includes('время') ||
                      goal.goal_name.toLowerCase().includes('бег');
    
    if (isTimeGoal) {
      return parseTimeInput(value);
    }
    
    return parseFloat(value) || 0;
  };

  const addMeasurement = async () => {
    if (!form.value.trim()) {
      toast({
        title: t('quickMeasurement.error'),
        description: t('quickMeasurement.enterValue'),
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: t('quickMeasurement.error'),
        description: t('quickMeasurement.notAuthorized'),
        variant: "destructive",
      });
      return;
    }

    if (!goal?.id) {
      toast({
        title: t('quickMeasurement.error'),
        description: t('quickMeasurement.goalNotFound'),
        variant: "destructive",
      });
      return;
    }

    const selectedDate = new Date(form.measurement_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    
    const maxFutureDate = new Date(today);
    maxFutureDate.setDate(today.getDate() + 1);
    
    if (selectedDate > maxFutureDate) {
      toast({
        title: t('quickMeasurement.invalidDate'),
        description: t('quickMeasurement.invalidDateDesc'),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const parsedValue = parseTimeValue(form.value);
      
      const { data: existingMeasurement, error: checkError } = await supabase
        .from('measurements')
        .select('id, value')
        .eq('user_id', user.id)
        .eq('goal_id', goal.id)
        .eq('measurement_date', form.measurement_date)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing measurement:', checkError);
        throw checkError;
      }

      let result;

      if (existingMeasurement) {
        const { data, error } = await supabase
          .from('measurements')
          .update({
            value: parsedValue,
            notes: form.notes.trim() || null,
            photo_url: form.photo_url || null
          })
          .eq('id', existingMeasurement.id)
          .select()
          .single();

        if (error) throw error;
        result = data;

        toast({
          title: t('quickMeasurement.updated'),
          description: t('quickMeasurement.updatedDesc', { name: goal.goal_name, oldValue: existingMeasurement.value, newValue: parsedValue }),
        });
      } else {
        const repsValue = isStrength && form.reps ? parseInt(form.reps) : null;
        
        const { data, error } = await supabase
          .from('measurements')
          .insert({
            user_id: user.id,
            goal_id: goal.id,
            value: parsedValue,
            unit: goal.target_unit,
            measurement_date: form.measurement_date,
            notes: form.notes.trim() || null,
            photo_url: form.photo_url || null,
            source: 'manual',
            reps: repsValue
          })
          .select()
          .single();

        if (error) {
          console.error('Supabase INSERT error:', error);
          throw error;
        }

        result = data;

        toast({
          title: t('quickMeasurement.success'),
          description: t('quickMeasurement.successDesc', { name: goal.goal_name, value: parsedValue, unit: goal.target_unit }),
        });
      }

      console.log('Measurement saved successfully:', result);

      setShowSuccess(true);
      
      setTimeout(() => {
        setForm({
          value: '',
          reps: '',
          notes: '',
          measurement_date: new Date().toISOString().split('T')[0],
          photo_url: ''
        });
        
        onOpenChange(false);
        setShowSuccess(false);
        
        try {
          onMeasurementAdded();
        } catch (callbackError) {
          console.error('Error in onMeasurementAdded callback:', callbackError);
        }
      }, 500);
    } catch (error: any) {
      console.error('Error saving measurement:', error);
      
      let errorMessage = t('quickMeasurement.saveErrorDefault');
      
      if (error?.code === '23503') {
        errorMessage = t('quickMeasurement.errorGoalLink');
      } else if (error?.code === '42501') {
        errorMessage = t('quickMeasurement.errorPermission');
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: t('quickMeasurement.saveError'),
        description: errorMessage,
        variant: "destructive",
      });

      try {
        await supabase.from('error_logs').insert({
          user_id: user?.id,
          error_type: 'measurement_save_failed',
          error_message: error?.message || 'Unknown error',
          source: 'quick_measurement_dialog',
          stack_trace: error?.stack,
          error_details: {
            goal_id: goal?.id,
            goal_name: goal?.goal_name,
            value: form.value,
            measurement_date: form.measurement_date,
            error_code: error?.code
          }
        });
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getValuePlaceholder = () => {
    if (isTimeUnit(goal.target_unit)) {
      return t('quickMeasurement.exampleTime');
    }
    
    return t('quickMeasurement.enterValueIn', { unit: goal.target_unit });
  };

  const isNumericGoal = () => {
    return goal.target_unit.toLowerCase().includes('reps') || 
           goal.target_unit.toLowerCase().includes('раз') ||
           goal.target_unit.toLowerCase().includes('повтор');
  };

  const isWeightGoal = () => {
    return goal.target_unit.toLowerCase().includes('kg') || 
           goal.target_unit.toLowerCase().includes('кг') ||
           goal.goal_name.toLowerCase().includes('вес');
  };

  const adjustValue = (increment: number) => {
    const currentValue = parseFloat(form.value) || 0;
    const newValue = Math.max(0, currentValue + increment);
    setForm(prev => ({ ...prev, value: newValue.toString() }));
  };

  const formatDate = () => {
    const today = new Date().toISOString().split('T')[0];
    if (form.measurement_date === today) {
      return t('quickMeasurement.today');
    }
    return new Date(form.measurement_date).toLocaleDateString(getIntlLocale(), { 
      day: 'numeric', 
      month: 'short' 
    });
  };

  return (
    <ResponsiveDialog 
      open={isOpen} 
      onOpenChange={onOpenChange}
      title={goal.goal_name}
      snapPoints={[55, 80]}
      className="max-w-[95vw] sm:max-w-md"
    >
        
        <div className="space-y-3 pt-1 pb-2 overflow-y-auto max-h-[65vh]">
          {/* Goal Info */}
          <div className="text-sm text-muted-foreground">
            🎯 {t('quickMeasurement.goalLabel')}: {isStrength 
              ? formatStrengthGoal(goal.target_value, goal.target_unit, goal.target_reps)
              : `${goal.target_value} ${goal.target_unit}`}
          </div>

          {/* Result Input */}
          <div className={isStrength ? "grid grid-cols-2 gap-3" : ""}>
            <div>
              <Label htmlFor="quick-value" className="text-sm">
                {isStrength ? t('quickMeasurement.weightKg') : t('quickMeasurement.result')}
              </Label>
              <Input
                id="quick-value"
                type="text"
                placeholder={isStrength ? t('quickMeasurement.exampleWeight') : getValuePlaceholder()}
                value={form.value}
                onChange={(e) => setForm(prev => ({ ...prev, value: e.target.value }))}
                className="text-2xl h-14 font-semibold"
                autoFocus
              />
            </div>
            
            {isStrength && (
              <div>
                <Label htmlFor="quick-reps" className="text-sm">
                  {t('quickMeasurement.reps')}
                </Label>
                <Input
                  id="quick-reps"
                  type="number"
                  min="1"
                  placeholder={goal.target_reps ? t('quickMeasurement.goalReps', { reps: goal.target_reps }) : "1"}
                  value={form.reps}
                  onChange={(e) => setForm(prev => ({ ...prev, reps: e.target.value }))}
                  className="text-2xl h-14 font-semibold"
                />
              </div>
            )}
          </div>
          
          {!isStrength && (
            <p className="text-xs text-muted-foreground mt-1">
              {goal.target_unit}
              {isTimeUnit(goal.target_unit) && 
                ` • ${t('quickMeasurement.timeFormat')}`}
            </p>
          )}

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {isNumericGoal() && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => adjustValue(1)}
                  className="h-8"
                >
                  +1
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => adjustValue(5)}
                  className="h-8"
                >
                  +5
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => adjustValue(10)}
                  className="h-8"
                >
                  +10
                </Button>
              </>
            )}
            
            {isWeightGoal() && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => adjustValue(-0.5)}
                  className="h-8"
                >
                  -0.5
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => adjustValue(0.5)}
                  className="h-8"
                >
                  +0.5
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => adjustValue(1)}
                  className="h-8"
                >
                  +1.0
                </Button>
              </>
            )}

            {/* Date Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="h-8 ml-auto"
            >
              <Calendar className="h-3 w-3 mr-1" />
              {formatDate()}
            </Button>
          </div>

          {/* Date Picker (conditional) */}
          {showDatePicker && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t('quickMeasurement.selectDate')}</span>
                <span className={cn(
                  "font-semibold",
                  new Date(form.measurement_date).getFullYear() !== new Date().getFullYear() && "text-destructive"
                )}>
                  {new Date(form.measurement_date).getFullYear() === new Date().getFullYear() 
                    ? `✓ ${t('quickMeasurement.currentYear')}` 
                    : `⚠️ ${t('quickMeasurement.checkYear')}`}
                </span>
              </div>
              <Input
                type="date"
                value={form.measurement_date}
                max={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                onChange={(e) => setForm(prev => ({ ...prev, measurement_date: e.target.value }))}
                className={cn(
                  "h-9",
                  new Date(form.measurement_date).getFullYear() !== new Date().getFullYear() && "border-destructive"
                )}
              />
            </div>
          )}

          {/* Optional Fields - Collapsible */}
          <Collapsible open={showOptional} onOpenChange={setShowOptional}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start text-sm h-9"
              >
                <ChevronDown className={`h-4 w-4 mr-2 transition-transform ${showOptional ? 'rotate-180' : ''}`} />
                {showOptional ? t('quickMeasurement.hide') : t('quickMeasurement.add')} {t('quickMeasurement.noteOrPhoto')}
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="space-y-3 pt-2">
              <div>
                <Label htmlFor="quick-notes" className="text-sm">{t('quickMeasurement.notes')}</Label>
                <Textarea
                  id="quick-notes"
                  placeholder={t('quickMeasurement.notesPlaceholder')}
                  value={form.notes}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="text-sm"
                />
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2 text-sm">
                  <Camera className="h-3 w-3" />
                  {t('quickMeasurement.progressPhoto')}
                </Label>
                <PhotoUpload
                  onPhotoUploaded={(url) => setForm(prev => ({ ...prev, photo_url: url }))}
                  existingPhotoUrl={form.photo_url}
                  label={t('quickMeasurement.addPhoto')}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div className="flex gap-2 pt-2 pb-2 border-t bg-background sticky bottom-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="text-sm"
          >
            {t('quickMeasurement.cancel')}
          </Button>
          <Button
            onClick={addMeasurement}
            className={cn(
              "flex-1 bg-gradient-primary hover:opacity-90 transition-all",
              showSuccess && "bg-green-500"
            )}
            disabled={isSubmitting || !form.value.trim()}
          >
            {showSuccess ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                {t('quickMeasurement.done')}
              </>
            ) : isSubmitting ? (
              t('quickMeasurement.adding')
            ) : (
              t('quickMeasurement.addButton')
            )}
          </Button>
        </div>
    </ResponsiveDialog>
  );
}
