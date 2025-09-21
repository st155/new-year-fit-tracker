import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Trophy, Target, Users, LogOut, Settings, Home, Calendar, TrendingUp, BarChart3 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

interface DashboardHeaderProps {
  userName: string;
  userRole: "participant" | "trainer";
  challengeProgress: number;
  daysLeft: number;
  challengeTitle?: string;
}

export function DashboardHeader({ userName, userRole, challengeProgress, daysLeft, challengeTitle }: DashboardHeaderProps) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="bg-gradient-card border-b border-border/50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary/50">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`} />
              <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                {userName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Привет, {userName}!
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={userRole === "trainer" ? "default" : "secondary"} className="font-semibold">
                  {userRole === "trainer" ? (
                    <>
                      <Trophy className="w-3 h-3 mr-1" />
                      Тренер
                    </>
                  ) : (
                    <>
                      <Target className="w-3 h-3 mr-1" />
                      Участник
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
          
          <div className="flex items-center gap-4">
            {challengeTitle ? (
              <div className="flex flex-col items-end gap-2">
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {daysLeft > 0 ? `${daysLeft} дней` : 'Завершён!'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {daysLeft > 0 ? 'до финиша' : 'Челлендж завершён'}
                  </div>
                </div>
                <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-primary transition-all duration-500"
                    style={{ width: `${challengeProgress}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  {Math.round(challengeProgress)}% завершено
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <div className="text-sm">Нет активных челленджей</div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate('/challenges')}
                  className="mt-2"
                >
                  Присоединиться
                </Button>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Button 
                variant={location.pathname === '/' ? "default" : "ghost"}
                size="sm" 
                onClick={() => navigate('/')}
                className="text-muted-foreground hover:text-foreground"
              >
                <Home className="h-4 w-4 mr-1" />
                 Главная
               </Button>
               <Button 
                 variant={location.pathname === '/dashboard' ? "default" : "ghost"}
                 size="sm" 
                 onClick={() => navigate('/dashboard')}
                 className="text-muted-foreground hover:text-foreground"
               >
                 <BarChart3 className="h-4 w-4 mr-1" />
                 Фитнес
               </Button>
               <Button 
                 variant={location.pathname === '/challenges' ? "default" : "ghost"}
                 size="sm" 
                 onClick={() => navigate('/challenges')}
                 className="text-muted-foreground hover:text-foreground"
               >
                 <Calendar className="h-4 w-4 mr-1" />
                Челленджи
              </Button>
              <Button 
                variant={location.pathname === '/progress' ? "default" : "ghost"}
                size="sm" 
                onClick={() => navigate('/progress')}
                className="text-muted-foreground hover:text-foreground"
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                Прогресс
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/profile')}
                className="text-muted-foreground hover:text-foreground"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSignOut}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}