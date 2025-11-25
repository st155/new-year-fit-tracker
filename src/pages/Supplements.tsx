import { useState } from "react";
import { SupplementsHeroSection } from "@/components/biostack/SupplementsHeroSection";
import { SecondaryNavigation } from "@/components/biostack/SecondaryNavigation";
import { LifecycleAlertsPanel } from "@/components/biostack/LifecycleAlertsPanel";
import { TodaysSupplements } from "@/components/biostack/TodaysSupplements";
import { CorrelationEngine } from "@/components/biostack/CorrelationEngine";
import { ProtocolMessageParser } from "@/components/supplements/ProtocolMessageParser";
import { ProtocolHistory } from "@/components/supplements/ProtocolHistory";
import { SupplementLibrary } from "@/components/biostack/SupplementLibrary";
import { useAuth } from "@/hooks/useAuth";
import { useCheckCompletedProtocols } from "@/hooks/biostack";

type ViewMode = "dashboard" | "correlation" | "history" | "import" | "library";

export default function Supplements() {
  const { user } = useAuth();
  
  // Auto-check for completed protocols on mount
  useCheckCompletedProtocols();
  
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Protocol Lifecycle Alerts */}
      {user?.id && <LifecycleAlertsPanel userId={user.id} />}
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          BioStack V3.0
        </h1>
        <p className="text-muted-foreground">
          Your biohacking correlation engine - Track what works, optimize what doesn't
        </p>
      </div>

      {/* Conditional Content based on viewMode */}
      {viewMode === "dashboard" && (
        <>
          {/* Hero Section with Metrics */}
          <SupplementsHeroSection />

          {/* Unified Today's Supplements View */}
          <TodaysSupplements />

          {/* Secondary Navigation */}
          <SecondaryNavigation
            onCorrelationEngine={() => setViewMode("correlation")}
            onHistory={() => setViewMode("history")}
            onImportProtocol={() => setViewMode("import")}
            onLibrary={() => setViewMode("library")}
          />
        </>
      )}

      {viewMode === "library" && (
        <div className="space-y-4">
          <SupplementLibrary />
          <SecondaryNavigation
            onCorrelationEngine={() => setViewMode("correlation")}
            onHistory={() => setViewMode("history")}
            onImportProtocol={() => setViewMode("import")}
            onLibrary={() => setViewMode("dashboard")}
          />
        </div>
      )}

      {viewMode === "correlation" && (
        <div className="space-y-4">
          <CorrelationEngine />
          <SecondaryNavigation
            onCorrelationEngine={() => setViewMode("dashboard")}
            onHistory={() => setViewMode("history")}
            onImportProtocol={() => setViewMode("import")}
            onLibrary={() => setViewMode("library")}
          />
        </div>
      )}

      {viewMode === "history" && (
        <div className="space-y-4">
          <ProtocolHistory />
          <SecondaryNavigation
            onCorrelationEngine={() => setViewMode("correlation")}
            onHistory={() => setViewMode("dashboard")}
            onImportProtocol={() => setViewMode("import")}
            onLibrary={() => setViewMode("library")}
          />
        </div>
      )}

      {viewMode === "import" && (
        <div className="space-y-4">
          <ProtocolMessageParser onProtocolCreated={() => setViewMode("dashboard")} />
          <SecondaryNavigation
            onCorrelationEngine={() => setViewMode("correlation")}
            onHistory={() => setViewMode("history")}
            onImportProtocol={() => setViewMode("dashboard")}
            onLibrary={() => setViewMode("library")}
          />
        </div>
      )}
    </div>
  );
}
