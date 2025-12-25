import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { aiTrainingApi } from "@/lib/api";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface EditPlanPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditPlanPreferencesDialog({ 
  open, 
  onOpenChange, 
  onSuccess 
}: EditPlanPreferencesDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<any>(null);

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['ai-training-preferences'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('ai_training_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: open
  });

  useEffect(() => {
    if (preferences) {
      setFormData(preferences);
    }
  }, [preferences]);

  const regenerateMutation = useMutation({
    mutationFn: async (updatedPrefs: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Step 1: Update preferences
      const { error: prefError } = await supabase
        .from('ai_training_preferences')
        .upsert(updatedPrefs, { onConflict: 'user_id' });

      if (prefError) throw prefError;

      // Step 2: Regenerate plan
      const { data, error: functionError } = await aiTrainingApi.generatePlan(user.id);

      if (functionError) throw functionError;
      return data;
    },
    onSuccess: () => {
      toast.success('План обновлен! Переход к новому плану...');
      queryClient.invalidateQueries({ queryKey: ['my-training-plans'] });
      queryClient.invalidateQueries({ queryKey: ['active-training-plan'] });
      onOpenChange(false);
      onSuccess();
      
      // Navigate to generating screen
      setTimeout(() => {
        navigate('/workouts/generating-plan');
      }, 500);
    },
    onError: (error: any) => {
      console.error('[EditPlanPreferencesDialog] Error:', error);
      toast.error(error.message || 'Не удалось обновить план');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    regenerateMutation.mutate(formData);
  };

  if (isLoading || !formData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-500" />
            Изменить параметры плана
          </DialogTitle>
          <DialogDescription>
            Обновите параметры и AI создаст новый план на их основе
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Основная цель</Label>
              <Select 
                value={formData.primary_goal}
                onValueChange={(value) => setFormData({ ...formData, primary_goal: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strength">Сила</SelectItem>
                  <SelectItem value="hypertrophy">Масса</SelectItem>
                  <SelectItem value="conditioning">Выносливость</SelectItem>
                  <SelectItem value="general_fitness">Общая физподготовка</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Уровень опыта</Label>
              <Select 
                value={formData.experience_level}
                onValueChange={(value) => setFormData({ ...formData, experience_level: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Начинающий</SelectItem>
                  <SelectItem value="intermediate">Средний</SelectItem>
                  <SelectItem value="advanced">Продвинутый</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Тренировок в неделю</Label>
              <Select 
                value={formData.days_per_week?.toString()}
                onValueChange={(value) => setFormData({ ...formData, days_per_week: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 дня</SelectItem>
                  <SelectItem value="4">4 дня</SelectItem>
                  <SelectItem value="5">5 дней</SelectItem>
                  <SelectItem value="6">6 дней</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Травмы и ограничения (необязательно)</Label>
              <Textarea 
                value={formData.injuries_limitations || ''}
                onChange={(e) => setFormData({ ...formData, injuries_limitations: e.target.value })}
                placeholder="Опишите любые травмы или ограничения..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={regenerateMutation.isPending}
            >
              Отмена
            </Button>
            <Button 
              type="submit"
              disabled={regenerateMutation.isPending}
              className="gap-2"
            >
              {regenerateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Создание плана...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Создать новый план
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
