import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";

export function ChallengeReminder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (!user || hasChecked) return;

    const checkChallenges = async () => {
      try {
        // Проверяем, не показывали ли уже напоминание
        const reminderKey = `challenge_reminder_shown_${user.id}`;
        const lastShown = localStorage.getItem(reminderKey);
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

        // Показываем не чаще раза в день
        if (lastShown && parseInt(lastShown) > oneDayAgo) {
          setHasChecked(true);
          return;
        }

        // Проверяем, есть ли у пользователя активные челленджи
        const { data: participations } = await supabase
          .from("challenge_participants")
          .select("challenge_id, challenges!inner(is_active)")
          .eq("user_id", user.id)
          .eq("challenges.is_active", true);

        // Если нет активных челленджей, показываем напоминание
        if (!participations || participations.length === 0) {
          setIsOpen(true);
          localStorage.setItem(reminderKey, Date.now().toString());
        }

        setHasChecked(true);
      } catch (error) {
        console.error("Error checking challenges:", error);
        setHasChecked(true);
      }
    };

    // Задержка перед проверкой, чтобы дать интерфейсу загрузиться
    const timer = setTimeout(checkChallenges, 2000);
    return () => clearTimeout(timer);
  }, [user, hasChecked]);

  const handleJoinChallenge = () => {
    setIsOpen(false);
    navigate("/challenges");
  };

  const handleDismiss = () => {
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">
            Join a Challenge! 🏆
          </DialogTitle>
        </DialogHeader>

        <div className="py-6">
          <Trophy className="h-16 w-16 text-primary mx-auto mb-4" />
          <DialogDescription className="text-center text-base">
            You're not participating in any challenges yet! Join a challenge to compete with others, stay motivated, and achieve your fitness goals together.
          </DialogDescription>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button onClick={handleJoinChallenge} className="w-full">
            Browse Challenges
          </Button>
          <Button onClick={handleDismiss} variant="ghost" className="w-full">
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
