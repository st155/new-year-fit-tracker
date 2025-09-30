import { useNavigate, useLocation } from "react-router-dom";
import { Bell, Globe, Settings } from "lucide-react";
import { CustomNavigationIcon } from "@/components/ui/custom-navigation-icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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

export function TopNavigation({ userName, userRole }: TopNavigationProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [notificationCount, setNotificationCount] = useState(1);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        setProfile(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfile();
  }, [user]);

  const navItems = [
    { type: 'home' as const, path: "/dashboard", label: "Home" },
    { type: 'stats' as const, path: "/progress", label: "Stats" },
    { type: 'data' as const, path: "/fitness-data", label: "Data" },
    { type: 'challenges' as const, path: "/challenges", label: "Challenges" },
    { type: 'feed' as const, path: "/feed", label: "Activity" },
    { type: 'integrations' as const, path: "/integrations", label: "Integrations" },
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
      {/* First row - Logo and User info */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-accent">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Elite10
          </span>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0 relative hover:bg-transparent"
            onClick={() => navigate('/notifications')}
          >
            <Bell 
              className="h-5 w-5 transition-all duration-300" 
              style={{
                color: '#f59e0b',
                filter: 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.5))'
              }}
            />
            {notificationCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(239,68,68,0.6)]"
              >
                {notificationCount}
              </Badge>
            )}
          </Button>

          {/* Language/Region */}
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0 hover:bg-transparent"
          >
            <Globe 
              className="h-4 w-4 transition-all duration-300" 
              style={{
                color: '#3b82f6',
                filter: 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.5))'
              }}
            />
          </Button>

          {/* Settings */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 hover:bg-transparent"
              >
                <Settings 
                  className="h-5 w-5 transition-all duration-300" 
                  style={{
                    color: '#a855f7',
                    filter: 'drop-shadow(0 0 6px rgba(168, 85, 247, 0.5))'
                  }}
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Настройки</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/integrations')}>
                <span>Интеграции с устройствами</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <span>Профиль</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/privacy-policy')}>
                <span>Конфиденциальность</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Avatar with initials */}
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0 hover:bg-transparent"
            onClick={() => navigate('/profile')}
          >
            <Avatar className="h-9 w-9 border-2 border-accent/30 ring-2 ring-cyan-400/30 shadow-[0_0_12px_rgba(34,211,238,0.4)]">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-blue-500 text-white text-xs font-bold">
                {getInitials(profile?.username || profile?.full_name || userName || 'U')}
              </AvatarFallback>
            </Avatar>
          </Button>
        </div>
      </div>

      {/* Second row - Navigation Icons */}
      <div className="flex items-center justify-center px-4 py-4">
        <nav className="flex items-center gap-6">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              size="sm"
              onClick={() => navigate(item.path)}
              className="h-12 w-12 p-0 relative hover:bg-transparent"
            >
              <CustomNavigationIcon 
                type={item.type} 
                isActive={isActive(item.path)}
              />
            </Button>
          ))}
        </nav>
      </div>
    </header>
  );
}