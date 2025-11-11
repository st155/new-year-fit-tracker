import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  LogOut,
  Dumbbell,
} from "lucide-react";
import { CustomNavigationIcon } from "@/components/ui/custom-navigation-icon";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/translations";

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const { state } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const [isTrainer, setIsTrainer] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const isCollapsed = state === "collapsed";
  const { t } = useTranslation();

  const currentPath = location.pathname;

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        setProfile(profileData);

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
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [user]);

  const mainItems = [
    { title: "navigation.dashboard", url: "/dashboard", iconType: "home" as const },
    { title: "navigation.progress", url: "/progress", iconType: "stats" as const },
    { title: "navigation.habits", url: "/habits", iconType: "habits" as const },
    { title: "navigation.body", url: "/body", iconType: "activity" as const },
    { title: "navigation.workouts", url: "/workouts", iconType: "activity" as const, badge: "AI" },
    { title: "navigation.challenges", url: "/challenges", iconType: "challenges" as const },
    { title: "navigation.goals", url: "/goals", iconType: "activity" as const },
    { title: "navigation.feed", url: "/feed", iconType: "activity" as const },
  ];

  const trainerItems = [
    { title: "navigation.trainerDashboard", url: "/trainer-dashboard", iconType: "trainer" as const },
    { title: "navigation.analytics", url: "/trainer-analytics", iconType: "stats" as const },
  ];

  const settingsItems = [
    { title: "navigation.profile", url: "/profile", iconType: "settings" as const },
    { title: "navigation.integrations", url: "/integrations", iconType: "integrations" as const },
    { title: "navigation.fitnessData", url: "/fitness-data", iconType: "connections" as const },
    { title: "navigation.medicalDocuments", url: "/medical-documents", iconType: "settings" as const },
  ];

  const isActive = (path: string) => currentPath === path;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <Sidebar className="border-r border-border/50 bg-card/30 backdrop-blur-sm">
      <SidebarHeader className="border-b border-border/50 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
            <Dumbbell className="h-5 w-5 text-primary" />
          </div>
            {!isCollapsed && (
              <span className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Elite10
              </span>
            )}
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t('navigation.navigation')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    className={`w-full justify-start ${
                      isActive(item.url)
                        ? "bg-primary/10 text-primary border-primary/20 border"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <CustomNavigationIcon 
                      type={item.iconType} 
                      isActive={isActive(item.url)}
                      className="scale-75"
                    />
                    {!isCollapsed && (
                      <span className="flex items-center gap-2">
                        {t(item.title)}
                        {'badge' in item && item.badge && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/20 text-primary">
                            {item.badge}
                          </Badge>
                        )}
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Trainer Section */}
        {isTrainer && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t('common.trainer')}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {trainerItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      onClick={() => navigate(item.url)}
                      className={`w-full justify-start ${
                        isActive(item.url)
                          ? "bg-accent/10 text-accent border-accent/20 border"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <CustomNavigationIcon 
                        type={item.iconType} 
                        isActive={isActive(item.url)}
                        className="scale-75"
                      />
                      {!isCollapsed && <span>{t(item.title)}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Settings Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t('navigation.settings')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    className={`w-full justify-start ${
                      isActive(item.url)
                        ? "bg-primary/10 text-primary border-primary/20 border"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <CustomNavigationIcon 
                      type={item.iconType} 
                      isActive={isActive(item.url)}
                      className="scale-75"
                    />
                    {!isCollapsed && <span>{t(item.title)}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-4">
        {/* User Profile */}
        {profile && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 border-2 border-primary/20">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {getInitials(profile.full_name || profile.username || 'User')}
                </AvatarFallback>
              </Avatar>
              
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {profile.full_name || profile.username}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {isTrainer ? t('common.trainer') : t('common.user')}
                    </Badge>
                  </div>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="w-full justify-start text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t('navigation.logout')}
              </Button>
            )}
          </div>
        )}

        {/* Sidebar Toggle */}
        <div className="flex justify-center pt-2">
          <SidebarTrigger className="h-8 w-8" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}