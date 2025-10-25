import { useMemo } from 'react';
import { useBodyComposition } from '../useBodyComposition';
import type { MetricData } from '../useAggregatedBodyMetrics';

interface ManualMetrics {
  weight?: MetricData;
  bodyFat?: MetricData;
  muscleMass?: MetricData;
}

function calculateTrend(data: { value: number }[]) {
  if (data.length < 2) return { trend: 0, trendPercent: 0 };
  const current = data[0].value;
  const previous = data[1].value;
  const trend = current - previous;
  const trendPercent = previous ? (trend / previous) * 100 : 0;
  return { trend, trendPercent };
}

function getBodyFatZone(percent: number): string {
  if (percent <= 13) return 'athlete';
  if (percent <= 17) return 'optimal';
  if (percent <= 24) return 'average';
  return 'high';
}

export function useBodyMetricsFromManual(userId?: string): ManualMetrics | null {
  const { current, history } = useBodyComposition(userId);

  return useMemo(() => {
    if (!current) return null;

    const metrics: ManualMetrics = {};

    // Weight
    if (current.weight) {
      const manualWeights = history
        ?.filter(d => d.weight)
        .map(d => ({ value: d.weight!, measurement_date: d.measurement_date })) || [];
      const trendData = calculateTrend(manualWeights);
      
      metrics.weight = {
        value: current.weight,
        unit: 'kg',
        source: 'manual',
        date: current.measurement_date,
        ...trendData,
        sparklineData: manualWeights.slice(0, 30).map(d => ({ 
          date: d.measurement_date, 
          value: d.value 
        })),
      };
    }

    // Body Fat
    if (current.body_fat_percentage) {
      const manualBodyFat = history
        ?.filter(d => d.body_fat_percentage)
        .map(d => ({ value: d.body_fat_percentage!, measurement_date: d.measurement_date })) || [];
      const sortedHistory = [...manualBodyFat].sort((a, b) => 
        new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime()
      );
      const trendData = calculateTrend(sortedHistory.slice().reverse());
      
      metrics.bodyFat = {
        value: current.body_fat_percentage,
        unit: '%',
        source: 'manual',
        date: current.measurement_date,
        ...trendData,
        sparklineData: sortedHistory.slice(0, 30).map(d => ({ 
          date: d.measurement_date, 
          value: d.value 
        })),
        zone: getBodyFatZone(current.body_fat_percentage),
        sources: {
          manual: {
            value: current.body_fat_percentage,
            date: current.measurement_date,
            sparklineData: sortedHistory.slice(0, 30).map(d => ({ 
              date: d.measurement_date, 
              value: d.value 
            })),
          }
        }
      };
    }

    // Muscle Mass
    if (current.muscle_mass) {
      const manualMuscle = history
        ?.filter(d => d.muscle_mass)
        .map(d => ({ value: d.muscle_mass!, measurement_date: d.measurement_date })) || [];
      const trendData = calculateTrend(manualMuscle);
      
      metrics.muscleMass = {
        value: current.muscle_mass,
        unit: 'kg',
        source: 'manual',
        date: current.measurement_date,
        ...trendData,
        sparklineData: manualMuscle.slice(0, 30).map(d => ({ 
          date: d.measurement_date, 
          value: d.value 
        })),
      };
    }

    return metrics;
  }, [current, history]);
}
