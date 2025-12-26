/**
 * DesktopSidebar - Left sidebar for desktop layout
 * Groups: Core, Actions, Data
 */

import { memo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Home,
  TrendingUp,
  Sparkles,
  Dumbbell,
  Pill,
  Target,
  FileText,
  User,
  Activity,
  Trophy,
  Award,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const DesktopSidebar = memo(function DesktopSidebar() {
  const { t } = useTranslation("navigation");
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const isActive = (path: string) => location.pathname === path;

  // Core group - main navigation
  const coreItems: NavItem[] = [
    { title: t("home"), url: "/dashboard", icon: Home },
    { title: t("progress"), url: "/progress", icon: TrendingUp },
    { title: t("recommendations"), url: "/recommendations", icon: Sparkles },
  ];

  // Actions group - user actions
  const actionsItems: NavItem[] = [
    { title: t("workouts"), url: "/workouts", icon: Dumbbell },
    { title: t("supplements"), url: "/supplements", icon: Pill },
    { title: t("habits"), url: "/habits", icon: Target },
  ];

  // Data group - user data
  const dataItems: NavItem[] = [
    { title: t("medicalDocuments"), url: "/medical-documents", icon: FileText },
    { title: t("body"), url: "/body", icon: User },
    { title: t("fitnessData"), url: "/fitness-data", icon: Activity },
  ];

  // Extra items
  const extraItems: NavItem[] = [
    { title: t("goals"), url: "/goals", icon: Target },
    { title: t("challenges"), url: "/challenges", icon: Trophy },
    { title: t("leaderboard"), url: "/leaderboard", icon: Award },
  ];

  const renderNavGroup = (
    label: string,
    items: NavItem[],
    defaultOpen = true
  ) => (
    <Collapsible defaultOpen={defaultOpen} className="group/collapsible">
      <SidebarGroup>
        <CollapsibleTrigger asChild>
          <SidebarGroupLabel className="cursor-pointer hover:bg-accent/50 rounded-md transition-colors">
            <span className="flex-1">{label}</span>
            {!collapsed && (
              <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
            )}
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    isActive={isActive(item.url)}
                    tooltip={collapsed ? item.title : undefined}
                    className={cn(
                      "transition-colors",
                      isActive(item.url) && "bg-primary/10 text-primary font-medium"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {!collapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="border-b border-border/50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold text-sm">
            E10
          </div>
          {!collapsed && (
            <span className="font-semibold text-foreground">Elite10</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        {renderNavGroup(t("groups.core", "Core"), coreItems)}
        {renderNavGroup(t("groups.actions", "Actions"), actionsItems)}
        {renderNavGroup(t("groups.data", "Data"), dataItems)}
        {renderNavGroup(t("more"), extraItems, false)}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => navigate("/profile")}
              tooltip={collapsed ? t("profile") : undefined}
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src="" />
                <AvatarFallback className="text-xs bg-muted">U</AvatarFallback>
              </Avatar>
              {!collapsed && <span>{t("profile")}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => navigate("/settings")}
              tooltip={collapsed ? t("settings") : undefined}
            >
              <Settings className="h-4 w-4" />
              {!collapsed && <span>{t("settings")}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
});
