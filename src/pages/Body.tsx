import { useAuth } from "@/hooks/useAuth";
import { useBodyComposition } from "@/hooks/composite/data/useBodyComposition";
import { CurrentMetrics } from "@/components/body/CurrentMetrics";
import { BodyHistory } from "@/components/body/BodyHistory";
import { ComparisonView } from "@/components/body/ComparisonView";
import { InBodyUpload } from "@/components/body-composition/InBodyUpload";
import { InBodyHistory } from "@/components/body-composition/InBodyHistory";
import { Lazy3DModel } from "@/components/body-composition/Lazy3DModel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Scale, History, GitCompare, FileText, Sparkles } from "lucide-react";
import { useRef } from "react";
import { useDataQuality } from "@/hooks/useDataQuality";

export default function Body() {
  const { user } = useAuth();
  const { bodyData, trends, isLoading } = useBodyComposition({
    dateRange: {
      start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
    }
  });
  const inbodyHistoryRef = useRef<{ refresh: () => void }>(null);
  
  // Get data quality for body composition metrics
  const { averageConfidence, metricsByQuality } = useDataQuality([
    'Weight',
    'Body Fat %',
    'Skeletal Muscle Mass',
    'BMR'
  ]);

  // Transform for legacy components
  const current = bodyData ? {
    weight: bodyData.weight,
    body_fat_percentage: bodyData.bodyFat,
    skeletal_muscle_mass: bodyData.muscleMass,
    measurement_date: bodyData.measurementDate,
  } : null;

  // Safe history construction - handle null/undefined trends
  const weightSeries = trends?.weight ?? [];
  const bodyFatSeries = trends?.bodyFat ?? [];
  const muscleSeries = trends?.muscleMass ?? [];

  // Choose base series for iteration: weight -> bodyFat -> muscleMass
  const baseSeries =
    weightSeries.length ? weightSeries :
    (bodyFatSeries.length ? bodyFatSeries : muscleSeries);

  const history = baseSeries
    .map((_, idx) => {
      const w = weightSeries[idx];
      const bf = bodyFatSeries[idx];
      const mm = muscleSeries[idx];

      return {
        weight: typeof w?.value === 'number' ? w.value : undefined,
        body_fat_percentage: typeof bf?.value === 'number' ? bf.value : undefined,
        skeletal_muscle_mass: typeof mm?.value === 'number' ? mm.value : undefined,
        measurement_date: (w?.date || bf?.date || mm?.date) ?? '',
      };
    })
    .filter(entry =>
      entry.measurement_date &&
      (
        typeof entry.weight === 'number' ||
        typeof entry.body_fat_percentage === 'number' ||
        typeof entry.skeletal_muscle_mass === 'number'
      )
    );

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Body Composition</h1>
        <p className="text-muted-foreground">Track your body metrics and progress</p>
      </div>

      {/* Data Quality Summary for Body Composition */}
      {averageConfidence > 0 && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Body Composition Data Quality
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Overall Quality</span>
                <span className="text-lg font-bold text-primary">
                  {averageConfidence.toFixed(0)}%
                </span>
              </div>
              <Progress value={averageConfidence} className="h-2" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {metricsByQuality.excellent.length > 0 && (
                <Badge variant="default" className="gap-1">
                  ✓ {metricsByQuality.excellent.length} Excellent
                </Badge>
              )}
              {metricsByQuality.good.length > 0 && (
                <Badge variant="outline" className="gap-1">
                  {metricsByQuality.good.length} Good
                </Badge>
              )}
              {metricsByQuality.poor.length > 0 && (
                <Badge variant="destructive" className="gap-1">
                  ⚠ {metricsByQuality.poor.length} Poor Quality
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
