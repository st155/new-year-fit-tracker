import { ReactNode, memo } from "react";
import { TopNavigation } from "@/components/navigation/TopNavigation";
import { SafeProfileProvider } from "@/components/error/SafeProfileProvider";
import { MetricsViewProvider } from "@/contexts/MetricsViewContext";
import { LAYOUT_SAFE_MODE } from "@/lib/safe-flags";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";

interface ModernAppLayoutProps {
  children: ReactNode;
}

export const ModernAppLayout = memo(function ModernAppLayout({ children }: ModernAppLayoutProps) {
  console.log('🏗️ [ModernAppLayout] Rendering layout (SAFE_MODE:', LAYOUT_SAFE_MODE, ')');
  
  if (LAYOUT_SAFE_MODE) {
    return (
      <div className="min-h-screen flex flex-col w-full bg-background">
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    );
  }
  
  return (
    <SafeProfileProvider>
      <MetricsViewProvider>
        <div className="min-h-screen flex flex-col w-full bg-background">
          <TopNavigation />
          <main className="flex-1 overflow-auto pt-16 pb-20 md:pb-4">
            {children}
          </main>
          <MobileBottomNav />
        </div>
      </MetricsViewProvider>
    </SafeProfileProvider>
  );
});