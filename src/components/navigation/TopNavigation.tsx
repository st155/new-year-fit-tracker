import { useNavigate, useLocation } from "react-router-dom";
import { Settings } from "lucide-react";
import { CustomNavigationIcon } from "@/components/ui/custom-navigation-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { memo } from "react";
import { useProfile } from "@/contexts/ProfileContext";
import { useTranslation } from "@/lib/translations";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TopNavigationProps {
  userName?: string;
  userRole?: string;
}

export const TopNavigation = memo(function TopNavigation({ userName, userRole }: TopNavigationProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useProfile();
  const { t } = useTranslation();

  const navItems = [
    { type: 'home' as const, path: "/", label: 'Главная' },
    { type: 'stats' as const, path: "/progress", label: 'Прогресс' },
    { type: 'goals' as const, path: "/goals", label: 'Цели' },
    { type: 'challenges' as const, path: "/challenges", label: 'Челленджи' },
    { type: 'activity' as const, path: "/body", label: 'Тело' },
    { type: 'habits' as const, path: "/habits", label: 'Привычки' },
    { type: 'feed' as const, path: "/feed", label: 'Лента' },
    { type: 'data' as const, path: "/fitness-data", label: 'Данные' },
  ];

  const isActive = (path: string) => location.pathname === path;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-accent">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Elite10
          </span>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 hover:bg-transparent hover:scale-110 active:scale-95 transition-all duration-300"
              >
                <Settings 
                  className="h-5 w-5 transition-all duration-300 icon-spin-hover" 
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
              <DropdownMenuItem onClick={() => navigate('/integrations')}>
                <span>{t('navigation.integrations')}</span>
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
            className="h-10 w-10 p-0 hover:bg-transparent hover:scale-110 active:scale-95 transition-all duration-300"
            onClick={() => navigate('/profile')}
          >
            <Avatar className="h-9 w-9 border-2 border-accent/30 ring-2 ring-cyan-400/30 shadow-[0_0_12px_rgba(34,211,238,0.4)] hover:ring-4 transition-all duration-300 hover:rotate-6">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-blue-500 text-white text-xs font-bold">
                {getInitials(profile?.username || profile?.full_name || userName || 'U')}
              </AvatarFallback>
            </Avatar>
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-center px-4 py-3 border-b border-border/20">
        <nav className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              size="sm"
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center gap-1 h-auto py-2 px-3 min-w-[60px] hover:bg-accent/50 transition-all duration-300 hover:scale-110 active:scale-95",
                isActive(item.path) && "bg-accent/30"
              )}
            >
              <div className="transition-all duration-300 hover:animate-bounce">
                <CustomNavigationIcon 
                  type={item.type} 
                  isActive={isActive(item.path)}
                />
              </div>
              <span className={cn(
                "text-[10px] font-medium transition-colors",
                isActive(item.path) ? "text-primary" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            </Button>
          ))}
        </nav>
      </div>
    </header>
  );
});
