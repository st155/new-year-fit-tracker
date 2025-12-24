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

    // Body Fat: Get MINIMUM value from last 30 days across all sources
    const bodyFatSources = {
      ...(inbodyMetrics?.bodyFat?.sources || {}),
      ...(withingsMetrics?.bodyFat?.sources || {}),
      ...(manualMetrics?.bodyFat?.sources || {}),
    };

    // Collect all body fat readings from all sources
    const allBodyFatReadings: { value: number; date: string; source: 'inbody' | 'withings' | 'manual'; metric: MetricData }[] = [];
    
    if (inbodyMetrics?.bodyFat && isRecent(inbodyMetrics.bodyFat.date, 30)) {
      allBodyFatReadings.push({
        value: inbodyMetrics.bodyFat.value,
        date: inbodyMetrics.bodyFat.date,
        source: 'inbody',
        metric: inbodyMetrics.bodyFat
      });
    }
    if (withingsMetrics?.bodyFat && isRecent(withingsMetrics.bodyFat.date, 30)) {
      allBodyFatReadings.push({
        value: withingsMetrics.bodyFat.value,
        date: withingsMetrics.bodyFat.date,
        source: 'withings',
        metric: withingsMetrics.bodyFat
      });
    }
    if (manualMetrics?.bodyFat && isRecent(manualMetrics.bodyFat.date, 30)) {
      allBodyFatReadings.push({
        value: manualMetrics.bodyFat.value,
        date: manualMetrics.bodyFat.date,
        source: 'manual',
        metric: manualMetrics.bodyFat
      });
    }

    // Find the minimum body fat value
    if (allBodyFatReadings.length > 0) {
      const minReading = allBodyFatReadings.reduce((min, curr) => 
        curr.value < min.value ? curr : min
      );
      metrics.bodyFat = { 
        ...minReading.metric, 
        value: minReading.value,
        date: minReading.date,
        source: minReading.source,
        sources: bodyFatSources 
      };
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
