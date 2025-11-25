import { useState } from "react";
import { SupplementsHeroSection } from "@/components/biostack/SupplementsHeroSection";
import { ProtocolGridCard } from "@/components/biostack/ProtocolGridCard";
import { ProtocolExpandModal } from "@/components/biostack/ProtocolExpandModal";
import { SecondaryNavigation } from "@/components/biostack/SecondaryNavigation";
import { LifecycleAlertsPanel } from "@/components/biostack/LifecycleAlertsPanel";
import { TheStackView } from "@/components/biostack/TheStackView";
import { CorrelationEngine } from "@/components/biostack/CorrelationEngine";
import { ProtocolMessageParser } from "@/components/supplements/ProtocolMessageParser";
import { ProtocolHistory } from "@/components/supplements/ProtocolHistory";
import { SupplementLibrary } from "@/components/biostack/SupplementLibrary";
import { useProtocolManagement } from "@/hooks/biostack/useProtocolManagement";
import { useAuth } from "@/hooks/useAuth";
import { useCheckCompletedProtocols } from "@/hooks/biostack";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type ViewMode = "dashboard" | "correlation" | "history" | "import" | "library";

export default function Supplements() {
  const { user } = useAuth();
  const { 
    activeProtocols, 
    toggleProtocolMutation, 
    deleteProtocolMutation,
    logProtocolItemMutation 
  } = useProtocolManagement();
  
  // Auto-check for completed protocols on mount
  useCheckCompletedProtocols();
  
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [expandedProtocol, setExpandedProtocol] = useState<any>(null);

  const handleTakeAll = (protocolId: string) => {
    const protocol = activeProtocols?.find(p => p.id === protocolId);
    if (!protocol?.protocol_items) return;
    
    protocol.protocol_items.forEach((item: any) => {
      logProtocolItemMutation.mutate({
        protocolItemId: item.id,
        servingsTaken: 1
      });
    });
    
    toast.success(`Logged all supplements from ${protocol.name}`);
  };

  const handleExpand = (protocolId: string) => {
    const protocol = activeProtocols?.find(p => p.id === protocolId);
    setExpandedProtocol(protocol);
  };

  const handleLogItem = (itemId: string, servingsTaken?: number) => {
    logProtocolItemMutation.mutate({
      protocolItemId: itemId,
      servingsTaken: servingsTaken || 1
    });
  };

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

          {/* Active Protocols Grid */}
          {activeProtocols && activeProtocols.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-500" />
                <h2 className="text-xl font-bold text-foreground">Active Protocols</h2>
                <span className="text-sm text-muted-foreground">({activeProtocols.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeProtocols.map((protocol) => (
                  <ProtocolGridCard
                    key={protocol.id}
                    protocol={protocol}
                    onToggleActive={(id) => toggleProtocolMutation.mutate(id)}
                    onDelete={(id) => deleteProtocolMutation.mutate(id)}
                    onTakeAll={handleTakeAll}
                    onExpand={handleExpand}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Manual Supplements Section */}
          <TheStackView />

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

      {/* Protocol Expand Modal */}
      <ProtocolExpandModal
        protocol={expandedProtocol}
        open={!!expandedProtocol}
        onClose={() => setExpandedProtocol(null)}
        onLogItem={handleLogItem}
      />
    </div>
  );
}
