import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, FileText } from 'lucide-react';
import { CHALLENGE_PRESETS, type ChallengePreset } from '@/features/challenges/utils';
import { PresetCard } from './challenge-ai/PresetCard';
import { SettingsPanel } from './challenge-ai/SettingsPanel';
import { PreviewPanel } from './challenge-ai/PreviewPanel';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BENCHMARK_STANDARDS, calculateStandardBenchmark, AUDIENCE_LEVEL_LABELS } from '@/lib/benchmark-standards';
import { recalculateBenchmarkLevels, RecalculatedLevels } from '@/lib/benchmark-recalculate';
import { TemplateManager } from './templates/TemplateManager';

interface CreateChallengeDialogAIProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trainerId: string;
  onSuccess?: () => void;
}

export const CreateChallengeDialogAI = ({
  open,
  onOpenChange,
  trainerId,
  onSuccess,
}: CreateChallengeDialogAIProps) => {
  const { toast } = useToast();
  const [selectedPreset, setSelectedPreset] = useState<ChallengePreset | null>(null);
  const [duration, setDuration] = useState(8);
  const [difficulty, setDifficulty] = useState(1);
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([]);
  const [targetAudience, setTargetAudience] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);
  const [customBenchmarks, setCustomBenchmarks] = useState<Record<string, number>>({});

  const difficultyMultipliers = [0.7, 1.0, 1.4, 1.8];
  const audienceMultipliers = [0.8, 1.0, 1.3, 1.6];

  // Reset custom benchmarks when preset changes
  useEffect(() => {
    if (selectedPreset) {
      // Default to first 4 disciplines (or all if less than 4)
      const defaultCount = Math.min(4, selectedPreset.disciplines.length);
      setSelectedDisciplines(selectedPreset.disciplines.slice(0, defaultCount).map(d => d.name));
      setCustomBenchmarks({}); // Reset custom benchmarks for new preset
    }
  }, [selectedPreset]);

  const generateChallengeName = () => {
    if (!selectedPreset) return '';
    const audienceLabels = ['Beginner', 'Regular', 'Advanced', 'Elite'];
    return `${selectedPreset.name} - ${audienceLabels[targetAudience]}`;
  };

  const generateDescription = () => {
    if (!selectedPreset) return '';
    const difficultyLabels = ['beginner-friendly', 'moderate', 'challenging', 'extreme'];
    const audienceLabels = ['newcomers', 'regular athletes', 'competitive athletes', 'elite performers'];
    
    return `A ${difficultyLabels[difficulty]} ${duration}-week ${selectedPreset.category.toLowerCase()} challenge designed for ${audienceLabels[targetAudience]}. ${selectedPreset.description}`;
  };

  // Calculate default benchmark for a discipline
  const calculateDefaultBenchmark = (disc: any, difficultyLevel: number, audienceLevel: number) => {
    // Use scientifically-backed standards if available
    if (disc.benchmarkKey && BENCHMARK_STANDARDS[disc.benchmarkKey]) {
      return calculateStandardBenchmark(
        BENCHMARK_STANDARDS[disc.benchmarkKey],
        audienceLevel,
        difficultyLevel,
        disc.direction
      );
    }
    
    // Fallback to legacy calculation for custom metrics
    const baseMult = difficultyMultipliers[difficultyLevel];
    const audienceMult = audienceMultipliers[audienceLevel];
    
    let value: number;
    
    if (disc.direction === 'lower') {
      const inverseMult = 1 / (baseMult * audienceMult);
      value = disc.baseValue * inverseMult;
    } else if (disc.direction === 'target') {
      const targetVariation = 1 + (audienceMult - 1) * 0.15;
      value = disc.baseValue * targetVariation;
    } else {
      value = disc.baseValue * disc.scalingFactor * baseMult * audienceMult;
    }
    
    if (disc.min !== undefined) value = Math.max(disc.min, value);
    if (disc.max !== undefined) value = Math.min(disc.max, value);
    
    return Math.round(value * 10) / 10;
  };

  // Memoized calculated benchmarks for display
  const calculatedBenchmarks = useMemo(() => {
    if (!selectedPreset) return {};
    
    const result: Record<string, number> = {};
    selectedPreset.disciplines.forEach((disc) => {
      result[disc.name] = calculateDefaultBenchmark(disc, difficulty, targetAudience);
    });
    return result;
  }, [selectedPreset, difficulty, targetAudience]);

  // Handle custom benchmark change
  const handleBenchmarkChange = (disciplineName: string, value: number) => {
    setCustomBenchmarks(prev => ({
      ...prev,
      [disciplineName]: value,
    }));
  };

  // Get final benchmark value (custom or calculated)
  const getFinalBenchmark = (disciplineName: string) => {
    return customBenchmarks[disciplineName] ?? calculatedBenchmarks[disciplineName];
  };

  // Calculate all levels for a discipline
  const calculateAllLevels = (disc: any): RecalculatedLevels => {
    const hasCustom = customBenchmarks[disc.name] !== undefined;
    const currentValue = getFinalBenchmark(disc.name);
    const combinedLevel = Math.min(3, Math.round((targetAudience + difficulty) / 2));
    
    return recalculateBenchmarkLevels(
      currentValue,
      combinedLevel,
      disc.direction,
      { min: disc.min, max: disc.max }
    );
  };

  const generateDisciplines = () => {
    if (!selectedPreset) return [];
    
    return selectedPreset.disciplines
      .filter(disc => selectedDisciplines.includes(disc.name))
      .map((disc) => ({
        name: disc.name,
        type: disc.type,
        benchmarkValue: getFinalBenchmark(disc.name),
        unit: disc.unit,
        allLevels: calculateAllLevels(disc),
      }));
  };

  const handleCreate = async () => {
    if (!selectedPreset) return;

    setIsCreating(true);
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + duration * 7);

      // Create challenge
      const { data: challenge, error: challengeError } = await supabase
        .from('challenges')
        .insert({
          title: generateChallengeName(),
          description: generateDescription(),
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          is_active: true,
          created_by: trainerId,
        })
        .select()
        .single();

      if (challengeError) throw challengeError;

      // Add trainer as owner
      const { error: trainerError } = await supabase
        .from('challenge_trainers')
        .insert({
          challenge_id: challenge.id,
          trainer_id: trainerId,
          role: 'owner',
        });

      if (trainerError) throw trainerError;

      // Create disciplines
      const disciplines = generateDisciplines();
      const { error: disciplinesError } = await supabase
        .from('challenge_disciplines')
        .insert(
          disciplines.map((disc) => ({
            challenge_id: challenge.id,
            discipline_name: disc.name,
            discipline_type: disc.type,
            benchmark_value: disc.benchmarkValue,
            unit: disc.unit,
          }))
        );

      if (disciplinesError) throw disciplinesError;

      toast({
        title: 'Challenge created!',
        description: 'Your AI-generated challenge is ready.',
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating challenge:', error);
      toast({
        title: 'Error',
        description: 'Failed to create challenge. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Challenge Creator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Loader */}
          <div className="flex justify-center pb-4 border-b">
            <Button variant="outline" onClick={() => setTemplateManagerOpen(true)}>
              <FileText className="w-4 h-4 mr-2" />
              Load from Template
            </Button>
          </div>

          {/* Step 1: Select Preset */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">1. Choose a Preset</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {CHALLENGE_PRESETS.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  selected={selectedPreset?.id === preset.id}
                  onSelect={() => {
                    setSelectedPreset(preset);
                    setDuration(preset.defaultDuration);
                  }}
                />
              ))}
            </div>
          </div>

          {selectedPreset && (
            <>
              {/* Step 2: Adjust Settings */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    2. Adjust Settings
                  </h3>
                  <SettingsPanel
                    duration={duration}
                    onDurationChange={setDuration}
                    difficulty={difficulty}
                    onDifficultyChange={setDifficulty}
                    selectedDisciplines={selectedDisciplines}
                    onSelectedDisciplinesChange={setSelectedDisciplines}
                    availableDisciplines={selectedPreset.disciplines.map(d => ({
                      name: d.name,
                      type: d.type,
                      unit: d.unit,
                    }))}
                    targetAudience={targetAudience}
                    onTargetAudienceChange={setTargetAudience}
                    customBenchmarks={customBenchmarks}
                    onBenchmarkChange={handleBenchmarkChange}
                    calculatedBenchmarks={calculatedBenchmarks}
                  />
                </div>

                {/* Step 3: Preview */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">3. Preview</h3>
                  <PreviewPanel
                    name={generateChallengeName()}
                    description={generateDescription()}
                    category={selectedPreset.category}
                    duration={duration}
                    disciplines={generateDisciplines()}
                    audienceLevel={targetAudience}
                  />
                </div>
              </div>

              {/* Create Button */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={isCreating || selectedDisciplines.length === 0}>
                  {isCreating ? 'Creating...' : 'Create Challenge'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>

      <TemplateManager
        open={templateManagerOpen}
        onOpenChange={setTemplateManagerOpen}
        onSuccess={() => {
          onSuccess?.();
          onOpenChange(false);
        }}
      />
    </Dialog>
  );
};
