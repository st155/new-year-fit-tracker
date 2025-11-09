import { useNavigate, useLocation } from "react-router-dom";
import { Settings, Menu, Home, TrendingUp, Target, Trophy } from "lucide-react";
import { CustomNavigationIcon } from "@/components/ui/custom-navigation-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { memo } from "react";
import { useProfile } from "@/contexts/ProfileContext";
import { useTranslation } from "@/lib/translations";
import { useAuth } from "@/hooks/useAuth";
import { usePrefetch } from "@/hooks/usePrefetch";
import { TrainerNotifications } from "@/components/trainer/notifications/TrainerNotifications";
import { useIsMobile } from "@/hooks/primitive";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHabitNotificationsRealtime } from "@/hooks/composite/realtime";

interface TopNavigationProps {
  userName?: string;
  userRole?: string;
}

export const TopNavigation = memo(function TopNavigation({ userName, userRole }: TopNavigationProps) {
  console.log('🧭 [TopNavigation] Rendering');
  
  const navigate = useNavigate();
  const location = useLocation();
  const prefetch = usePrefetch();
  const isMobile = useIsMobile();
  
  // Safe hooks with fallbacks
  let profile = null;
  let isTrainer = false;
  let user = null;
  let t = (key: string) => key; // Fallback translation function
  
  try {
    const profileData = useProfile();
    profile = profileData?.profile;
  } catch (error) {
    console.error('💥 [TopNavigation] useProfile error:', error);
  }
  
  try {
    const translation = useTranslation();
    t = translation.t;
  } catch (error) {
    console.error('💥 [TopNavigation] useTranslation error:', error);
  }
  
  try {
    const authData = useAuth();
    isTrainer = authData?.isTrainer ?? false;
    user = authData?.user;
  } catch (error) {
    console.error('💥 [TopNavigation] useAuth error:', error);
  }

  // Enable real-time for notifications
  useHabitNotificationsRealtime(!!user?.id);

  // Fetch unread notifications count for Habits 3.0
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['habits-notifications-unread', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count } = await supabase
        .from('habit_notifications' as any)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      return count || 0;
    },
    enabled: !!user?.id,
    staleTime: 10000, // Real-time updates will refresh this
  });

  // Main navigation items for mobile (4 items)
  const mainNavItems = [
    { type: 'home' as const, path: "/dashboard", icon: Home, label: 'Главная' },
    { type: 'stats' as const, path: "/progress", icon: TrendingUp, label: 'Прогресс' },
    { type: 'goals' as const, path: "/goals", icon: Target, label: 'Цели' },
    { type: 'challenges' as const, path: "/challenges", icon: Trophy, label: 'Челленджи' },
  ];

  // Secondary navigation items for "More" menu
  const secondaryNavItems = [
    { path: "/leaderboard", label: 'Рейтинг' },
    { path: "/body", label: 'Тело' },
    { path: "/habits-v3", label: 'Привычки' },
    { path: "/fitness-data", label: 'Фитнес дата' },
  ];

  // Desktop navigation items (full list)
  const userNavItems = [
    { type: 'home' as const, path: "/", label: 'Главная' },
    { type: 'stats' as const, path: "/progress", label: 'Прогресс' },
    { type: 'goals' as const, path: "/goals", label: 'Цели' },
    { type: 'leaderboard' as const, path: "/leaderboard", label: 'Рейтинг' },
    { type: 'challenges' as const, path: "/challenges", label: 'Челленджи' },
    { type: 'activity' as const, path: "/body", label: 'Тело' },
    { type: 'habits' as const, path: "/habits-v3", label: 'Привычки' },
    { type: 'connections' as const, path: "/fitness-data", label: 'Фитнес дата' },
  ];

  const trainerNavItems = [
    { type: 'home' as const, path: "/trainer-dashboard", label: 'Тренерский кабинет' },
    { type: 'challenges' as const, path: "/challenges", label: 'Челленджи' },
    { type: 'stats' as const, path: "/progress", label: 'Мой прогресс' },
    { type: 'goals' as const, path: "/goals", label: 'Мои цели' },
  ];

  const navItems = isTrainer ? trainerNavItems : userNavItems;

  const isActive = (path: string) => {
    if (path === '/trainer-dashboard') {
      // Active only on main dashboard without client parameter
      return location.pathname === path && !location.search.includes('client=');
    }
    return location.pathname === path;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur-sm safe-area-top w-full">
      <div className="flex items-center justify-between px-2 py-2 w-full max-w-full">
        {isMobile ? (
          /* Mobile Navigation - Only icons */
          <nav className="flex items-center justify-around gap-1 flex-1">
            {/* Main 4 navigation items */}
            {mainNavItems.map((item) => (
              <Button
                key={item.path}
                variant="ghost"
                size="sm"
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex flex-col items-center gap-1 h-auto py-2 px-2 min-w-[60px]",
                  isActive(item.path) && "text-primary bg-accent/30"
                )}
              >
                <item.icon className="h-6 w-6" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Button>
            ))}
            
            {/* More menu with Sheet */}
            <Sheet>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex flex-col items-center gap-1 h-auto py-2 px-2 min-w-[60px]"
                >
                  <Menu className="h-6 w-6" />
                  <span className="text-[10px] font-medium">Ещё</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-auto rounded-t-2xl">
                <div className="space-y-2 py-4">
                  {/* Profile */}
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-lg h-14 gap-3",
                      isActive('/profile') && "bg-accent/30 text-primary"
                    )}
                    onClick={() => navigate('/profile')}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-blue-500 text-white text-xs">
                        {getInitials(profile?.username || profile?.full_name || userName || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    Профиль
                  </Button>
                  
                   {/* Secondary nav items */}
                  {secondaryNavItems.map((item) => (
                    <Button
                      key={item.path}
                      variant="ghost"
                      className={cn(
                        "w-full justify-start text-lg h-14 relative",
                        isActive(item.path) && "bg-accent/30 text-primary"
                      )}
                      onClick={() => navigate(item.path)}
                    >
                      {item.label}
                      {item.path === '/habits-v3' && unreadCount > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="ml-auto h-5 min-w-[20px] px-1.5 text-xs"
                        >
                          {unreadCount}
                        </Badge>
                      )}
                    </Button>
                  ))}
                  
                  {/* Trainer Notifications */}
                  {isTrainer && (
                    <div className="px-4 py-2">
                      <TrainerNotifications />
                    </div>
                  )}
                  
                  {/* Privacy Policy */}
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-lg h-14"
                    onClick={() => navigate('/privacy-policy')}
                  >
                    Политика конфиденциальности
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </nav>
        ) : (
          /* Desktop Navigation - Full layout */
          <>
            {/* Logo */}
            <div 
              className="flex items-center gap-3 min-w-[120px] cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate('/dashboard')}
            >
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-accent">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
              <span className="text-xl md:text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Elite10
              </span>
            </div>

            {/* Navigation - Center */}
            <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1 justify-center px-4">
              {navItems.map((item) => (
                <Button
                  key={item.path}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (item.path === '/trainer-dashboard') {
                      navigate('/trainer-dashboard?tab=overview');
                    } else {
                      navigate(item.path);
                    }
                  }}
                  onMouseEnter={() => {
                    prefetch.route(item.path);
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1.5 h-auto py-3 px-4 min-h-[56px] min-w-[60px] touch-friendly hover:bg-accent/50 transition-all duration-300 hover:scale-110 active:scale-95 md:py-2 md:px-3 md:min-h-[unset] relative",
                    isActive(item.path) && "bg-accent/30"
                  )}
                >
                  <div className="transition-all duration-300 hover:animate-bounce relative">
                    <CustomNavigationIcon 
                      type={item.type} 
                      isActive={isActive(item.path)}
                      className="h-6 w-6 md:h-5 md:w-5"
                    />
                    {item.path === '/habits-v3' && unreadCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-2 -right-2 h-4 min-w-[16px] px-1 text-[10px] p-0 flex items-center justify-center"
                      >
                        {unreadCount}
                      </Badge>
                    )}
                  </div>
                  <span className={cn(
                    "text-xs md:text-[10px] font-medium transition-colors",
                    isActive(item.path) ? "text-primary" : "text-muted-foreground"
                  )}>
                    {item.label}
                  </span>
                </Button>
              ))}
            </nav>

            {/* Settings & Profile - Right */}
            <div className="flex items-center gap-2 min-w-[120px] justify-end">
              {/* Trainer Notifications */}
              {isTrainer && <TrainerNotifications />}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-11 w-11 md:h-10 md:w-10 p-0 touch-friendly hover:bg-transparent hover:scale-110 active:scale-95 transition-all duration-300"
                  >
                    <Settings 
                      className="h-6 w-6 md:h-5 md:w-5 transition-all duration-300 icon-spin-hover"
                      style={{
                        color: '#a855f7',
                        filter: 'drop-shadow(0 0 6px rgba(168, 85, 247, 0.5))'
                      }}
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>{t('navigation.settings')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/fitness-data')} className="cursor-pointer flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span>Фитнес дата</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <span>{t('navigation.profile')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/privacy-policy')}>
                    <span>{t('dashboard.privacyPolicy')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="sm"
                className="h-11 w-11 md:h-10 md:w-10 p-0 touch-friendly hover:bg-transparent hover:scale-110 active:scale-95 transition-all duration-300"
                onClick={() => navigate('/profile')}
              >
                <Avatar className="h-10 w-10 md:h-9 md:w-9 border-2 border-accent/30 ring-2 ring-cyan-400/30 shadow-[0_0_12px_rgba(34,211,238,0.4)] hover:ring-4 transition-all duration-300 hover:rotate-6">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-blue-500 text-white text-xs font-bold">
                    {getInitials(profile?.username || profile?.full_name || userName || 'U')}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </div>
          </>
        )}
      </div>
    </header>
  );
});
