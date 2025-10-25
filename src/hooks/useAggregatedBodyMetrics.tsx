import { useMemo } from 'react';
import { useBodyMetricsFromInBody } from './body/useBodyMetricsFromInBody';
import { useBodyMetricsFromWithings } from './body/useBodyMetricsFromWithings';
import { useBodyMetricsFromManual } from './body/useBodyMetricsFromManual';

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

export function useAggregatedBodyMetrics(userId?: string): AggregatedBodyMetrics {
  const inbodyMetrics = useBodyMetricsFromInBody(userId);
  const withingsMetrics = useBodyMetricsFromWithings(userId);
  const manualMetrics = useBodyMetricsFromManual(userId);

  // Memoize expensive computation
  return useMemo(() => {
    const metrics: AggregatedBodyMetrics = {};

    // Weight: InBody (if recent) → Withings → Manual
    if (inbodyMetrics?.weight && isRecent(inbodyMetrics.weight.date, 7)) {
      metrics.weight = inbodyMetrics.weight;
    } else if (withingsMetrics?.weight) {
      metrics.weight = withingsMetrics.weight;
    } else if (manualMetrics?.weight) {
      metrics.weight = manualMetrics.weight;
    }

    // Body Fat: Merge all sources, prioritize InBody
    const bodyFatSources = {
      ...(inbodyMetrics?.bodyFat?.sources || {}),
      ...(withingsMetrics?.bodyFat?.sources || {}),
      ...(manualMetrics?.bodyFat?.sources || {}),
    };

    if (inbodyMetrics?.bodyFat) {
      metrics.bodyFat = { ...inbodyMetrics.bodyFat, sources: bodyFatSources };
    } else if (withingsMetrics?.bodyFat) {
      metrics.bodyFat = { ...withingsMetrics.bodyFat, sources: bodyFatSources };
    } else if (manualMetrics?.bodyFat) {
      metrics.bodyFat = { ...manualMetrics.bodyFat, sources: bodyFatSources };
    }

    // Muscle Mass: InBody → Manual
    if (inbodyMetrics?.muscleMass) {
      metrics.muscleMass = inbodyMetrics.muscleMass;
    } else if (manualMetrics?.muscleMass) {
      metrics.muscleMass = manualMetrics.muscleMass;
    }

    // InBody-only metrics (memoized separately for performance)
    if (inbodyMetrics?.bmr) metrics.bmr = inbodyMetrics.bmr;
    if (inbodyMetrics?.visceralFat) metrics.visceralFat = inbodyMetrics.visceralFat;
    if (inbodyMetrics?.bodyWater) metrics.bodyWater = inbodyMetrics.bodyWater;
    if (inbodyMetrics?.protein) metrics.protein = inbodyMetrics.protein;
    if (inbodyMetrics?.minerals) metrics.minerals = inbodyMetrics.minerals;
    if (inbodyMetrics?.segmental) metrics.segmental = inbodyMetrics.segmental;

    return metrics;
  }, [inbodyMetrics, withingsMetrics, manualMetrics]);
}

// Helper function
function isRecent(dateStr: string, days: number): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= days;
}
