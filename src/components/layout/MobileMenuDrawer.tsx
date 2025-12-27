/**
 * MobileMenuDrawer - Drawer with additional navigation links
 * Opens from "Menu" tab in bottom navigation
 */

import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Target,
  Trophy,
  Award,
  FileText,
  User,
  Activity,
  UserCircle,
  Settings,
  LogOut,
  HelpCircle,
  Shield,
} from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { cn } from "@/lib/utils";

interface MobileMenuDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  description?: string;
}

export const MobileMenuDrawer = memo(function MobileMenuDrawer({
  open,
  onOpenChange,
}: MobileMenuDrawerProps) {
  const { t } = useTranslation("navigation");
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  // Main menu items
  const mainItems: MenuItem[] = [
    { icon: Target, label: t("goals"), path: "/goals", description: "Track your fitness goals" },
    { icon: Trophy, label: t("challenges"), path: "/challenges", description: "Join team challenges" },
    { icon: Award, label: t("leaderboard"), path: "/leaderboard", description: "See rankings" },
  ];

  // Data items
  const dataItems: MenuItem[] = [
    { icon: FileText, label: t("medicalDocuments"), path: "/medical-documents" },
    { icon: User, label: t("body"), path: "/body" },
    { icon: Activity, label: t("fitnessData"), path: "/fitness-data" },
  ];

  // Settings items
  const settingsItems: MenuItem[] = [
    { icon: UserCircle, label: t("profile"), path: "/profile" },
    { icon: Settings, label: t("settings"), path: "/settings" },
  ];

  // Footer items
  const footerItems: MenuItem[] = [
    { icon: HelpCircle, label: t("about"), path: "/about" },
    { icon: Shield, label: t("privacyPolicy"), path: "/privacy-policy" },
  ];

  const renderMenuItem = (item: MenuItem) => (
    <button
      key={item.path}
      onClick={() => handleNavigate(item.path)}
      className={cn(
        "flex items-center gap-4 w-full px-4 py-3 rounded-xl",
        "hover:bg-accent/50 active:bg-accent transition-colors",
        "text-left"
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
        <item.icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground">{item.label}</p>
        {item.description && (
          <p className="text-sm text-muted-foreground truncate">{item.description}</p>
        )}
      </div>
    </button>
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left pb-2">
          <DrawerTitle className="text-xl font-semibold">{t("menu")}</DrawerTitle>
        </DrawerHeader>

        <div className="overflow-y-auto px-2 pb-8">
          {/* Main Items */}
          <div className="space-y-1">
            {mainItems.map(renderMenuItem)}
          </div>

          <Separator className="my-4" />

          {/* Data Items */}
          <p className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t("groups.data", "Data")}
          </p>
          <div className="space-y-1">
            {dataItems.map(renderMenuItem)}
          </div>

          <Separator className="my-4" />

          {/* Settings Items */}
          <div className="space-y-1">
            {settingsItems.map(renderMenuItem)}
          </div>

          <Separator className="my-4" />

          {/* Footer Items */}
          <div className="space-y-1">
            {footerItems.map(renderMenuItem)}
          </div>

          <Separator className="my-4" />

          {/* Language Selector */}
          <div className="px-4 py-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              {t("language", { ns: "common" })}
            </p>
            <LanguageSwitcher />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
});
