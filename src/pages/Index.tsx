import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { GoalsSection } from "@/components/dashboard/goals-section";
import { Leaderboard } from "@/components/dashboard/leaderboard";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { IntegrationsCard } from "@/components/dashboard/integrations-card";
import { AppTestSuite } from "@/components/ui/app-test-suite";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { TrainerPostsFeed } from "@/components/notifications/TrainerPostsFeed";
import { TrainerOverview } from "@/components/trainer/TrainerOverview";
import { ClientDetailView } from "@/components/trainer/ClientDetailView";
import { useTranslation } from "react-i18next";

const Index = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<any>(null);
  const [activeChallenge, setActiveChallenge] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isTrainer, setIsTrainer] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);

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

        // Проверяем, является ли пользователь тренером
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .in('role', ['trainer', 'admin']);

        if (roles && roles.length > 0) {
          setIsTrainer(true);
        } else if (profileData?.trainer_role) {
          setIsTrainer(true);
        }

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

    // Настраиваем автообновление данных каждые 30 секунд
    const interval = setInterval(() => {
      if (user) {
        fetchUserData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  // Обновляем время каждую минуту для актуального счетчика
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Обновляем каждую минуту

    return () => clearInterval(timer);
  }, []);

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
    
    // Используем текущее время для точного расчета
    const today = currentTime;
    
    // Устанавливаем время в 23:59:59 для конца дня челленджа
    challengeEnd.setHours(23, 59, 59, 999);
    
    const totalDays = Math.ceil((challengeEnd.getTime() - challengeStart.getTime()) / (1000 * 60 * 60 * 24));
    const passedDays = Math.max(0, Math.ceil((today.getTime() - challengeStart.getTime()) / (1000 * 60 * 60 * 24)));
    
    challengeProgress = Math.min(100, Math.max(0, (passedDays / totalDays) * 100));
    
    // Более точный расчет оставшихся дней
    const timeLeft = challengeEnd.getTime() - today.getTime();
    daysLeft = Math.max(0, Math.ceil(timeLeft / (1000 * 60 * 60 * 24)));
  }

  const userName = profile?.full_name || profile?.username || t('common.user');
  const userRole = profile?.trainer_role ? 'trainer' : 'participant';

  return (
    <div className="animate-fade-in">
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
        
        {/* Показываем либо тренерскую панель, либо обычный контент */}
        {isTrainer ? (
          <div className="space-y-8 animate-fade-in" style={{ animationDelay: '400ms' }}>
            {selectedClient ? (
              <ClientDetailView 
                client={selectedClient} 
                onBack={() => setSelectedClient(null)} 
              />
            ) : (
              <TrainerOverview onClientSelect={setSelectedClient} />
            )}
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    {t('dashboard.trainerPanel')}
                  </CardTitle>
                  <CardDescription>
                    {t('dashboard.trainerPanelDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        {t('common.trainer')}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {t('dashboard.clientManagement')}
                      </span>
                    </div>
                    <Link to="/trainer-dashboard">
                      <Button>
                        {t('dashboard.openPanel')}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
              
              <IntegrationsCard />
            </div>
            
            <TrainerPostsFeed />
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-fade-in" style={{ animationDelay: '400ms' }}>
            <div className="xl:col-span-2 space-y-6">
              <GoalsSection userRole={userRole} />
            </div>
            
            <div className="space-y-6">
              <IntegrationsCard />
              <QuickActions userRole={userRole} />
              <Leaderboard />
            </div>
          </div>
        )}
        
        {/* Общий контент для всех пользователей */}
        <div className="space-y-6 mt-8">
          {!isTrainer && <TrainerPostsFeed />}
          
          {/* Добавляем кнопку для запуска тестов */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                {t('dashboard.runTests')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>{t('dashboard.testingProject')}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-hidden">
                <AppTestSuite />
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Footer с ссылкой на Privacy Policy */}
        <footer className="border-t pt-8 mt-12">
          <div className="text-center text-sm text-muted-foreground">
            <Link 
              to="/privacy-policy" 
              className="hover:text-primary transition-colors underline"
            >
              {t('dashboard.privacyPolicy')}
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Index;
