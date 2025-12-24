import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
  { value: 'bodyweight', label: 'Только тело', emoji: '🤸', desc: 'Без оборудования' },
  { value: 'dumbbells', label: 'Гантели', emoji: '🏋️', desc: 'Лёгкие гантели' },
  { value: 'resistance_bands', label: 'Резинки', emoji: '🔗', desc: 'Эластичные ленты' },
  { value: 'hotel_gym', label: 'Зал в отеле', emoji: '🏨', desc: 'Базовое оборудование' },
  { value: 'full_gym', label: 'Полный зал', emoji: '💪', desc: 'Всё доступно' },
];

const MUSCLE_GROUPS = [
  { key: 'chest', label: 'Грудь', icon: '💪' },
  { key: 'back', label: 'Спина', icon: '🔙' },
  { key: 'legs', label: 'Ноги', icon: '🦵' },
  { key: 'shoulders', label: 'Плечи', icon: '🎯' },
  { key: 'arms', label: 'Руки', icon: '💪' },
  { key: 'core', label: 'Кор', icon: '🔥' },
];

function GapsSummary({ gapAnalysis }: { gapAnalysis: GapAnalysisResult | undefined }) {
  if (!gapAnalysis) return null;

  const neglected = Object.entries(gapAnalysis.muscleAnalysis)
    .filter(([_, a]) => a.status === 'neglected')
    .map(([group, a]) => ({ group, ...a }));

  if (neglected.length === 0) {
    return (
      <div className="flex items-center gap-2 text-green-400 text-sm">
        <CheckCircle2 className="h-4 w-4" />
        Все группы мышц в балансе
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-yellow-400 text-sm">
        <AlertTriangle className="h-4 w-4" />
        Давно не тренировались:
      </div>
      <div className="flex flex-wrap gap-1.5">
        {neglected.map(({ group, icon, name, daysSince }) => (
          <Badge 
            key={group} 
            variant="outline" 
            className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
          >
            {icon} {name} ({daysSince}д)
          </Badge>
        ))}
      </div>
    </div>
  );
}

function WorkoutPreview({ 
  workout, 
  onSave, 
  isSaving 
}: { 
  workout: GeneratedWorkout; 
  onSave: () => void;
  isSaving: boolean;
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
            {workout.duration_minutes} мин
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
                Разминка
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
              Упражнения
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
                        {ex.rest && ` • отдых ${ex.rest}`}
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
                Заминка
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
        Сохранить в журнал
      </Button>
    </motion.div>
  );
}

export function GenerateTravelWorkoutDialog({ 
  open, 
  onOpenChange 
}: GenerateTravelWorkoutDialogProps) {
  const [step, setStep] = useState<'config' | 'generating' | 'preview'>('config');
  const [duration, setDuration] = useState(45);
  const [equipment, setEquipment] = useState('bodyweight');
  const [focusMuscles, setFocusMuscles] = useState<string[]>([]);
  const [generatedWorkout, setGeneratedWorkout] = useState<GeneratedWorkout | null>(null);

  const { data: gapAnalysis, isLoading: isLoadingGaps } = useTrainingGaps();
  const generateMutation = useGenerateTravelWorkout();
  const saveMutation = useSaveGeneratedWorkout();

  const handleGenerate = async () => {
    setStep('generating');
    
    try {
      const workout = await generateMutation.mutateAsync({
        durationMinutes: duration,
        equipment,
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
    setFocusMuscles([]);
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
            Тренировка в поездке
          </DialogTitle>
          <DialogDescription>
            AI создаст тренировку на основе твоей истории с тренером
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
                    Анализируем историю...
                  </div>
                ) : (
                  <GapsSummary gapAnalysis={gapAnalysis} />
                )}
              </div>

              {/* Длительность */}
              <div className="space-y-3">
                <Label className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Длительность
                  </span>
                  <span className="text-primary font-medium">{duration} мин</span>
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
                  Оборудование
                </Label>
                <RadioGroup value={equipment} onValueChange={setEquipment}>
                  <div className="grid grid-cols-2 gap-2">
                    {EQUIPMENT_OPTIONS.map(opt => (
                      <div key={opt.value}>
                        <RadioGroupItem
                          value={opt.value}
                          id={opt.value}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={opt.value}
                          className={cn(
                            "flex flex-col items-center p-3 rounded-lg border cursor-pointer transition-all",
                            "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10",
                            "hover:bg-muted/50"
                          )}
                        >
                          <span className="text-xl">{opt.emoji}</span>
                          <span className="text-xs font-medium mt-1">{opt.label}</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              {/* Фокус на группах мышц */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Фокус (опционально)
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {MUSCLE_GROUPS.map(group => (
                    <Badge
                      key={group.key}
                      variant={focusMuscles.includes(group.key) ? 'default' : 'outline'}
                      className="cursor-pointer transition-all"
                      onClick={() => toggleMuscle(group.key)}
                    >
                      {group.icon} {group.label}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button 
                onClick={handleGenerate} 
                className="w-full"
                disabled={generateMutation.isPending}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Сгенерировать
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
                AI анализирует твои тренировки с тренером...
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Это может занять 10-20 секунд
              </p>
            </motion.div>
          )}

          {step === 'preview' && generatedWorkout && (
            <WorkoutPreview 
              workout={generatedWorkout} 
              onSave={handleSave}
              isSaving={saveMutation.isPending}
            />
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
