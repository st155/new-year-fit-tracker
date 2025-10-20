import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useInBodyAnalyses } from "./useInBodyAnalyses";
import { useBodyComposition } from "./useBodyComposition";

export interface MetricData {
  value: number;
  unit: string;
  source: 'inbody' | 'withings' | 'manual';
  date: string;
  trend?: number;
  trendPercent?: number;
  sparklineData?: { date: string; value: number }[];
  zone?: string;
  percentOfNorm?: number;
  sources?: {
    inbody?: { value: number; date: string; sparklineData: { date: string; value: number }[] };
    withings?: { value: number; date: string; sparklineData: { date: string; value: number }[] };
    manual?: { value: number; date: string; sparklineData: { date: string; value: number }[] };
  };
}

export interface SegmentalData {
  percent: number;
  mass: number;
  zone: 'low' | 'normal' | 'high';
}

export interface AggregatedBodyMetrics {
  weight?: MetricData;
  bodyFat?: MetricData;
  muscleMass?: MetricData;
  bmr?: MetricData;
  visceralFat?: MetricData;
  bodyWater?: MetricData;
  protein?: MetricData;
  minerals?: MetricData;
  segmental?: {
    rightArm?: SegmentalData;
    leftArm?: SegmentalData;
    trunk?: SegmentalData;
    rightLeg?: SegmentalData;
    leftLeg?: SegmentalData;
  };
}

