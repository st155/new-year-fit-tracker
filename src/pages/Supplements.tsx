import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, History, TrendingUp, FileText } from "lucide-react";
import { TheStackView } from "@/components/biostack/TheStackView";
import { CorrelationEngine } from "@/components/biostack/CorrelationEngine";
import { LifecycleAlertsPanel } from "@/components/biostack/LifecycleAlertsPanel";
import { ProtocolMessageParser } from "@/components/supplements/ProtocolMessageParser";
import { ProtocolHistory } from "@/components/supplements/ProtocolHistory";
import { useAuth } from "@/hooks/useAuth";

export default function Supplements() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("stack");
  
  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Protocol Lifecycle Alerts */}
      {user?.id && <LifecycleAlertsPanel userId={user.id} />}
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          BioStack V3.0
        </h1>
        <p className="text-muted-foreground">
          Your biohacking correlation engine - Track what works, optimize what doesn't
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="stack" className="gap-2">
            <Activity className="h-4 w-4" />
            The Stack
          </TabsTrigger>
          <TabsTrigger value="import" className="gap-2">
            <FileText className="h-4 w-4" />
            Import Protocol
          </TabsTrigger>
          <TabsTrigger value="correlation" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Correlation Engine
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stack">
          <TheStackView />
        </TabsContent>

        <TabsContent value="import">
          <ProtocolMessageParser onProtocolCreated={() => setActiveTab("stack")} />
        </TabsContent>

        <TabsContent value="correlation">
          <CorrelationEngine />
        </TabsContent>

        <TabsContent value="history">
          <ProtocolHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
