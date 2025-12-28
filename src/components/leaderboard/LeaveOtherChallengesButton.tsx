import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('leaderboard');
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

      toast.success(t('leave.success', { title: challengeTitle }));
      setShowDialog(false);
    } catch (error: any) {
      console.error('[LeaveOtherChallenges] Error:', error);
      toast.error(t('leave.error', { message: error.message }));
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
        {t('leave.button')}
      </Button>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('leave.title')}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                {t('leave.description', { title: challengeTitle })}
              </p>
              <p className="text-destructive">
                {t('leave.warning')}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>{t('common:cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveOthers}
              disabled={isLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isLoading ? t('leave.leaving') : t('leave.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
