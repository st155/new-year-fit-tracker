import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, X } from "lucide-react";
import { ChallengeDisciplineSelector } from "./ChallengeDisciplineSelector";

interface Discipline {
  discipline_name: string;
  discipline_type: string;
  benchmark_value: number | null;
  unit: string;
  position: number;
}

interface CreateChallengeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateChallengeDialog({ open, onOpenChange, onSuccess }: CreateChallengeDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [disciplines, setDisciplines] = useState<Discipline[]>([
    { discipline_name: "", discipline_type: "reps", benchmark_value: null, unit: "reps", position: 0 }
  ]);

  const handleAddDiscipline = () => {
    setDisciplines([
      ...disciplines,
      { discipline_name: "", discipline_type: "reps", benchmark_value: null, unit: "reps", position: disciplines.length }
    ]);
  };

  const handleRemoveDiscipline = (index: number) => {
    setDisciplines(disciplines.filter((_, i) => i !== index));
  };

  const handleDisciplineChange = (index: number, field: keyof Discipline, value: any) => {
    const updated = [...disciplines];
    updated[index] = { ...updated[index], [field]: value };
    setDisciplines(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !startDate || !endDate) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive",
      });
      return;
    }

    const validDisciplines = disciplines.filter(d => d.discipline_name.trim());
    if (validDisciplines.length === 0) {
      toast({
        title: "Ошибка",
        description: "Добавьте хотя бы одну дисциплину",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Create challenge
      const { data: challenge, error: challengeError } = await supabase
        .from("challenges")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          start_date: startDate,
          end_date: endDate,
          created_by: user.id,
          is_active: true,
        })
        .select()
        .single();

      if (challengeError) throw challengeError;

      // Add trainer as owner
      const { error: trainerError } = await supabase
        .from("challenge_trainers")
        .insert({
          challenge_id: challenge.id,
          trainer_id: user.id,
          role: "owner",
        });

      if (trainerError) throw trainerError;

      // Add disciplines
      const { error: disciplinesError } = await supabase
        .from("challenge_disciplines")
        .insert(
          validDisciplines.map((d, idx) => ({
            challenge_id: challenge.id,
            discipline_name: d.discipline_name,
            discipline_type: d.discipline_type,
            benchmark_value: d.benchmark_value,
            unit: d.unit,
            position: idx,
          }))
        );

      if (disciplinesError) throw disciplinesError;

      toast({
        title: "Успех",
        description: "Челлендж успешно создан",
      });

      // Reset form
      setTitle("");
      setDescription("");
      setStartDate("");
      setEndDate("");
      setDisciplines([{ discipline_name: "", discipline_type: "reps", benchmark_value: null, unit: "reps", position: 0 }]);
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating challenge:", error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать челлендж",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Создать новый челлендж</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Название челленджа *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: New Year Six-Pack Challenge"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опишите цели и правила челленджа"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Дата начала *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="endDate">Дата окончания *</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Дисциплины *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddDiscipline}
              >
                <Plus className="h-4 w-4 mr-1" />
                Добавить дисциплину
              </Button>
            </div>

            {disciplines.map((discipline, index) => (
              <div key={index} className="border rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Дисциплина {index + 1}</span>
                  {disciplines.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveDiscipline(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <ChallengeDisciplineSelector
                  discipline={discipline}
                  onChange={(field, value) => handleDisciplineChange(index, field, value)}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Создать челлендж
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
