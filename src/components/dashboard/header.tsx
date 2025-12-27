import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Trophy, Target, Users, LogOut, Settings, Home, Calendar, TrendingUp, BarChart3 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface DashboardHeaderProps {
  userName: string;
  userRole: "participant" | "trainer";
  challengeProgress: number;
  daysLeft: number;
  challengeTitle?: string;
}

export function DashboardHeader({ userName, userRole, challengeProgress, daysLeft, challengeTitle }: DashboardHeaderProps) {
  const { t } = useTranslation('dashboard');
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isTrainer, setIsTrainer] = useState(false);

  useEffect(() => {
    if (user) {
      checkTrainerRole();
    }
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
  };

  const checkTrainerRole = async () => {
    if (!user) return;

    try {
      // Проверяем новую систему ролей
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['trainer', 'admin']);

      if (!error && roles && roles.length > 0) {
        setIsTrainer(true);
        return;
      }

      // Проверяем старую систему (trainer_role в profiles)
      const { data: profile } = await supabase
        .from('profiles')
        .select('trainer_role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile?.trainer_role) {
        setIsTrainer(true);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error checking trainer role:', error);
      }
    }
  };

  return (
    <div className="bg-gradient-card border-b border-border/50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary/50">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`} />
              <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                {userName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                {t('header.greeting', { name: userName })}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={userRole === "trainer" ? "default" : "secondary"} className="font-semibold">
                  {userRole === "trainer" ? (
                    <>
                      <Trophy className="w-3 h-3 mr-1" />
                      {t('header.trainer')}
                    </>
                  ) : (
                    <>
                      <Target className="w-3 h-3 mr-1" />
                      {t('header.participant')}
                    </>
                  )}
                </Badge>
                {challengeTitle && (
                  <Badge variant="outline" className="text-muted-foreground">
                    <Users className="w-3 h-3 mr-1" />
                    {challengeTitle}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
            {challengeTitle ? (
              <div className="flex flex-col items-end gap-2">
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {daysLeft > 0 ? t('header.daysLeft', { count: daysLeft }) : t('header.finished')}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {daysLeft > 0 ? t('header.untilFinish') : t('header.challengeFinished')}
                  </div>
                </div>
                <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-primary transition-all duration-500"
                    style={{ width: `${challengeProgress}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('header.completed', { percent: Math.round(challengeProgress) })}
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <div className="text-sm">{t('header.noChallenges')}</div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate('/challenges')}
                  className="mt-2"
                >
                  {t('header.joinChallenge')}
                </Button>
              </div>
            )}
            
            <div className="w-full sm:w-auto">
              {/* Первый ряд - основные страницы */}
              <div className="flex justify-center gap-1 mb-2 sm:mb-0 sm:justify-start">
                <Button 
                  variant={location.pathname === '/' ? "default" : "ghost"}
                  size="sm" 
                  onClick={() => navigate('/')}
                  className={location.pathname === '/' ? "text-white" : "text-foreground hover:text-white hover:bg-primary/20"}
                >
                  <Home className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">{t('header.home')}</span>
                </Button>
                <Button 
                  variant={location.pathname === '/dashboard' ? "default" : "ghost"}
                  size="sm" 
                  onClick={() => navigate('/dashboard')}
                  className={location.pathname === '/dashboard' ? "text-white" : "text-foreground hover:text-white hover:bg-primary/20"}
                >
                  <BarChart3 className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">{t('header.fitness')}</span>
                </Button>
                <Button 
                  variant={location.pathname === '/challenges' ? "default" : "ghost"}
                  size="sm" 
                  onClick={() => navigate('/challenges')}
                  className={location.pathname === '/challenges' ? "text-white" : "text-foreground hover:text-white hover:bg-primary/20"}
                >
                  <Calendar className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">{t('header.challenges')}</span>
                </Button>
              </div>
              
              {/* Второй ряд - дополнительные функции */}
              <div className="flex justify-center gap-1 sm:hidden">
                <Button 
                  variant={location.pathname === '/progress' ? "default" : "ghost"}
                  size="sm" 
                  onClick={() => navigate('/progress')}
                  className={location.pathname === '/progress' ? "text-white" : "text-foreground hover:text-white hover:bg-primary/20"}
                >
                  <TrendingUp className="h-4 w-4" />
                </Button>
                {isTrainer && (
                  <Button 
                    variant={location.pathname === '/trainer-dashboard' ? "default" : "ghost"}
                    size="sm"
                    onClick={() => navigate('/trainer-dashboard')}
                    className={location.pathname === '/trainer-dashboard' ? "text-white" : "text-foreground hover:text-white hover:bg-primary/20"}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/profile')}
                  className="text-foreground hover:text-white hover:bg-primary/20"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSignOut}
                  className="text-foreground hover:text-white hover:bg-primary/20"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Десктоп версия - все в одну строку */}
              <div className="hidden sm:flex items-center gap-2 mt-2 sm:mt-0">
                <Button 
                  variant={location.pathname === '/progress' ? "default" : "ghost"}
                  size="sm" 
                  onClick={() => navigate('/progress')}
                  className={location.pathname === '/progress' ? "text-white" : "text-foreground hover:text-white hover:bg-primary/20"}
                >
                  <TrendingUp className="h-4 w-4 mr-1" />
                  {t('header.progress')}
                </Button>
                {isTrainer && (
                  <Button 
                    variant={location.pathname === '/trainer-dashboard' ? "default" : "ghost"}
                    size="sm"
                    onClick={() => navigate('/trainer-dashboard')}
                    className={location.pathname === '/trainer-dashboard' ? "text-white" : "text-foreground hover:text-white hover:bg-primary/20"}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    {t('header.trainer')}
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/profile')}
                  className="text-foreground hover:text-white hover:bg-primary/20"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSignOut}
                  className="text-foreground hover:text-white hover:bg-primary/20"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
