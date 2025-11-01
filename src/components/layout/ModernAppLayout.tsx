import { ReactNode, memo } from "react";
import { TopNavigation } from "@/components/navigation/TopNavigation";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { SafeProfileProvider } from "@/components/error/SafeProfileProvider";
import { MetricsViewProvider } from "@/contexts/MetricsViewContext";
import { useIsMobile } from "@/hooks/use-mobile";

interface ModernAppLayoutProps {
  children: ReactNode;
}

// 🔥 LAYOUT_SAFE_MODE: Bypass all providers/navigation for diagnosis
const LAYOUT_SAFE_MODE = false; // ✅ Navigation restored

export const ModernAppLayout = memo(function ModernAppLayout({ children }: ModernAppLayoutProps) {
  const isMobile = useIsMobile();
  console.log('🏗️ [ModernAppLayout] Rendering layout (SAFE_MODE:', LAYOUT_SAFE_MODE, ', isMobile:', isMobile, ')');
  
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
          <main className="flex-1 overflow-auto pt-16">
            {children}
          </main>
          {/* Bottom Navigation - Only on mobile */}
          {isMobile && <BottomNavigation />}
        </div>
      </MetricsViewProvider>
    </SafeProfileProvider>
  );
});