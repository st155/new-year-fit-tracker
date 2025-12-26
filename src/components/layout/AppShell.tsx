/**
 * AppShell - Adaptive layout component for Desktop and Mobile
 * Desktop: SidebarLayout with DesktopSidebar
 * Mobile: MobileHeader + Content + BottomNavigation + SuperFAB
 */

import { ReactNode, memo } from "react";
import { useIsMobile } from "@/hooks/primitive";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DesktopSidebar } from "./DesktopSidebar";
import { MobileHeader } from "./MobileHeader";
import { MobileBottomNavNew } from "./MobileBottomNavNew";
import { SuperFAB } from "./SuperFAB";

interface AppShellProps {
  children: ReactNode;
}

export const AppShell = memo(function AppShell({ children }: AppShellProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    // Mobile Layout
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <MobileHeader />
        <main className="flex-1 pt-14 pb-20 overflow-auto">
          {children}
        </main>
        <MobileBottomNavNew />
        <SuperFAB />
      </div>
    );
  }

  // Desktop Layout
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <DesktopSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Desktop header with sidebar trigger */}
          <header className="h-14 flex items-center gap-4 border-b border-border/50 px-4 bg-card/50">
            <SidebarTrigger className="hover:bg-accent/50" />
            <div className="flex-1" />
            {/* Additional header content can go here */}
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
});
