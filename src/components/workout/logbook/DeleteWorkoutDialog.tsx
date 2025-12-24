import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { WorkoutHistoryItem } from "@/hooks/useWorkoutHistory";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Loader2 } from "lucide-react";

interface DeleteWorkoutDialogProps {
  workout: WorkoutHistoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export default function DeleteWorkoutDialog({
  workout,
  open,
  onOpenChange,
  onConfirm,
  isDeleting
}: DeleteWorkoutDialogProps) {
  if (!workout) return null;

  const isManual = workout.source === 'manual';
  const dateStr = format(new Date(workout.date), "d MMMM yyyy", { locale: ru });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="glass-card border-white/10">
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить тренировку?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              <strong>{workout.name}</strong> — {dateStr}
            </p>
            {isManual ? (
              <p className="text-amber-400/80">
                Будут удалены все записи этой тренировки за выбранную дату.
              </p>
            ) : (
              <p className="text-muted-foreground">
                Будет удалена запись тренировки из {workout.sourceLabel}.
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Отмена</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Удаление...
              </>
            ) : (
              "Удалить"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
