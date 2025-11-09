import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMultiSourceBodyData } from "@/hooks/composite/data/useMultiSourceBodyData";
import { AnimatedPage } from "@/components/layout/AnimatedPage";
import { BodyDashboard } from "@/components/body/dashboard/BodyDashboard";
import { BodyReportsHub } from "@/components/body/reports/BodyReportsHub";
import { BodyTimeline } from "@/components/body/timeline/BodyTimeline";
import { Lazy3DModel } from "@/components/body-composition/Lazy3DModel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, FileText, Clock, Box } from "lucide-react";

export default function Body() {
  const { user } = useAuth();
  const { current, timeline, reports, sourceStats, sparklines, isLoading } = useMultiSourceBodyData(30);
  const [activeTab, setActiveTab] = useState("dashboard");

  const latestReport = reports?.[0];

  const handleReportChange = () => {
    // Refresh data when reports change
    window.location.reload();
  };

  return (
    <AnimatedPage className="container py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Body Composition</h1>
        <p className="text-muted-foreground">
          Multi-source body metrics tracking and analysis
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="reports">
            <FileText className="h-4 w-4 mr-2" />
            Body Reports
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <Clock className="h-4 w-4 mr-2" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="3d">
            <Box className="h-4 w-4 mr-2" />
            3D Model
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <BodyDashboard
            current={current}
            latestReport={latestReport}
            sourceStats={sourceStats}
            timeline={timeline}
            sparklines={sparklines}
            isLoading={isLoading}
            onUploadReport={() => setActiveTab("reports")}
            onViewReport={() => setActiveTab("reports")}
          />
        </TabsContent>

        <TabsContent value="reports">
          <BodyReportsHub onReportChange={handleReportChange} />
        </TabsContent>

        <TabsContent value="timeline">
          <BodyTimeline timeline={timeline} />
        </TabsContent>

        <TabsContent value="3d" className="space-y-6">
          <Lazy3DModel />
        </TabsContent>
      </Tabs>
    </AnimatedPage>
  );
}
