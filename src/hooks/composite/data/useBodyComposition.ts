import { useMemo } from 'react';
import { useMetrics } from './useMetrics';
import { useInBodyAnalyses } from '@/hooks/useInBodyAnalyses';
import { synthesizeSegmentalData } from '@/lib/body-synthesis';
import type { DateRange } from '@/types/metrics';
import { useAuth } from '@/hooks/useAuth';

/**
 * COMPOSITE: Body composition data + 3D synthesis
 * 
 * Replaces:
 * - useAggregatedBodyMetrics
 * - useEnhancedBodyModel
 * - useBodyMetricsFromInBody
 * - useBodyMetricsFromWithings
 * - useBodyMetricsFromManual
 * 
 * Usage:
 * ```tsx
 * const { bodyData, model3D, hasData } = useBodyComposition();
 * ```
 */

export interface BodyCompositionData {
  weight: number;
  bodyFat: number;
  muscleMass: number;
  bmi: number;
  bmr?: number;
  visceralFat?: number;
  bodyWater?: number;
  protein?: number;
  minerals?: number;
  measurementDate: string;
  source: string;
}

export interface Body3DModel {
  segmental: {
    rightArm: { percent: number; mass: number };
    leftArm: { percent: number; mass: number };
    trunk: { percent: number; mass: number };
    rightLeg: { percent: number; mass: number };
    leftLeg: { percent: number; mass: number };
  };
  symmetryScore: number;
}

export function useBodyComposition(options?: { dateRange?: DateRange }) {
  const { user } = useAuth();
  
  const bodyMetricTypes = [
    'weight',
    'body_fat_percentage',
    'skeletal_muscle_mass',
    'bmi',
    'bmr',
    'visceral_fat',
    'body_water',
    'protein',
    'minerals',
  ];

  const { 
    latest, 
    history, 
    getMetric, 
    isLoading 
  } = useMetrics({ 
    metricTypes: bodyMetricTypes,
    dateRange: options?.dateRange,
  });

  // Get InBody data for segmental analysis
  const { data: inbodyAnalyses } = useInBodyAnalyses(user?.id);
  const latestInBody = inbodyAnalyses?.[0];

  // ===== Synthesize body composition data =====
  const bodyData: BodyCompositionData | null = useMemo(() => {
    const weight = getMetric('weight');
    const bodyFat = getMetric('body_fat_percentage');
    
    if (!weight || !bodyFat) return null;

    return {
      weight: weight.value,
      bodyFat: bodyFat.value,
      muscleMass: getMetric('skeletal_muscle_mass')?.value ?? 0,
      bmi: getMetric('bmi')?.value ?? 0,
      bmr: getMetric('bmr')?.value,
      visceralFat: getMetric('visceral_fat')?.value,
      bodyWater: getMetric('body_water')?.value,
      protein: getMetric('protein')?.value,
      minerals: getMetric('minerals')?.value,
      measurementDate: weight.measurement_date,
      source: weight.source,
    };
  }, [latest, getMetric]);

  // ===== Synthesize 3D model data =====
  const model3D: Body3DModel | null = useMemo(() => {
    if (!bodyData) return null;

    // Synthesize from overall metrics
    const segmental = synthesizeSegmentalData(
      bodyData.weight,
      bodyData.bodyFat,
      bodyData.muscleMass
    );

    return {
      segmental,
      symmetryScore: calculateSymmetry(segmental),
    };
  }, [bodyData]);

  // ===== History trends =====
  const trends = useMemo(() => {
    if (!history.length) return null;

    const metricHistory = (name: string) => 
      history
        .filter(m => m.metric_name === name)
        .map(m => ({ date: m.measurement_date, value: m.value }));

    return {
      weight: metricHistory('weight'),
      bodyFat: metricHistory('body_fat_percentage'),
      muscleMass: metricHistory('skeletal_muscle_mass'),
    };
  }, [history]);

  return {
    // Current data
    bodyData,
    model3D,
    
    // Trends
    trends,
    
    // Loading
    isLoading,
    
    // Helpers
    hasData: !!bodyData,
    lastUpdated: bodyData?.measurementDate,
  };
}

/**
 * Calculate symmetry score from segmental data
 */
function calculateSymmetry(segmental: any): number {
  const armDiff = Math.abs(
    segmental.leftArm.percent - segmental.rightArm.percent
  );
  const legDiff = Math.abs(
    segmental.leftLeg.percent - segmental.rightLeg.percent
  );
  
  const armScore = Math.max(0, 100 - armDiff * 2);
  const legScore = Math.max(0, 100 - legDiff * 2);
  
  return (armScore + legScore) / 2;
}
