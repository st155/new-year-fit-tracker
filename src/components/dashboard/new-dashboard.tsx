import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { NewDashboardHeader } from "./new-dashboard-header";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardSkeleton } from "@/components/ui/dashboard-skeleton";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";
import { SwipeIndicator } from "@/components/ui/swipe-indicator";
import { 
  LazyMetricsGrid, 
  LazyGoalsProgress, 
  LazyAdditionalMetrics, 
  LazyTodayActivity, 
  LazyQuickActions 
} from "./lazy-dashboard";

export function NewDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const [profile, setProfile] = useState<any>(null);
  const [activeChallenge, setActiveChallenge] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const routes = ['/', '/progress', '/challenges', '/feed'];
  const currentIndex = routes.indexOf(location.pathname);

  // Swipe navigation between main pages with visual feedback
  const { swipeProgress, swipeDirection } = useSwipeNavigation({
    routes,
    enabled: true,
  });

  const fetchUserData = async () => {
    if (!user) return;

    setLoading(true);
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

  useEffect(() => {
    fetchUserData();

    // Обновляем время каждую минуту для актуального счетчика
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, [user]);

  if (loading) {
    return <DashboardSkeleton />;
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

  const handleRefresh = async () => {
    await fetchUserData();
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-background relative">
        <SwipeIndicator 
          progress={swipeProgress}
          direction={swipeDirection}
          currentIndex={currentIndex}
          totalPages={routes.length}
        />
        <div className="space-y-6 pb-8 animate-fade-in">
          <NewDashboardHeader
            userName={userName}
            userRole={userRole}
            challengeTitle={activeChallenge?.title}
            challengeProgress={challengeProgress}
            daysLeft={daysLeft}
          />
          
          {/* Main metrics grid */}
          <div className="px-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <LazyMetricsGrid />
          </div>
          
          {/* Quick Actions right after metrics */}
          <div className="px-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <LazyQuickActions userRole={userRole} />
          </div>
          
          {/* Compact, centered stack for remaining content */}
          <div className="px-6 animate-fade-in" style={{ animationDelay: '300ms' }}>
            <div className="mx-auto max-w-5xl space-y-6">
              <LazyTodayActivity />
              <LazyAdditionalMetrics />
              <LazyGoalsProgress />
            </div>
          </div>
        </div>
      </div>
    </PullToRefresh>
  );
}