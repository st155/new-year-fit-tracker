import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
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

      toast.success('Workout logged successfully! 🎉');
      
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
      toast.error('Failed to log workout');
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
            Log Workout
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Log a workout for today to complete the "Daily Grind" challenge.
          </p>
          <div className="flex gap-2">
            <Button 
              onClick={handleLogWorkout} 
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Logging...' : 'Log Workout'}
            </Button>
            <Button 
              variant="outline" 
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
