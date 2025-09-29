import { useState, useEffect } from "react";
import { NewDashboardHeader } from "./new-dashboard-header";
import { MetricsGrid } from "./metrics-grid";
import { GoalsProgress } from "./goals-progress";
import { AdditionalMetrics } from "./additional-metrics";
import { TodayActivity } from "./today-activity";
import { QuickActions } from "./quick-actions";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export function NewDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [activeChallenge, setActiveChallenge] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        // Загружаем профиль пользователя
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        setProfile(profileData);

        // Загружаем активный челлендж пользователя
        const { data: participantData } = await supabase
          .from('challenge_participants')
          .select(`
            challenge_id,
            challenges (
              id,
              title,
              description,
              start_date,
              end_date,
              is_active
            )
          `)
          .eq('user_id', user.id);

        if (participantData && participantData.length > 0) {
          const activeChallenge = participantData.find(p => 
            p.challenges && p.challenges.is_active
          );
          setActiveChallenge(activeChallenge?.challenges);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();

    // Обновляем время каждую минуту для актуального счетчика
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Расчет прогресса активного челленджа
  let challengeProgress = 0;
  let daysLeft = 0;

  if (activeChallenge) {
    const challengeEnd = new Date(activeChallenge.end_date);
    const challengeStart = new Date(activeChallenge.start_date);
    const today = currentTime;
    
    challengeEnd.setHours(23, 59, 59, 999);
    
    const totalDays = Math.ceil((challengeEnd.getTime() - challengeStart.getTime()) / (1000 * 60 * 60 * 24));
    const passedDays = Math.max(0, Math.ceil((today.getTime() - challengeStart.getTime()) / (1000 * 60 * 60 * 24)));
    
    challengeProgress = Math.min(100, Math.max(0, (passedDays / totalDays) * 100));
    
    const timeLeft = challengeEnd.getTime() - today.getTime();
    daysLeft = Math.max(0, Math.ceil(timeLeft / (1000 * 60 * 60 * 24)));
  }

  const userName = profile?.full_name || profile?.username || 'User';
  const userRole = profile?.trainer_role ? 'trainer' : 'participant';

  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-6 pb-8">
        <NewDashboardHeader
          userName={userName}
          userRole={userRole}
          challengeTitle={activeChallenge?.title}
          challengeProgress={challengeProgress}
          daysLeft={daysLeft}
        />
        
        {/* Main metrics grid */}
        <div className="px-6">
          <MetricsGrid />
        </div>
        
        {/* Quick Actions right after metrics */}
        <div className="px-6">
          <QuickActions userRole={userRole} />
        </div>
        
        {/* Desktop: Two-column layout for remaining content */}
        <div className="px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Today's activity */}
            <div className="lg:col-span-2">
              <TodayActivity />
            </div>
            
            {/* Right Column - Additional metrics and leaderboard */}
            <div className="space-y-6">
              <AdditionalMetrics />
            </div>
          </div>
        </div>
        
        <GoalsProgress />
      </div>
    </div>
  );
}