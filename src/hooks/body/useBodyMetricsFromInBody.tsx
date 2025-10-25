import { useMemo } from 'react';
import { useInBodyAnalyses } from '../useInBodyAnalyses';
import type { MetricData, SegmentalData } from '../useAggregatedBodyMetrics';

interface InBodyMetrics {
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

function calculateTrend(data: { value: number }[]) {
  if (data.length < 2) return { trend: 0, trendPercent: 0 };
  const current = data[0].value;
  const previous = data[1].value;
  const trend = current - previous;
  const trendPercent = previous ? (trend / previous) * 100 : 0;
  return { trend, trendPercent };
}

function getSegmentZone(percent: number): 'low' | 'normal' | 'high' {
  if (percent < 90) return 'low';
  if (percent <= 110) return 'normal';
  return 'high';
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

export function useBodyMetricsFromInBody(userId?: string): InBodyMetrics | null {
  const { data: inbodyData } = useInBodyAnalyses(userId);

  return useMemo(() => {
    if (!inbodyData?.length) return null;

    const latest = inbodyData[0];
    const metrics: InBodyMetrics = {};

    // Weight
    if (latest.weight) {
      const history = inbodyData.slice(0, 30).map(d => ({ value: d.weight!, date: d.test_date }));
      const trendData = calculateTrend(history);
      metrics.weight = {
        value: latest.weight,
        unit: 'kg',
        source: 'inbody',
        date: latest.test_date,
        ...trendData,
        sparklineData: history.map(d => ({ date: d.date.split('T')[0], value: d.value })),
      };
    }

    // Body Fat
    if (latest.percent_body_fat) {
      const history = inbodyData.slice(0, 30).map(d => ({ value: d.percent_body_fat!, date: d.test_date }));
      const sortedHistory = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const trendData = calculateTrend(sortedHistory.slice().reverse());
      
      metrics.bodyFat = {
        value: latest.percent_body_fat,
        unit: '%',
        source: 'inbody',
        date: latest.test_date,
        ...trendData,
        sparklineData: sortedHistory.map(d => ({ date: d.date.split('T')[0], value: d.value })),
        zone: getBodyFatZone(latest.percent_body_fat),
        sources: {
          inbody: {
            value: latest.percent_body_fat,
            date: latest.test_date,
            sparklineData: sortedHistory.map(d => ({ date: d.date.split('T')[0], value: d.value })),
          }
        }
      };
    }

    // Muscle Mass
    if (latest.skeletal_muscle_mass) {
      const history = inbodyData.slice(0, 30).map(d => ({ value: d.skeletal_muscle_mass!, date: d.test_date }));
      const trendData = calculateTrend(history);
      metrics.muscleMass = {
        value: latest.skeletal_muscle_mass,
        unit: 'kg',
        source: 'inbody',
        date: latest.test_date,
        ...trendData,
        sparklineData: history.map(d => ({ date: d.date.split('T')[0], value: d.value })),
      };
    }

    // BMR
    if (latest.bmr) {
      metrics.bmr = {
        value: latest.bmr,
        unit: 'kcal/day',
        source: 'inbody',
        date: latest.test_date,
      };
    }

    // Visceral Fat
    if (latest.visceral_fat_area) {
      metrics.visceralFat = {
        value: latest.visceral_fat_area,
        unit: 'cm²',
        source: 'inbody',
        date: latest.test_date,
        zone: getVisceralFatZone(latest.visceral_fat_area),
      };
    }

    // Body Water
    if (latest.total_body_water) {
      metrics.bodyWater = {
        value: latest.total_body_water,
        unit: 'L',
        source: 'inbody',
        date: latest.test_date,
      };
    }

    // Protein
    if (latest.protein) {
      metrics.protein = {
        value: latest.protein,
        unit: 'kg',
        source: 'inbody',
        date: latest.test_date,
      };
    }

    // Minerals
    if (latest.minerals) {
      metrics.minerals = {
        value: latest.minerals,
        unit: 'kg',
        source: 'inbody',
        date: latest.test_date,
      };
    }

    // Segmental Analysis
    if (latest.right_arm_percent) {
      metrics.segmental = {
        rightArm: {
          percent: latest.right_arm_percent,
          mass: latest.right_arm_mass || 0,
          zone: getSegmentZone(latest.right_arm_percent),
        },
        leftArm: latest.left_arm_percent ? {
          percent: latest.left_arm_percent,
          mass: latest.left_arm_mass || 0,
          zone: getSegmentZone(latest.left_arm_percent),
        } : undefined,
        trunk: latest.trunk_percent ? {
          percent: latest.trunk_percent,
          mass: latest.trunk_mass || 0,
          zone: getSegmentZone(latest.trunk_percent),
        } : undefined,
        rightLeg: latest.right_leg_percent ? {
          percent: latest.right_leg_percent,
          mass: latest.right_leg_mass || 0,
          zone: getSegmentZone(latest.right_leg_percent),
        } : undefined,
        leftLeg: latest.left_leg_percent ? {
          percent: latest.left_leg_percent,
          mass: latest.left_leg_mass || 0,
          zone: getSegmentZone(latest.left_leg_percent),
        } : undefined,
      };
    }

    return metrics;
  }, [inbodyData]);
}