export function useAggregatedBodyMetrics(userId?: string) {
  const { data: inbodyData } = useInBodyAnalyses(userId);
  const { current: manualCurrent, history: manualHistory } = useBodyComposition(userId);

  const { data: withingsData } = useQuery({
    queryKey: ["withings-metrics", userId],
    queryFn: async () => {
      if (!userId) return { weight: [], bodyFat: [] };

      // Fetch Withings weight data
      const { data: weightMetric } = await supabase
        .from("user_metrics")
        .select("id")
        .eq("user_id", userId)
        .eq("metric_name", "Weight")
        .eq("source", "withings")
        .maybeSingle();

      // Fetch Withings body fat data
      const { data: bodyFatMetric } = await supabase
        .from("user_metrics")
        .select("id")
        .eq("user_id", userId)
        .eq("metric_name", "Body Fat Percentage")
        .eq("source", "withings")
        .maybeSingle();

      const weight = weightMetric
        ? await supabase
            .from("metric_values")
            .select("value, measurement_date")
            .eq("metric_id", weightMetric.id)
            .order("measurement_date", { ascending: false })
            .limit(30)
        : { data: [] };

      const bodyFat = bodyFatMetric
        ? await supabase
            .from("metric_values")
            .select("value, measurement_date")
            .eq("metric_id", bodyFatMetric.id)
            .order("measurement_date", { ascending: false })
            .limit(30)
        : { data: [] };

      return {
        weight: weight.data || [],
        bodyFat: bodyFat.data || [],
      };
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });

  const aggregateMetrics = (): AggregatedBodyMetrics => {
    const metrics: AggregatedBodyMetrics = {};

    // Latest InBody data (highest priority for body fat)
    const latestInBody = inbodyData?.[0];

    // Helper to calculate trend
    const calculateTrend = (data: { value: number; measurement_date?: string; date?: string }[]) => {
      if (data.length < 2) return { trend: 0, trendPercent: 0 };
      const current = data[0].value;
      const previous = data[1].value;
      const trend = current - previous;
      const trendPercent = previous ? (trend / previous) * 100 : 0;
      return { trend, trendPercent };
    };

    // Helper to get zone for segment
    const getSegmentZone = (percent: number): 'low' | 'normal' | 'high' => {
      if (percent < 90) return 'low';
      if (percent <= 110) return 'normal';
      return 'high';
    };

    // Weight: InBody (last 7 days) → Withings → Manual
    if (latestInBody?.weight && isRecent(latestInBody.test_date, 7)) {
      const inbodyHistory = inbodyData?.slice(0, 30).map(d => ({ value: d.weight!, date: d.test_date })) || [];
      const trendData = calculateTrend(inbodyHistory);
      metrics.weight = {
        value: latestInBody.weight,
        unit: 'kg',
        source: 'inbody',
        date: latestInBody.test_date,
        ...trendData,
        sparklineData: inbodyHistory.map(d => ({ date: d.date.split('T')[0], value: d.value })),
      };
    } else if (withingsData?.weight?.[0]) {
      const trendData = calculateTrend(withingsData.weight);
      metrics.weight = {
        value: withingsData.weight[0].value,
        unit: 'kg',
        source: 'withings',
        date: withingsData.weight[0].measurement_date,
        ...trendData,
        sparklineData: withingsData.weight.map(d => ({ date: d.measurement_date, value: d.value })),
      };
    } else if (manualCurrent?.weight) {
      const manualWeights = manualHistory
        ?.filter(d => d.weight)
        .map(d => ({ value: d.weight!, measurement_date: d.measurement_date })) || [];
      const trendData = calculateTrend(manualWeights);
      metrics.weight = {
        value: manualCurrent.weight,
        unit: 'kg',
        source: 'manual',
        date: manualCurrent.measurement_date,
        ...trendData,
        sparklineData: manualWeights.slice(0, 30).map(d => ({ date: d.measurement_date, value: d.value })),
      };
    }

    // Body Fat %: Collect all sources and select primary
    const bodyFatSources: MetricData['sources'] = {};
    
    if (latestInBody?.percent_body_fat) {
      const inbodyHistory = inbodyData?.slice(0, 30).map(d => ({ value: d.percent_body_fat!, date: d.test_date })) || [];
      const sortedHistory = [...inbodyHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      bodyFatSources.inbody = {
        value: latestInBody.percent_body_fat,
        date: latestInBody.test_date,
        sparklineData: sortedHistory.map(d => ({ date: d.date.split('T')[0], value: d.value })),
      };
    }
    
    if (withingsData?.bodyFat?.[0]) {
      const sortedHistory = [...withingsData.bodyFat].sort((a, b) => 
        new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime()
      );
      bodyFatSources.withings = {
        value: withingsData.bodyFat[0].value,
        date: withingsData.bodyFat[0].measurement_date,
        sparklineData: sortedHistory.map(d => ({ date: d.measurement_date, value: d.value })),
      };
    }
    
    if (manualCurrent?.body_fat_percentage) {
      const manualBodyFat = manualHistory
        ?.filter(d => d.body_fat_percentage)
        .map(d => ({ value: d.body_fat_percentage!, measurement_date: d.measurement_date })) || [];
      const sortedHistory = [...manualBodyFat].sort((a, b) => 
        new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime()
      );
      bodyFatSources.manual = {
        value: manualCurrent.body_fat_percentage,
        date: manualCurrent.measurement_date,
        sparklineData: sortedHistory.slice(0, 30).map(d => ({ date: d.measurement_date, value: d.value })),
      };
    }
    
    // Set primary body fat (priority: InBody > Withings > Manual)
    if (bodyFatSources.inbody) {
      const trendData = calculateTrend(bodyFatSources.inbody.sparklineData.slice().reverse());
      metrics.bodyFat = {
        value: bodyFatSources.inbody.value,
        unit: '%',
        source: 'inbody',
        date: bodyFatSources.inbody.date,
        ...trendData,
        sparklineData: bodyFatSources.inbody.sparklineData,
        zone: getBodyFatZone(bodyFatSources.inbody.value),
        sources: bodyFatSources,
      };
    } else if (bodyFatSources.withings) {
      const trendData = calculateTrend(bodyFatSources.withings.sparklineData.slice().reverse());
      metrics.bodyFat = {
        value: bodyFatSources.withings.value,
        unit: '%',
        source: 'withings',
        date: bodyFatSources.withings.date,
        ...trendData,
        sparklineData: bodyFatSources.withings.sparklineData,
        zone: getBodyFatZone(bodyFatSources.withings.value),
        sources: bodyFatSources,
      };
    } else if (bodyFatSources.manual) {
      const trendData = calculateTrend(bodyFatSources.manual.sparklineData.slice().reverse());
      metrics.bodyFat = {
        value: bodyFatSources.manual.value,
        unit: '%',
        source: 'manual',
        date: bodyFatSources.manual.date,
        ...trendData,
        sparklineData: bodyFatSources.manual.sparklineData,
        zone: getBodyFatZone(bodyFatSources.manual.value),
        sources: bodyFatSources,
      };
    }

    // Muscle Mass: InBody → Manual
    if (latestInBody?.skeletal_muscle_mass) {
      const inbodyHistory = inbodyData?.slice(0, 30).map(d => ({ value: d.skeletal_muscle_mass!, date: d.test_date })) || [];
      const trendData = calculateTrend(inbodyHistory);
      metrics.muscleMass = {
        value: latestInBody.skeletal_muscle_mass,
        unit: 'kg',
        source: 'inbody',
        date: latestInBody.test_date,
        ...trendData,
        sparklineData: inbodyHistory.map(d => ({ date: d.date.split('T')[0], value: d.value })),
      };
    } else if (manualCurrent?.muscle_mass) {
      const manualMuscle = manualHistory
        ?.filter(d => d.muscle_mass)
        .map(d => ({ value: d.muscle_mass!, measurement_date: d.measurement_date })) || [];
      const trendData = calculateTrend(manualMuscle);
      metrics.muscleMass = {
        value: manualCurrent.muscle_mass,
        unit: 'kg',
        source: 'manual',
        date: manualCurrent.measurement_date,
        ...trendData,
        sparklineData: manualMuscle.slice(0, 30).map(d => ({ date: d.measurement_date, value: d.value })),
      };
    }

    // InBody-only metrics
    if (latestInBody) {
      if (latestInBody.bmr) {
        metrics.bmr = {
          value: latestInBody.bmr,
          unit: 'kcal/day',
          source: 'inbody',
          date: latestInBody.test_date,
        };
      }

      if (latestInBody.visceral_fat_area) {
        metrics.visceralFat = {
          value: latestInBody.visceral_fat_area,
          unit: 'cm²',
          source: 'inbody',
          date: latestInBody.test_date,
          zone: getVisceralFatZone(latestInBody.visceral_fat_area),
        };
      }

      if (latestInBody.total_body_water) {
        metrics.bodyWater = {
          value: latestInBody.total_body_water,
          unit: 'L',
          source: 'inbody',
          date: latestInBody.test_date,
        };
      }

      if (latestInBody.protein) {
        metrics.protein = {
          value: latestInBody.protein,
          unit: 'kg',
          source: 'inbody',
          date: latestInBody.test_date,
        };
      }

      if (latestInBody.minerals) {
        metrics.minerals = {
          value: latestInBody.minerals,
          unit: 'kg',
          source: 'inbody',
          date: latestInBody.test_date,
        };
      }

      // Segmental analysis
      if (latestInBody.right_arm_percent) {
        metrics.segmental = {
          rightArm: {
            percent: latestInBody.right_arm_percent,
            mass: latestInBody.right_arm_mass || 0,
            zone: getSegmentZone(latestInBody.right_arm_percent),
          },
          leftArm: latestInBody.left_arm_percent ? {
            percent: latestInBody.left_arm_percent,
            mass: latestInBody.left_arm_mass || 0,
            zone: getSegmentZone(latestInBody.left_arm_percent),
          } : undefined,
          trunk: latestInBody.trunk_percent ? {
            percent: latestInBody.trunk_percent,
            mass: latestInBody.trunk_mass || 0,
            zone: getSegmentZone(latestInBody.trunk_percent),
          } : undefined,
          rightLeg: latestInBody.right_leg_percent ? {
            percent: latestInBody.right_leg_percent,
            mass: latestInBody.right_leg_mass || 0,
            zone: getSegmentZone(latestInBody.right_leg_percent),
          } : undefined,
          leftLeg: latestInBody.left_leg_percent ? {
            percent: latestInBody.left_leg_percent,
            mass: latestInBody.left_leg_mass || 0,
            zone: getSegmentZone(latestInBody.left_leg_percent),
          } : undefined,
        };
      }
    }

    return metrics;
  };

  return aggregateMetrics();
}

// Helper functions
function isRecent(dateStr: string, days: number): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= days;
}

function getBodyFatZone(percent: number): string {
  if (percent <= 13) return 'athlete';
  if (percent <= 17) return 'optimal';
  if (percent <= 24) return 'average';
  return 'high';
}

function getVisceralFatZone(area: number): string {
  if (area < 100) return 'healthy';
  if (area < 150) return 'elevated';
  return 'high';
}
