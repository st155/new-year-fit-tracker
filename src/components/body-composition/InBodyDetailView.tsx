import { format } from "date-fns";
import { User, Bell, Activity, Dumbbell, Heart } from "lucide-react";
import { MetricCard } from "./MetricCard";
import { CircularProgress } from "./CircularProgress";
import { WaveChart } from "./WaveChart";
import { HumanBodyModel } from "./HumanBodyModel";
import { InBodyAIChat } from "./InBodyAIChat";
import { InBodyProgressChart } from "./InBodyProgressChart";
import { InBodyInsights } from "./InBodyInsights";
import { Button } from "@/components/ui/button";
import {
  calculateMetricChange,
  getBMIStatus,
  getBodyFatStatus,
  getVisceralFatStatus,
  getSegmentStatus
} from "@/lib/inbody-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useInBodyAnalyses } from "@/hooks/useInBodyAnalyses";
import { useAuth } from "@/hooks/useAuth";

interface InBodyAnalysis {
  id: string;
  test_date: string;
  weight: number | null;
  skeletal_muscle_mass: number | null;
  body_fat_mass: number | null;
  percent_body_fat: number | null;
  bmi: number | null;
  visceral_fat_area: number | null;
  bmr: number | null;
  total_body_water: number | null;
  protein: number | null;
  minerals: number | null;
  right_arm_percent: number | null;
  left_arm_percent: number | null;
  trunk_percent: number | null;
  right_leg_percent: number | null;
  left_leg_percent: number | null;
  ai_summary: string | null;
  ai_insights: string[] | null;
}

interface InBodyDetailViewProps {
  analysis: InBodyAnalysis;
  previousAnalysis?: InBodyAnalysis;
  onClose?: () => void;
}

export function InBodyDetailView({ analysis, previousAnalysis, onClose }: InBodyDetailViewProps) {
  const { user } = useAuth();
  const { data: allAnalyses = [] } = useInBodyAnalyses(user?.id);
  
  const weightChange = calculateMetricChange(analysis.weight, previousAnalysis?.weight ?? null);
  const smmChange = calculateMetricChange(analysis.skeletal_muscle_mass, previousAnalysis?.skeletal_muscle_mass ?? null);
  const bfmChange = calculateMetricChange(analysis.body_fat_mass, previousAnalysis?.body_fat_mass ?? null);
  
  const bmiStatus = getBMIStatus(analysis.bmi);
  const bodyFatStatus = getBodyFatStatus(analysis.percent_body_fat);
  const visceralFatStatus = getVisceralFatStatus(analysis.visceral_fat_area);

  const segmentData = {
    rightArmPercent: analysis.right_arm_percent,
    leftArmPercent: analysis.left_arm_percent,
    trunkPercent: analysis.trunk_percent,
    rightLegPercent: analysis.right_leg_percent,
    leftLegPercent: analysis.left_leg_percent,
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="inbody-card p-6 neon-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold metric-glow">INBODY SCAN</h1>
              <p className="text-sm text-muted-foreground">
                {format(new Date(analysis.test_date), 'MMMM dd, yyyy').toUpperCase()}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
            <Bell className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* AI Summary Section */}
      {analysis.ai_summary && (
        <div className="inbody-card p-6 neon-border">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold metric-glow">AI АНАЛИЗ</h2>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            {analysis.ai_summary}
          </p>
          
          {analysis.ai_insights && analysis.ai_insights.length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-semibold text-primary">Ключевые выводы:</h3>
              <ul className="space-y-2">
                {analysis.ai_insights.map((insight, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-sm text-muted-foreground">{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Body Composition Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Weight"
          value={weightChange?.value ?? 0}
          unit="KG"
          change={weightChange?.change}
          trend={weightChange?.trend}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Skeletal Muscle Mass"
          value={smmChange?.value ?? 0}
          unit="KG"
          change={smmChange?.change}
          trend={smmChange?.trend}
          icon={<Dumbbell className="h-5 w-5" />}
        />
        <MetricCard
          title="Body Fat Mass"
          value={bfmChange?.value ?? 0}
          unit="KG"
          change={bfmChange?.change}
          trend={bfmChange?.trend}
          icon={<Heart className="h-5 w-5" />}
        />
      </div>

      {/* 3D Body Model & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3D Model */}
        <div className="lg:col-span-2 inbody-card overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h2 className="text-lg font-semibold metric-glow">SEGMENTAL ANALYSIS</h2>
            <p className="text-xs text-muted-foreground mt-1">Muscle mass distribution</p>
          </div>
          <HumanBodyModel segmentData={segmentData} />
          
          {/* Segment Details */}
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3 border-t border-white/10">
            <SegmentDetail label="Right Arm" percent={analysis.right_arm_percent} />
            <SegmentDetail label="Left Arm" percent={analysis.left_arm_percent} />
            <SegmentDetail label="Trunk" percent={analysis.trunk_percent} />
            <SegmentDetail label="Right Leg" percent={analysis.right_leg_percent} />
            <SegmentDetail label="Left Leg" percent={analysis.left_leg_percent} />
          </div>
        </div>

        {/* Vital Stats */}
        <div className="space-y-4">
          <MetricCard title="BMI" className="h-fit">
            <CircularProgress
              value={analysis.bmi ?? 0}
              max={40}
              label={bmiStatus.label}
            />
          </MetricCard>

          <MetricCard title="Body Fat %" className="h-fit">
            <WaveChart
              value={analysis.percent_body_fat ?? 0}
              status={bodyFatStatus.label}
              statusColor={bodyFatStatus.color}
            />
          </MetricCard>

          <MetricCard title="Visceral Fat" className="h-fit">
            <WaveChart
              value={analysis.visceral_fat_area ?? 0}
              status={visceralFatStatus.label}
              statusColor={visceralFatStatus.color}
            />
          </MetricCard>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Body Water"
          value={analysis.total_body_water ?? 0}
          unit="L"
        />
        <MetricCard
          title="Protein"
          value={analysis.protein ?? 0}
          unit="KG"
        />
        <MetricCard
          title="Minerals"
          value={analysis.minerals ?? 0}
          unit="KG"
        />
        <MetricCard
          title="Basal Metabolic Rate"
          value={analysis.bmr ?? 0}
          unit="kcal"
        />
      </div>

      {/* Insights Section */}
      <div className="inbody-card p-6 neon-border">
        <InBodyInsights
          bmi={analysis.bmi}
          bodyFatPercent={analysis.percent_body_fat}
          visceralFat={analysis.visceral_fat_area}
          bmr={analysis.bmr}
          rightArmPercent={analysis.right_arm_percent}
          leftArmPercent={analysis.left_arm_percent}
        />
      </div>

      {/* Progress Charts - only show if multiple analyses */}
      {allAnalyses.length > 1 && (
        <div className="inbody-card p-6 neon-border">
          <InBodyProgressChart analyses={allAnalyses} />
        </div>
      )}

      {/* AI Chat Section */}
      <div className="inbody-card p-6 neon-border">
        <InBodyAIChat analysisId={analysis.id} />
      </div>
    </div>
  );
}

function SegmentDetail({ label, percent }: { label: string; percent: number | null }) {
  const status = getSegmentStatus(percent);
  
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">{percent?.toFixed(1) ?? 'N/A'}%</span>
      <span className={`text-xs font-semibold ${status.color}`}>{status.label}</span>
    </div>
  );
}

export function InBodyDetailViewSkeleton() {
  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-6 space-y-6">
      <Skeleton className="h-24 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
