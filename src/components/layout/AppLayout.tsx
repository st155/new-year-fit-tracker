import { ReactNode } from "react";
import { MainNavigation } from "@/components/navigation/MainNavigation";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <MainNavigation />
      <Breadcrumbs />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}