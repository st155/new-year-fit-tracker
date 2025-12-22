import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
import { useNewLabAlerts } from "@/hooks/biostack/useNewLabAlerts";

type ViewMode = "dashboard" | "correlation" | "history" | "import" | "library";

// Map URL tab params to ViewMode
const tabToViewMode: Record<string, ViewMode> = {
  protocols: "history",
  history: "history",
  correlation: "correlation",
  import: "import",
  library: "library",
  dashboard: "dashboard",
};

export default function Supplements() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  
  // Auto-check for completed protocols on mount
  useCheckCompletedProtocols();
  
  // Monitor new lab alerts for linked biomarkers
  useNewLabAlerts();
  
  // Initialize viewMode from URL tab param
  const tabParam = searchParams.get("tab");
  const initialViewMode = tabParam && tabToViewMode[tabParam] ? tabToViewMode[tabParam] : "dashboard";
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  
  // Sync viewMode with URL changes
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && tabToViewMode[tab]) {
      setViewMode(tabToViewMode[tab]);
    }
  }, [searchParams]);

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
          <SupplementsHeroSection onActiveProtocolsClick={() => setViewMode("history")} />

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
