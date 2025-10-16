import { useAuth } from "@/hooks/useAuth";
import { useBodyComposition } from "@/hooks/useBodyComposition";
import { CurrentMetrics } from "@/components/body/CurrentMetrics";
import { BodyHistory } from "@/components/body/BodyHistory";
import { ComparisonView } from "@/components/body/ComparisonView";
import { InBodyUpload } from "@/components/body-composition/InBodyUpload";
import { InBodyHistory } from "@/components/body-composition/InBodyHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scale, History, GitCompare, FileText } from "lucide-react";
import { useRef } from "react";

export default function Body() {
  const { user } = useAuth();
  const { current, history, isLoading } = useBodyComposition(user?.id);
  const inbodyHistoryRef = useRef<{ refresh: () => void }>(null);

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Body Composition</h1>
        <p className="text-muted-foreground">Track your body metrics and progress</p>
      </div>

      <Tabs defaultValue="current" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="current">
            <Scale className="h-4 w-4 mr-2" />
            Current
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
          <TabsTrigger value="comparison">
            <GitCompare className="h-4 w-4 mr-2" />
            Compare
          </TabsTrigger>
          <TabsTrigger value="inbody">
            <FileText className="h-4 w-4 mr-2" />
            InBody
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current">
          <CurrentMetrics current={current} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="history">
          <BodyHistory history={history} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="comparison">
          <ComparisonView history={history} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="inbody" className="space-y-6">
          <InBodyUpload onUploadSuccess={() => inbodyHistoryRef.current?.refresh()} />
          <InBodyHistory ref={inbodyHistoryRef} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
