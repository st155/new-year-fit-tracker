import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { GoalsSection } from "@/components/dashboard/goals-section";
import { Leaderboard } from "@/components/dashboard/leaderboard";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const Index = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [activeChallenge, setActiveChallenge] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    const today = new Date();
    
    const totalDays = Math.ceil((challengeEnd.getTime() - challengeStart.getTime()) / (1000 * 60 * 60 * 24));
    const passedDays = Math.ceil((today.getTime() - challengeStart.getTime()) / (1000 * 60 * 60 * 24));
    
    challengeProgress = Math.min(100, Math.max(0, (passedDays / totalDays) * 100));
    daysLeft = Math.max(0, Math.ceil((challengeEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  }

  const userName = profile?.full_name || profile?.username || 'Пользователь';
  const userRole = profile?.trainer_role ? 'trainer' : 'participant';

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <DashboardHeader 
        userName={userName}
        userRole={userRole}
        challengeProgress={challengeProgress}
        daysLeft={Math.max(0, daysLeft)}
        challengeTitle={activeChallenge?.title}
      />
      
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
          <StatsGrid userRole={userRole} />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in" style={{ animationDelay: '400ms' }}>
          <div className="lg:col-span-2">
            <GoalsSection userRole={userRole} />
          </div>
          
          <div className="space-y-6">
            <QuickActions userRole={userRole} />
            <Leaderboard />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
