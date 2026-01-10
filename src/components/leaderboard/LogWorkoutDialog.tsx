import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dumbbell } from "lucide-react";
import { syncTodayToEcho11 } from "@/utils/elite10Connector";

interface LogWorkoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LogWorkoutDialog({ isOpen, onClose, onSuccess }: LogWorkoutDialogProps) {
  const { t } = useTranslation('leaderboard');
  const { t: tCommon } = useTranslation('common');
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogWorkout = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const now = new Date().toISOString();
      
      // Create workout record
      const { error: workoutError } = await supabase.from('workouts').insert({
        user_id: user.id,
        workout_type: 'other',
        start_time: now,
        duration_minutes: 30,
        source: 'manual',
        external_id: `manual_${Date.now()}`,
      });

      if (workoutError) throw workoutError;

      toast.success(t('workoutDialog.success'));
      
      // Sync to Echo11 (non-blocking)
      syncTodayToEcho11({
        sleep_quality: null,
        recovery_score: null,
        workout_type: 'Other',
        workout_intensity: 'Medium',
        nutrition_status: null,
      }).catch(e => console.warn('[Echo11] Sync failed:', e));
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error logging workout:', error);
      toast.error(t('workoutDialog.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            {t('workoutDialog.title')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('workoutDialog.description')}
          </p>
          <div className="flex gap-2">
            <Button 
              onClick={handleLogWorkout} 
              disabled={loading}
              className="flex-1"
            >
              {loading ? t('workoutDialog.logging') : t('workoutDialog.logWorkout')}
            </Button>
            <Button 
              variant="outline" 
              onClick={onClose}
              disabled={loading}
            >
              {tCommon('actions.cancel')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}