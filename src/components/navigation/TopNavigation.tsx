import { useNavigate, useLocation } from "react-router-dom";
import { Home, BarChart3, Trophy, Camera, User, Bell, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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
    { icon: Home, path: "/dashboard", label: "Home" },
    { icon: BarChart3, path: "/progress", label: "Stats" },
    { icon: Trophy, path: "/challenges", label: "Challenges" },
    { icon: Camera, path: "/feed", label: "Camera" },
    { icon: User, path: "/profile", label: "Profile" },
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
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-accent">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            FitTracker
          </span>
        </div>

        {/* Navigation Icons */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              size="sm"
              onClick={() => navigate(item.path)}
              className={cn(
                "h-10 w-10 p-0 relative",
                isActive(item.path)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <item.icon className="h-5 w-5" />
              {isActive(item.path) && (
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full"></div>
              )}
            </Button>
          ))}
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0 relative"
            onClick={() => navigate('/notifications')}
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs rounded-full flex items-center justify-center"
              >
                {notificationCount}
              </Badge>
            )}
          </Button>

          {/* Language/Region */}
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0"
          >
            <Globe className="h-4 w-4" />
          </Button>

          {/* User initials */}
          <div className="flex items-center gap-1 bg-muted/30 rounded-full px-2 py-1">
            <span className="text-sm font-medium text-foreground">
              {userRole === 'trainer' ? 'ST' : 'ПР'}
            </span>
          </div>

          {/* User Avatar */}
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0"
            onClick={() => navigate('/profile')}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {getInitials(userName || 'User')}
              </AvatarFallback>
            </Avatar>
          </Button>
        </div>
      </div>
    </header>
  );
}