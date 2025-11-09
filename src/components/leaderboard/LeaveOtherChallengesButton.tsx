import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

interface LeaveOtherChallengesButtonProps {
  userId: string;
  currentChallengeId: string;
  challengeTitle: string;
}

export function LeaveOtherChallengesButton({ userId, currentChallengeId, challengeTitle }: LeaveOtherChallengesButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleLeaveOthers = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('challenge_participants')
        .delete()
        .eq('user_id', userId)
        .neq('challenge_id', currentChallengeId);

      if (error) throw error;

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['challenges'] });
      await queryClient.invalidateQueries({ queryKey: ['leaderboard'] });

      toast.success(`Вы остались только в "${challengeTitle}"`);
      setShowDialog(false);
    } catch (error: any) {
      console.error('[LeaveOtherChallenges] Error:', error);
      toast.error('Ошибка при выходе из других челленджей: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDialog(true)}
        className="gap-2"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Выйти из других челленджей
      </Button>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Выйти из всех других челленджей?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Вы останетесь участником только челленджа <span className="font-semibold">"{challengeTitle}"</span>.
              </p>
              <p className="text-destructive">
                Это действие нельзя отменить. Все ваши очки и прогресс в других челленджах будут потеряны.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveOthers}
              disabled={isLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isLoading ? 'Выход...' : 'Да, выйти из других'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
