import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import ExerciseIcon from "@/components/workout/ExerciseIcon";
import { Target, TrendingUp, Info, Clock } from "lucide-react";

interface ExerciseDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: {
    exercise_name: string;
    sets: number;
    reps: string;
    rpe?: number;
    rest_seconds?: number;
    notes?: string;
  } | null;
}

export function ExerciseDetailSheet({
  open,
  onOpenChange,
  exercise,
}: ExerciseDetailSheetProps) {
  if (!exercise) return null;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Детали упражнения"
    >
      <ScrollArea className="h-[70vh] pr-4">
        <div className="space-y-6">
          {/* Exercise Header */}
          <div className="flex items-start gap-4">
            <ExerciseIcon name={exercise.exercise_name} className="w-12 h-12" />
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2">{exercise.exercise_name}</h3>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary">
                  {exercise.sets} подходов
                </Badge>
                <Badge variant="secondary">
                  {exercise.reps} повторений
                </Badge>
                {exercise.rpe && (
                  <Badge variant="outline">
                    RPE {exercise.rpe}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Rest Time */}
          {exercise.rest_seconds && (
            <div className="glass-card p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-primary" />
                <h4 className="font-semibold">Отдых между подходами</h4>
              </div>
              <p className="text-2xl font-bold">
                {Math.floor(exercise.rest_seconds / 60)}:{(exercise.rest_seconds % 60).toString().padStart(2, '0')}
              </p>
            </div>
          )}

          {/* Notes */}
          {exercise.notes && (
            <div className="glass-card p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-primary" />
                <h4 className="font-semibold">Заметки</h4>
              </div>
              <p className="text-sm text-muted-foreground">{exercise.notes}</p>
            </div>
          )}

          {/* Target Muscles (placeholder) */}
          <div className="glass-card p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-primary" />
              <h4 className="font-semibold">Целевые мышцы</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Информация о целевых мышцах будет доступна в следующей версии
            </p>
          </div>

          {/* Technique Tips (placeholder) */}
          <div className="glass-card p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-primary" />
              <h4 className="font-semibold">Техника выполнения</h4>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Сохраняйте правильную форму на протяжении всего упражнения</li>
              <li>• Контролируйте дыхание: выдох на усилии</li>
              <li>• Используйте полную амплитуду движения</li>
              <li>• При необходимости уменьшайте вес для сохранения техники</li>
            </ul>
          </div>

          {/* Progress History (placeholder) */}
          <div className="glass-card p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-success" />
              <h4 className="font-semibold">История прогресса</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              График прогресса будет доступен после первых записей
            </p>
          </div>
        </div>
      </ScrollArea>
    </ResponsiveDialog>
  );
}
