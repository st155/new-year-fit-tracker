import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ChallengeTemplate, incrementTemplateUseCount } from "@/lib/challenge-templates";
import { calculateStandardBenchmark, BENCHMARK_STANDARDS } from "@/lib/benchmark-standards";

interface CreateFromTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ChallengeTemplate;
  trainerId: string;
  onSuccess?: () => void;
}

const AUDIENCE_LABELS = ['Beginner', 'Intermediate', 'Advanced', 'Elite'];
const DIFFICULTY_LABELS = ['Regular', 'Challenging', 'Hard', 'Extreme'];

export function CreateFromTemplateDialog({
  open,
  onOpenChange,
  template,
  trainerId,
  onSuccess,
}: CreateFromTemplateDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationWeeks, setDurationWeeks] = useState(template.duration_weeks || 8);
  const [targetAudience, setTargetAudience] = useState(template.target_audience || 1);
  const [difficulty, setDifficulty] = useState(template.difficulty_level || 1);
  const [isCreating, setIsCreating] = useState(false);
  const [recalculatedDisciplines, setRecalculatedDisciplines] = useState<any[]>([]);

  useEffect(() => {
    // Initialize from template
    setTitle(template.template_data.titleTemplate);
    setDescription(template.template_data.descriptionTemplate || '');
    setDurationWeeks(template.duration_weeks || 8);
    setTargetAudience(template.target_audience || 1);
    setDifficulty(template.difficulty_level || 1);
    recalculateDisciplines();
  }, [template]);

  useEffect(() => {
    // Recalculate when difficulty or audience changes
    recalculateDisciplines();
  }, [targetAudience, difficulty]);

  const recalculateDisciplines = () => {
    const updated = template.template_data.disciplines.map(disc => {
      let newBenchmark = disc.benchmark_value;

      // If has benchmarkKey, recalculate scientifically
      if (disc.benchmarkKey && BENCHMARK_STANDARDS[disc.benchmarkKey]) {
        newBenchmark = calculateStandardBenchmark(
          BENCHMARK_STANDARDS[disc.benchmarkKey],
          targetAudience,
          difficulty,
          disc.direction || 'higher'
        );
      }

      return {
        ...disc,
        benchmark_value: newBenchmark,
      };
    });

    setRecalculatedDisciplines(updated);
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('Введите название челленджа');
      return;
    }

    setIsCreating(true);
    try {
      // Calculate dates
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + durationWeeks * 7);

      // Create challenge
      const { data: challenge, error: challengeError } = await supabase
        .from('challenges')
        .insert({
          title,
          description,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          created_by: trainerId,
          is_active: true,
        })
        .select()
        .single();

      if (challengeError) throw challengeError;

      // Create challenge trainers entry
      await supabase.from('challenge_trainers').insert({
        challenge_id: challenge.id,
        trainer_id: trainerId,
        role: 'owner',
      });

      // Create disciplines
      const disciplinesToInsert = recalculatedDisciplines.map((disc, idx) => ({
        challenge_id: challenge.id,
        discipline_name: disc.discipline_name,
        discipline_type: disc.discipline_type,
        benchmark_value: disc.benchmark_value,
        unit: disc.unit,
        position: disc.position !== undefined ? disc.position : idx,
      }));

      const { error: disciplinesError } = await supabase
        .from('challenge_disciplines')
        .insert(disciplinesToInsert);

      if (disciplinesError) throw disciplinesError;

      // Increment template use count
      if (template.id) {
        await incrementTemplateUseCount(template.id);
      }

      toast.success('Челлендж создан из шаблона');
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating challenge from template:', error);
      toast.error('Ошибка создания челленджа');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Создать из шаблона: {template.template_name}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-6 pr-4">
            {/* Template Info */}
            {template.category && (
              <Badge variant="outline">{template.category}</Badge>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Название челленджа *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Введите название..."
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Duration */}
            <div className="space-y-3">
              <Label>Длительность: {durationWeeks} недель</Label>
              <Slider
                value={[durationWeeks]}
                onValueChange={(value) => setDurationWeeks(value[0])}
                min={1}
                max={24}
                step={1}
              />
            </div>

            {/* Target Audience */}
            <div className="space-y-3">
              <Label>Целевая аудитория: {AUDIENCE_LABELS[targetAudience]}</Label>
              <Slider
                value={[targetAudience]}
                onValueChange={(value) => setTargetAudience(value[0])}
                min={0}
                max={3}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                Уровень подготовки участников влияет на базовые значения
              </p>
            </div>

            {/* Difficulty */}
            <div className="space-y-3">
              <Label>Сложность: {DIFFICULTY_LABELS[difficulty]}</Label>
              <Slider
                value={[difficulty]}
                onValueChange={(value) => setDifficulty(value[0])}
                min={0}
                max={3}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                Сложность влияет на целевые значения дисциплин
              </p>
            </div>

            {/* Disciplines Preview */}
            <div className="space-y-3">
              <Label>Дисциплины ({recalculatedDisciplines.length})</Label>
              <div className="rounded-lg border p-4 bg-muted/30 space-y-2">
                {recalculatedDisciplines.map((disc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded bg-card"
                  >
                    <div>
                      <p className="font-medium text-sm">{disc.discipline_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {disc.discipline_type}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {disc.benchmark_value} {disc.unit}
                    </Badge>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                💡 Значения автоматически рассчитаны на основе выбранных параметров
              </p>
            </div>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            <Sparkles className="w-4 h-4 mr-2" />
            {isCreating ? 'Создание...' : 'Создать челлендж'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
