import { ReactNode } from "react";
import { MainNavigation } from "@/components/navigation/MainNavigation";
import { EnhancedBreadcrumbs } from "@/components/navigation/EnhancedBreadcrumbs";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <MainNavigation />
      <EnhancedBreadcrumbs />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}