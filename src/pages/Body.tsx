import { useAuth } from "@/hooks/useAuth";
import { useBodyComposition } from "@/hooks/composite/data/useBodyComposition";
import { CurrentMetrics } from "@/components/body/CurrentMetrics";
import { BodyHistory } from "@/components/body/BodyHistory";
import { ComparisonView } from "@/components/body/ComparisonView";
import { InBodyUpload } from "@/components/body-composition/InBodyUpload";
import { InBodyHistory } from "@/components/body-composition/InBodyHistory";
import { Lazy3DModel } from "@/components/body-composition/Lazy3DModel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scale, History, GitCompare, FileText } from "lucide-react";
import { useRef } from "react";

export default function Body() {
  const { user } = useAuth();
  const { bodyData, trends, isLoading } = useBodyComposition({
    dateRange: {
      start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
    }
  });
  const inbodyHistoryRef = useRef<{ refresh: () => void }>(null);

  // Transform for legacy components
  const current = bodyData ? {
    weight: bodyData.weight,
    body_fat_percentage: bodyData.bodyFat,
    skeletal_muscle_mass: bodyData.muscleMass,
    measurement_date: bodyData.measurementDate,
  } : null;

  const history = Object.values(trends.weight || []).map((_, idx) => ({
    weight: trends.weight[idx]?.value || 0,
    body_fat_percentage: trends.bodyFat[idx]?.value || 0,
    skeletal_muscle_mass: trends.muscleMass[idx]?.value || 0,
    measurement_date: trends.weight[idx]?.date || '',
  }));

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
