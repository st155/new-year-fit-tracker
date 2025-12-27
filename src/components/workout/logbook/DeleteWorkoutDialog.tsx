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
import { ru, enUS } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  const { t, i18n } = useTranslation('workouts');
  
  if (!workout) return null;

  const isManual = workout.source === 'manual';
  const dateLocale = i18n.language === 'ru' ? ru : enUS;
  const dateStr = format(new Date(workout.date), "d MMMM yyyy", { locale: dateLocale });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="glass-card border-white/10">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              <strong>{workout.name}</strong> — {dateStr}
            </p>
            {isManual ? (
              <p className="text-amber-400/80">
                {t('deleteDialog.warningManual')}
              </p>
            ) : (
              <p className="text-muted-foreground">
                {t('deleteDialog.warningSource', { source: workout.sourceLabel })}
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>{t('deleteDialog.cancel')}</AlertDialogCancel>
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
                {t('deleteDialog.deleting')}
              </>
            ) : (
              t('deleteDialog.delete')
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
