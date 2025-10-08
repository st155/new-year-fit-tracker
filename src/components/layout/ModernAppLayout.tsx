import { ReactNode, memo } from "react";
import { TopNavigation } from "@/components/navigation/TopNavigation";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { OnboardingTutorial } from "@/components/tutorial/OnboardingTutorial";

interface ModernAppLayoutProps {
  children: ReactNode;
}

export const ModernAppLayout = memo(function ModernAppLayout({ children }: ModernAppLayoutProps) {
  return (
    <ProfileProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <TopNavigation />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
        <OnboardingTutorial />
      </div>
    </ProfileProvider>
  );
});