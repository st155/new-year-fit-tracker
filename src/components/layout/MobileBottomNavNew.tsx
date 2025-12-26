/**
 * MobileBottomNavNew - Bottom navigation with 4 tabs + FAB slot
 * Tabs: Home, My Plan, [FAB], Trends, Menu
 */

import { memo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, ClipboardList, TrendingUp, Grid3X3 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MobileMenuDrawer } from "./MobileMenuDrawer";

interface NavTab {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path?: string;
  action?: "openDrawer";
}

export const MobileBottomNavNew = memo(function MobileBottomNavNew() {
  const { t } = useTranslation("navigation");
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const tabs: NavTab[] = [
    { icon: Home, label: t("home"), path: "/dashboard" },
    { icon: ClipboardList, label: t("myPlan", "My Plan"), path: "/my-plan" },
    // FAB slot is in the center (handled by SuperFAB component)
    { icon: TrendingUp, label: t("trends", "Trends"), path: "/progress" },
    { icon: Grid3X3, label: t("menu"), action: "openDrawer" },
  ];

  const isActive = (path?: string) => {
    if (!path) return false;
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const handleTabClick = (tab: NavTab) => {
    if (tab.action === "openDrawer") {
      setDrawerOpen(true);
    } else if (tab.path) {
      navigate(tab.path);
    }
  };

  return (
    <>
      <motion.nav
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={cn(
          "fixed bottom-0 inset-x-0 z-40",
          "h-16 bg-card/95 backdrop-blur-md",
          "border-t border-border/50",
          "safe-area-pb"
        )}
      >
        <div className="flex items-center justify-around h-full max-w-screen-sm mx-auto px-2">
          {/* First two tabs */}
          {tabs.slice(0, 2).map((tab) => (
            <TabButton
              key={tab.label}
              tab={tab}
              isActive={isActive(tab.path)}
              onClick={() => handleTabClick(tab)}
            />
          ))}

          {/* FAB spacer */}
          <div className="w-16" />

          {/* Last two tabs */}
          {tabs.slice(2).map((tab) => (
            <TabButton
              key={tab.label}
              tab={tab}
              isActive={isActive(tab.path)}
              onClick={() => handleTabClick(tab)}
            />
          ))}
        </div>
      </motion.nav>

      <MobileMenuDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
});

// Tab Button Component
interface TabButtonProps {
  tab: NavTab;
  isActive: boolean;
  onClick: () => void;
}

const TabButton = memo(function TabButton({ tab, isActive, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5",
        "w-16 h-full",
        "transition-colors",
        "focus:outline-none",
        isActive ? "text-primary" : "text-muted-foreground"
      )}
    >
      <div className="relative">
        <tab.icon className={cn("h-5 w-5", isActive && "scale-110")} />
        {isActive && (
          <motion.div
            layoutId="activeTab"
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
          />
        )}
      </div>
      <span className={cn("text-[10px] font-medium", isActive && "font-semibold")}>
        {tab.label}
      </span>
    </button>
  );
});
