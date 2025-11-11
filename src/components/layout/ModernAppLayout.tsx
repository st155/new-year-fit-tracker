import { ReactNode, memo } from "react";
import { TopNavigation } from "@/components/navigation/TopNavigation";
import { SafeProfileProvider } from "@/components/error/SafeProfileProvider";
import { MetricsViewProvider } from "@/contexts/MetricsViewContext";
import { LAYOUT_SAFE_MODE } from "@/lib/safe-flags";

import { CommandPalette } from "@/components/ui/command-palette";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import { ShortcutsHintPanel } from "@/components/ui/shortcuts-hint-panel";
import { useState, useEffect } from "react";

interface ModernAppLayoutProps {
  children: ReactNode;
}

export const ModernAppLayout = memo(function ModernAppLayout({ children }: ModernAppLayoutProps) {
  console.log('🏗️ [ModernAppLayout] Rendering layout (SAFE_MODE:', LAYOUT_SAFE_MODE, ')');
  const { open, setOpen } = useCommandPalette();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Listen for '?' key to show shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !open) {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);
  
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
          <main className="flex-1 overflow-auto pt-16 md:pb-4">
            {children}
          </main>
          <CommandPalette open={open} onOpenChange={setOpen} />
          <ShortcutsHintPanel open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
        </div>
      </MetricsViewProvider>
    </SafeProfileProvider>
  );
});