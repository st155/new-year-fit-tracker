import { ReactNode, memo } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TopNavigation } from "@/components/navigation/TopNavigation";
import { ProfileProvider } from "@/contexts/ProfileContext";

interface ModernAppLayoutProps {
  children: ReactNode;
}

export const ModernAppLayout = memo(function ModernAppLayout({ children }: ModernAppLayoutProps) {
  return (
    <ProfileProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <main className="flex-1 overflow-auto">
            <TopNavigation />
            {children}
          </main>
        </div>
      </SidebarProvider>
    </ProfileProvider>
  );
});