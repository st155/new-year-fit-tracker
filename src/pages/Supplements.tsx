import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, History, TrendingUp } from "lucide-react";
import { TheStackView } from "@/components/biostack/TheStackView";
import { CorrelationEngine } from "@/components/biostack/CorrelationEngine";

export default function Supplements() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          BioStack V3.0
        </h1>
        <p className="text-muted-foreground">
          Your biohacking correlation engine - Track what works, optimize what doesn't
        </p>
      </div>

      <Tabs defaultValue="stack" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="stack" className="gap-2">
            <Activity className="h-4 w-4" />
            The Stack
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

        <TabsContent value="correlation">
          <CorrelationEngine />
        </TabsContent>

        <TabsContent value="history">
          <div className="text-center py-12 text-muted-foreground">
            History tab - coming soon
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
