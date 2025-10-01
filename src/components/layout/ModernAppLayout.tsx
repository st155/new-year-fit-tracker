import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TopNavigation } from "@/components/navigation/TopNavigation";

interface ModernAppLayoutProps {
  children: ReactNode;
}

export function ModernAppLayout({ children }: ModernAppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <TopNavigation />
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}