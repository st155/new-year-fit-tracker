import { useState, useEffect } from "react";
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
  id?: string;
  discipline_name: string;
  discipline_type: string;
  benchmark_value: number | null;
  unit: string;
  position: number;
}

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
}

interface EditChallengeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challenge: Challenge | null;
  onSuccess: () => void;
}

export function EditChallengeDialog({ open, onOpenChange, challenge, onSuccess }: EditChallengeDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);

  useEffect(() => {
    if (challenge && open) {
      setTitle(challenge.title);
      setDescription(challenge.description || "");
      setStartDate(challenge.start_date);
      setEndDate(challenge.end_date);
      loadDisciplines();
    }
  }, [challenge, open]);

  const loadDisciplines = async () => {
    if (!challenge) return;

    const { data, error } = await supabase
      .from("challenge_disciplines")
      .select("*")
      .eq("challenge_id", challenge.id)
      .order("position");

    if (error) {
      console.error("Error loading disciplines:", error);
      return;
    }

    setDisciplines(data || []);
  };

  const handleAddDiscipline = () => {
    setDisciplines([
      ...disciplines,
      { discipline_name: "", discipline_type: "reps", benchmark_value: null, unit: "reps", position: disciplines.length }
    ]);
  };

  const handleRemoveDiscipline = async (index: number) => {
    const discipline = disciplines[index];
    
    if (discipline.id) {
      const { error } = await supabase
        .from("challenge_disciplines")
        .delete()
        .eq("id", discipline.id);

      if (error) {
        toast({
          title: "Ошибка",
          description: "Не удалось удалить дисциплину",
          variant: "destructive",
        });
        return;
      }
    }

    setDisciplines(disciplines.filter((_, i) => i !== index));
  };

  const handleDisciplineChange = (index: number, field: keyof Discipline, value: any) => {
    const updated = [...disciplines];
    updated[index] = { ...updated[index], [field]: value };
    setDisciplines(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!challenge || !title.trim() || !startDate || !endDate) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive",
      });
      return;
    }

    const validDisciplines = disciplines.filter(d => d.discipline_name.trim());

    setLoading(true);

    try {
      // Update challenge
      const { error: challengeError } = await supabase
        .from("challenges")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          start_date: startDate,
          end_date: endDate,
        })
        .eq("id", challenge.id);

      if (challengeError) throw challengeError;

      // Update or insert disciplines
      for (let i = 0; i < validDisciplines.length; i++) {
        const discipline = validDisciplines[i];
        const disciplineData = {
          challenge_id: challenge.id,
          discipline_name: discipline.discipline_name,
          discipline_type: discipline.discipline_type,
          benchmark_value: discipline.benchmark_value,
          unit: discipline.unit,
          position: i,
        };

        if (discipline.id) {
          const { error } = await supabase
            .from("challenge_disciplines")
            .update(disciplineData)
            .eq("id", discipline.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("challenge_disciplines")
            .insert(disciplineData);

          if (error) throw error;
        }
      }

      toast({
        title: "Успех",
        description: "Челлендж успешно обновлен",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating challenge:", error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить челлендж",
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
          <DialogTitle>Редактировать челлендж</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Название челленджа *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              <Label>Дисциплины</Label>
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
              <div key={discipline.id || index} className="border rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Дисциплина {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveDiscipline(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
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
              Сохранить изменения
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
