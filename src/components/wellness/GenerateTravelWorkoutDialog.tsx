import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { 
  Plane, 
  Dumbbell, 
  Clock, 
  Loader2, 
  CheckCircle2,
  Target,
  Save,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { 
  useTrainingGaps, 
  useGenerateTravelWorkout, 
  useSaveGeneratedWorkout,
  GeneratedWorkout,
  GapAnalysisResult
} from '@/hooks/useTrainingGaps';
import { cn } from '@/lib/utils';

interface GenerateTravelWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EQUIPMENT_OPTIONS = [
  { value: 'bodyweight', labelKey: 'travelWorkout.equipment.bodyweight', emoji: '🤸' },
  { value: 'dumbbells', labelKey: 'travelWorkout.equipment.dumbbells', emoji: '🏋️' },
  { value: 'resistance_bands', labelKey: 'travelWorkout.equipment.resistanceBands', emoji: '🔗' },
  { value: 'hotel_gym', labelKey: 'travelWorkout.equipment.hotelGym', emoji: '🏨' },
  { value: 'full_gym', labelKey: 'travelWorkout.equipment.fullGym', emoji: '💪' },
];

const WORKOUT_TYPES = [
  { value: 'full_body', labelKey: 'travelWorkout.types.fullBody', emoji: '🏋️', muscles: ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'] },
  { value: 'upper', labelKey: 'travelWorkout.types.upper', emoji: '💪', muscles: ['chest', 'back', 'shoulders', 'arms'] },
  { value: 'lower', labelKey: 'travelWorkout.types.lower', emoji: '🦵', muscles: ['legs', 'core'] },
  { value: 'push', labelKey: 'travelWorkout.types.push', emoji: '🔥', muscles: ['chest', 'shoulders', 'arms'] },
  { value: 'pull', labelKey: 'travelWorkout.types.pull', emoji: '🎯', muscles: ['back', 'arms'] },
  { value: 'cardio', labelKey: 'travelWorkout.types.cardio', emoji: '❤️', muscles: [] },
  { value: 'custom', labelKey: 'travelWorkout.types.custom', emoji: '⚙️', muscles: [] },
];

const MUSCLE_GROUPS = [
  { key: 'chest', labelKey: 'travelWorkout.muscles.chest', icon: '💪' },
  { key: 'back', labelKey: 'travelWorkout.muscles.back', icon: '🔙' },
  { key: 'legs', labelKey: 'travelWorkout.muscles.legs', icon: '🦵' },
  { key: 'shoulders', labelKey: 'travelWorkout.muscles.shoulders', icon: '🎯' },
  { key: 'arms', labelKey: 'travelWorkout.muscles.arms', icon: '💪' },
  { key: 'core', labelKey: 'travelWorkout.muscles.core', icon: '🔥' },
];

function GapsSummary({ gapAnalysis, t }: { gapAnalysis: GapAnalysisResult | undefined; t: (key: string, options?: any) => string }) {
  if (!gapAnalysis) return null;

  const neglected = Object.entries(gapAnalysis.muscleAnalysis)
    .filter(([_, a]) => a.status === 'neglected')
    .map(([group, a]) => ({ group, ...a }));

  if (neglected.length === 0) {
    return (
      <div className="flex items-center gap-2 text-green-400 text-sm">
        <CheckCircle2 className="h-4 w-4" />
        {t('travelWorkout.gaps.allBalanced')}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-yellow-400 text-sm">
        <AlertTriangle className="h-4 w-4" />
        {t('travelWorkout.gaps.neglected')}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {neglected.map(({ group, icon, name, daysSince }) => (
          <Badge 
            key={group} 
            variant="outline" 
            className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
          >
            {icon} {name} ({t('travelWorkout.gaps.daysAgo', { days: daysSince })})
          </Badge>
        ))}
      </div>
    </div>
  );
}

function WorkoutPreview({ 
  workout, 
  onSave, 
  isSaving,
  t
}: { 
  workout: GeneratedWorkout; 
  onSave: () => void;
  isSaving: boolean;
  t: (key: string, options?: any) => string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="text-center">
        <h3 className="text-lg font-semibold">{workout.workout_name}</h3>
        <div className="flex items-center justify-center gap-3 mt-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {t('travelWorkout.preview.minutes', { min: workout.duration_minutes })}
          </span>
          <span className="flex items-center gap-1">
            <Target className="h-3.5 w-3.5" />
            {workout.target_muscles?.join(', ')}
          </span>
        </div>
      </div>

      <ScrollArea className="h-[300px] pr-4">
        <div className="space-y-4">
          {/* Разминка */}
          {workout.warmup && workout.warmup.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">
                {t('travelWorkout.preview.warmup')}
              </h4>
              <div className="space-y-1">
                {workout.warmup.map((ex, idx) => (
                  <div key={idx} className="text-sm flex justify-between">
                    <span>{ex.name}</span>
                    <span className="text-muted-foreground">{ex.duration}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Упражнения */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">
              {t('travelWorkout.preview.exercises')}
            </h4>
            <div className="space-y-2">
              {workout.exercises?.map((ex, idx) => (
                <Card key={idx} className="p-3 bg-muted/30">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-sm">{ex.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {ex.sets} × {ex.reps}
                        {ex.weight && ` • ${ex.weight}`}
                        {ex.rest && ` • ${t('travelWorkout.preview.rest', { rest: ex.rest })}`}
                      </div>
                      {ex.notes && (
                        <div className="text-xs text-primary/80 mt-1">{ex.notes}</div>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      #{idx + 1}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Заминка */}
          {workout.cooldown && workout.cooldown.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">
                {t('travelWorkout.preview.cooldown')}
              </h4>
              <div className="space-y-1">
                {workout.cooldown.map((ex, idx) => (
                  <div key={idx} className="text-sm flex justify-between">
                    <span>{ex.name}</span>
                    <span className="text-muted-foreground">{ex.duration}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Обоснование */}
          {workout.rationale && (
            <div className="pt-3 border-t border-border/50">
              <div className="text-xs text-muted-foreground italic">
                💡 {workout.rationale}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <Button 
        onClick={onSave} 
        className="w-full" 
        disabled={isSaving}
      >
        {isSaving ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Save className="h-4 w-4 mr-2" />
        )}
        {t('travelWorkout.preview.saveToJournal')}
      </Button>
    </motion.div>
  );
}

export function GenerateTravelWorkoutDialog({ 
  open, 
  onOpenChange 
}: GenerateTravelWorkoutDialogProps) {
  const { t } = useTranslation('workouts');
  const [step, setStep] = useState<'config' | 'generating' | 'preview'>('config');
  const [duration, setDuration] = useState(45);
  const [equipment, setEquipment] = useState('bodyweight');
  const [workoutType, setWorkoutType] = useState('full_body');
  const [focusMuscles, setFocusMuscles] = useState<string[]>(['chest', 'back', 'legs', 'shoulders', 'arms', 'core']);
  const [generatedWorkout, setGeneratedWorkout] = useState<GeneratedWorkout | null>(null);

  const { data: gapAnalysis, isLoading: isLoadingGaps } = useTrainingGaps();

  // Update focusMuscles when workoutType changes
  useEffect(() => {
    const selectedType = WORKOUT_TYPES.find(t => t.value === workoutType);
    if (selectedType && workoutType !== 'custom') {
      setFocusMuscles(selectedType.muscles);
    }
  }, [workoutType]);
  const generateMutation = useGenerateTravelWorkout();
  const saveMutation = useSaveGeneratedWorkout();

  const handleGenerate = async () => {
    setStep('generating');
    
    try {
      const workout = await generateMutation.mutateAsync({
        durationMinutes: duration,
        equipment,
        workoutType,
        focusMuscles: focusMuscles.length > 0 ? focusMuscles : undefined,
        gapAnalysis
      });
      
      setGeneratedWorkout(workout);
      setStep('preview');
    } catch (error) {
      setStep('config');
    }
  };

  const handleSave = async () => {
    if (!generatedWorkout) return;
    
    await saveMutation.mutateAsync(generatedWorkout);
    onOpenChange(false);
    resetState();
  };

  const resetState = () => {
    setStep('config');
    setGeneratedWorkout(null);
    setWorkoutType('full_body');
    setFocusMuscles(['chest', 'back', 'legs', 'shoulders', 'arms', 'core']);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  };

  const toggleMuscle = (muscle: string) => {
    setFocusMuscles(prev => 
      prev.includes(muscle) 
        ? prev.filter(m => m !== muscle)
        : [...prev, muscle]
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5 text-primary" />
            {t('travelWorkout.title')}
          </DialogTitle>
          <DialogDescription>
            {t('travelWorkout.description')}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'config' && (
            <motion.div
              key="config"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              {/* Анализ пробелов */}
              <div className="p-3 rounded-lg bg-muted/30">
                {isLoadingGaps ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('travelWorkout.analyzing')}
                  </div>
                ) : (
                  <GapsSummary gapAnalysis={gapAnalysis} t={t} />
                )}
              </div>

              {/* Длительность */}
              <div className="space-y-3">
                <Label className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {t('travelWorkout.duration')}
                  </span>
                  <span className="text-primary font-medium">{t('travelWorkout.minutes', { min: duration })}</span>
                </Label>
                <Slider
                  value={[duration]}
                  onValueChange={([v]) => setDuration(v)}
                  min={20}
                  max={90}
                  step={5}
                  className="w-full"
                />
              </div>

              {/* Оборудование */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Dumbbell className="h-4 w-4" />
                  {t('travelWorkout.equipmentLabel')}
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {EQUIPMENT_OPTIONS.map(opt => (
                    <Card
                      key={opt.value}
                      onClick={() => setEquipment(opt.value)}
                      className={cn(
                        "flex flex-col items-center p-3 cursor-pointer transition-all hover:bg-muted/50",
                        equipment === opt.value && "border-primary bg-primary/10"
                      )}
                    >
                      <span className="text-xl">{opt.emoji}</span>
                      <span className="text-xs font-medium mt-1 text-center">{t(opt.labelKey)}</span>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Тип тренировки */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  {t('travelWorkout.type')}
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {WORKOUT_TYPES.map(type => (
                    <Card
                      key={type.value}
                      onClick={() => setWorkoutType(type.value)}
                      className={cn(
                        "flex flex-col items-center p-2 cursor-pointer transition-all hover:bg-muted/50",
                        workoutType === type.value && "border-primary bg-primary/10"
                      )}
                    >
                      <span className="text-lg">{type.emoji}</span>
                      <span className="text-xs font-medium mt-0.5 text-center">{t(type.labelKey)}</span>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Фокус на группах мышц (только для custom) */}
              {workoutType === 'custom' && (
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    {t('travelWorkout.selectMuscles')}
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {MUSCLE_GROUPS.map(group => (
                      <Badge
                        key={group.key}
                        variant={focusMuscles.includes(group.key) ? 'default' : 'outline'}
                        className="cursor-pointer transition-all"
                        onClick={() => toggleMuscle(group.key)}
                      >
                        {group.icon} {t(group.labelKey)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Button 
                onClick={handleGenerate} 
                className="w-full"
                disabled={generateMutation.isPending}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {t('travelWorkout.generate')}
              </Button>
            </motion.div>
          )}

          {step === 'generating' && (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 text-center"
            >
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="mt-4 text-sm text-muted-foreground">
                {t('travelWorkout.generating')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('travelWorkout.generatingHint')}
              </p>
            </motion.div>
          )}

          {step === 'preview' && generatedWorkout && (
            <WorkoutPreview 
              workout={generatedWorkout} 
              onSave={handleSave}
              isSaving={saveMutation.isPending}
              t={t}
            />
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
