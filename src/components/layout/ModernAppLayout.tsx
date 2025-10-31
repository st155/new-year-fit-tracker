import { ReactNode, memo } from "react";
import { TopNavigation } from "@/components/navigation/TopNavigation";
import { SafeProfileProvider } from "@/components/error/SafeProfileProvider";
import { MetricsViewProvider } from "@/contexts/MetricsViewContext";

interface ModernAppLayoutProps {
  children: ReactNode;
}

// 🔥 LAYOUT_SAFE_MODE: Bypass all providers/navigation for diagnosis
const LAYOUT_SAFE_MODE = true; // 🔍 Diagnostic mode enabled

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
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </MetricsViewProvider>
    </SafeProfileProvider>
  );
});