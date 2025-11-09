import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { startOfDay, subDays } from 'date-fns';

/**
 * Multi-Source Body Data Hook
 * Aggregates body composition data from all sources:
 * - Withings (scales)
 * - InBody (detailed scans)
 * - GARMIN, OURA, WHOOP (fitness trackers)
 * - Manual entries
 * 
 * Applies intelligent prioritization:
 * 1. InBody (most accurate, rare)
 * 2. Withings (daily scales)
 * 3. GARMIN / OURA (medium accuracy)
 * 4. WHOOP (weight only)
 * 5. Manual (lowest priority)
 */

export interface MetricValue {
  value: number;
  source: string;
  date: string;
  confidence: number;
}

export interface BodyDataCurrent {
  weight?: MetricValue;
  bodyFat?: MetricValue;
  muscleMass?: MetricValue;
  bmi?: MetricValue;
  bmr?: MetricValue;
  visceralFat?: MetricValue;
  bodyWater?: MetricValue;
  protein?: MetricValue;
  minerals?: MetricValue;
}

export interface TimelineEntry {
  date: string;
  weight?: number;
  bodyFat?: number;
  muscleMass?: number;
  source: string;
  type: 'withings' | 'inbody' | 'garmin' | 'oura' | 'whoop' | 'manual';
}

export interface BodyReport {
  id: string;
  type: 'inbody' | 'dexa' | 'tanita' | 'manual';
  date: string;
  data: any;
  storagePath?: string;
}

export interface SourceStats {
  count: number;
  lastSync?: string;
  coverage: number; // percentage of days with data
}

const SOURCE_PRIORITY = {
  'INBODY': 1,
  'WITHINGS': 2,
  'GARMIN': 3,
  'OURA': 4,
  'WHOOP': 5,
  'MANUAL': 6,
};

const SOURCE_CONFIDENCE = {
  'INBODY': 95,
  'WITHINGS': 85,
  'GARMIN': 75,
  'OURA': 75,
  'WHOOP': 70,
  'MANUAL': 50,
};

export function useMultiSourceBodyData(days: number = 90) {
  const { user } = useAuth();
  const startDate = startOfDay(subDays(new Date(), days)).toISOString();

  // Fetch unified metrics (Withings, GARMIN, OURA, WHOOP)
  const { data: unifiedMetrics, isLoading: unifiedLoading } = useQuery({
    queryKey: ['unified-metrics-body', user?.id, startDate],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('unified_metrics')
        .select('*')
        .eq('user_id', user.id)
        .in('metric_name', [
          'Weight',
          'Body Fat %',
          'Skeletal Muscle Mass',
          'BMI',
          'BMR',
        ])
        .gte('measurement_date', startDate)
        .order('measurement_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch InBody analyses
  const { data: inbodyData, isLoading: inbodyLoading } = useQuery({
    queryKey: ['inbody-analyses', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('inbody_analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('measurement_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch manual body composition entries
  const { data: manualData, isLoading: manualLoading } = useQuery({
    queryKey: ['manual-body-composition', user?.id, startDate],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('body_composition')
        .select('*')
        .eq('user_id', user.id)
        .gte('measurement_date', startDate)
        .order('measurement_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  const isLoading = unifiedLoading || inbodyLoading || manualLoading;

  // ===== CURRENT AGGREGATED DATA =====
  const current: BodyDataCurrent = useMemo(() => {
    if (!unifiedMetrics && !inbodyData && !manualData) return {};

    const result: BodyDataCurrent = {};

    // Helper to pick best value by priority
    const pickBest = (metricName: string, candidates: Array<{ value: number; source: string; date: string; priority: number }>) => {
      if (!candidates.length) return undefined;
      
      const sorted = candidates.sort((a, b) => {
        // First by priority (lower is better)
        if (a.priority !== b.priority) return a.priority - b.priority;
        // Then by date (newer is better)
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      const best = sorted[0];
      return {
        value: best.value,
        source: best.source,
        date: best.date,
        confidence: SOURCE_CONFIDENCE[best.source.toUpperCase() as keyof typeof SOURCE_CONFIDENCE] || 50,
      };
    };

    // Weight
    const weightCandidates = [];
    unifiedMetrics?.filter(m => m.metric_name === 'Weight').forEach(m => {
      weightCandidates.push({
        value: m.value,
        source: m.source,
        date: m.measurement_date,
        priority: SOURCE_PRIORITY[m.source.toUpperCase() as keyof typeof SOURCE_PRIORITY] || 99,
      });
    });
    inbodyData?.forEach(ib => {
      if (ib.weight) {
        weightCandidates.push({
          value: ib.weight,
          source: 'INBODY',
          date: ib.test_date,
          priority: SOURCE_PRIORITY['INBODY'],
        });
      }
    });
    manualData?.forEach(m => {
      if (m.weight) {
        weightCandidates.push({
          value: m.weight,
          source: 'MANUAL',
          date: m.measurement_date,
          priority: SOURCE_PRIORITY['MANUAL'],
        });
      }
    });
    result.weight = pickBest('weight', weightCandidates);

    // Body Fat %
    const bodyFatCandidates = [];
    unifiedMetrics?.filter(m => m.metric_name === 'Body Fat %').forEach(m => {
      bodyFatCandidates.push({
        value: m.value,
        source: m.source,
        date: m.measurement_date,
        priority: SOURCE_PRIORITY[m.source.toUpperCase() as keyof typeof SOURCE_PRIORITY] || 99,
      });
    });
    inbodyData?.forEach(ib => {
      if (ib.percent_body_fat) {
        bodyFatCandidates.push({
          value: ib.percent_body_fat,
          source: 'INBODY',
          date: ib.test_date,
          priority: SOURCE_PRIORITY['INBODY'],
        });
      }
    });
    manualData?.forEach(m => {
      if (m.body_fat_percentage) {
        bodyFatCandidates.push({
          value: m.body_fat_percentage,
          source: 'MANUAL',
          date: m.measurement_date,
          priority: SOURCE_PRIORITY['MANUAL'],
        });
      }
    });
    result.bodyFat = pickBest('bodyFat', bodyFatCandidates);

    // Muscle Mass
    const muscleCandidates = [];
    unifiedMetrics?.filter(m => m.metric_name === 'Skeletal Muscle Mass').forEach(m => {
      muscleCandidates.push({
        value: m.value,
        source: m.source,
        date: m.measurement_date,
        priority: SOURCE_PRIORITY[m.source.toUpperCase() as keyof typeof SOURCE_PRIORITY] || 99,
      });
    });
    inbodyData?.forEach(ib => {
      if (ib.skeletal_muscle_mass) {
        muscleCandidates.push({
          value: ib.skeletal_muscle_mass,
          source: 'INBODY',
          date: ib.test_date,
          priority: SOURCE_PRIORITY['INBODY'],
        });
      }
    });
    manualData?.forEach(m => {
      if (m.muscle_mass) {
        muscleCandidates.push({
          value: m.muscle_mass,
          source: 'MANUAL',
          date: m.measurement_date,
          priority: SOURCE_PRIORITY['MANUAL'],
        });
      }
    });
    result.muscleMass = pickBest('muscleMass', muscleCandidates);

    // BMI
    const bmiCandidates = [];
    unifiedMetrics?.filter(m => m.metric_name === 'BMI').forEach(m => {
      bmiCandidates.push({
        value: m.value,
        source: m.source,
        date: m.measurement_date,
        priority: SOURCE_PRIORITY[m.source.toUpperCase() as keyof typeof SOURCE_PRIORITY] || 99,
      });
    });
    inbodyData?.forEach(ib => {
      if (ib.bmi) {
        bmiCandidates.push({
          value: ib.bmi,
          source: 'INBODY',
          date: ib.test_date,
          priority: SOURCE_PRIORITY['INBODY'],
        });
      }
    });
    result.bmi = pickBest('bmi', bmiCandidates);

    // InBody-specific metrics
    const latestInBody = inbodyData?.[0];
    if (latestInBody) {
      if (latestInBody.bmr) {
        result.bmr = {
          value: latestInBody.bmr,
          source: 'INBODY',
          date: latestInBody.test_date,
          confidence: SOURCE_CONFIDENCE['INBODY'],
        };
      }
      if (latestInBody.visceral_fat_area) {
        result.visceralFat = {
          value: latestInBody.visceral_fat_area,
          source: 'INBODY',
          date: latestInBody.test_date,
          confidence: SOURCE_CONFIDENCE['INBODY'],
        };
      }
      if (latestInBody.total_body_water) {
        result.bodyWater = {
          value: latestInBody.total_body_water,
          source: 'INBODY',
          date: latestInBody.test_date,
          confidence: SOURCE_CONFIDENCE['INBODY'],
        };
      }
      if (latestInBody.protein) {
        result.protein = {
          value: latestInBody.protein,
          source: 'INBODY',
          date: latestInBody.test_date,
          confidence: SOURCE_CONFIDENCE['INBODY'],
        };
      }
      if (latestInBody.minerals) {
        result.minerals = {
          value: latestInBody.minerals,
          source: 'INBODY',
          date: latestInBody.test_date,
          confidence: SOURCE_CONFIDENCE['INBODY'],
        };
      }
    }

    return result;
  }, [unifiedMetrics, inbodyData, manualData]);

  // ===== TIMELINE DATA =====
  const timeline: TimelineEntry[] = useMemo(() => {
    const entriesMap = new Map<string, TimelineEntry>();

    // Add unified metrics - Use Map for O(1) lookups
    unifiedMetrics?.forEach(m => {
      const key = `${m.measurement_date}-${m.source}`;
      const existing = entriesMap.get(key);
      
      if (existing) {
        if (m.metric_name === 'Weight') existing.weight = m.value;
        if (m.metric_name === 'Body Fat %') existing.bodyFat = m.value;
        if (m.metric_name === 'Skeletal Muscle Mass') existing.muscleMass = m.value;
      } else {
        const entry: TimelineEntry = {
          date: m.measurement_date,
          source: m.source,
          type: m.source.toLowerCase() as any,
        };
        if (m.metric_name === 'Weight') entry.weight = m.value;
        if (m.metric_name === 'Body Fat %') entry.bodyFat = m.value;
        if (m.metric_name === 'Skeletal Muscle Mass') entry.muscleMass = m.value;
        entriesMap.set(key, entry);
      }
    });

    // Add InBody data
    inbodyData?.forEach(ib => {
      const key = `${ib.test_date}-INBODY`;
      entriesMap.set(key, {
        date: ib.test_date,
        weight: ib.weight,
        bodyFat: ib.percent_body_fat,
        muscleMass: ib.skeletal_muscle_mass,
        source: 'INBODY',
        type: 'inbody',
      });
    });

    // Add manual data
    manualData?.forEach(m => {
      const key = `${m.measurement_date}-MANUAL`;
      entriesMap.set(key, {
        date: m.measurement_date,
        weight: m.weight || undefined,
        bodyFat: m.body_fat_percentage || undefined,
        muscleMass: m.muscle_mass || undefined,
        source: 'MANUAL',
        type: 'manual',
      });
    });

    return Array.from(entriesMap.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [unifiedMetrics, inbodyData, manualData]);

  // ===== BODY REPORTS =====
  const reports: BodyReport[] = useMemo(() => {
    const reportList: BodyReport[] = [];

    inbodyData?.forEach(ib => {
      reportList.push({
        id: ib.id,
        type: 'inbody',
        date: ib.test_date,
        data: ib,
        storagePath: ib.pdf_url || undefined,
      });
    });

    return reportList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [inbodyData]);

  // ===== SOURCE STATS =====
  const sourceStats: Record<string, SourceStats> = useMemo(() => {
    const stats: Record<string, SourceStats> = {};

    // Count by source
    const counts: Record<string, number> = {};
    const lastDates: Record<string, string> = {};

    unifiedMetrics?.forEach(m => {
      const source = m.source.toLowerCase();
      counts[source] = (counts[source] || 0) + 1;
      if (!lastDates[source] || m.measurement_date > lastDates[source]) {
        lastDates[source] = m.measurement_date;
      }
    });

    inbodyData?.forEach(ib => {
      counts['inbody'] = (counts['inbody'] || 0) + 1;
      if (!lastDates['inbody'] || ib.test_date > lastDates['inbody']) {
        lastDates['inbody'] = ib.test_date;
      }
    });

    manualData?.forEach(m => {
      counts['manual'] = (counts['manual'] || 0) + 1;
      if (!lastDates['manual'] || m.measurement_date > lastDates['manual']) {
        lastDates['manual'] = m.measurement_date;
      }
    });

    // Calculate coverage (% of days with data)
    Object.keys(counts).forEach(source => {
      const uniqueDates = new Set(
        (source === 'inbody' ? inbodyData?.map((item: any) => item.test_date.split('T')[0]) : 
         source === 'manual' ? manualData?.map((item: any) => item.measurement_date.split('T')[0]) :
         unifiedMetrics?.filter(m => m.source.toLowerCase() === source)?.map((item: any) => item.measurement_date.split('T')[0]))
      ).size;

      stats[source] = {
        count: counts[source],
        lastSync: lastDates[source],
        coverage: Math.round((uniqueDates / days) * 100),
      };
    });

    return stats;
  }, [unifiedMetrics, inbodyData, manualData, days]);

  // ===== PRECOMPUTED SPARKLINES =====
  const sparklines: Record<string, Array<{date: string; value: number}>> = useMemo(() => {
    const result: Record<string, Array<{date: string; value: number}>> = {};
    
    const metricKeys = ['weight', 'bodyFat', 'muscleMass', 'bmi', 'bmr', 'visceralFat', 'bodyWater', 'protein'] as const;
    
    metricKeys.forEach(key => {
      result[key] = timeline
        .filter(entry => entry[key] !== undefined && entry[key] !== null)
        .slice(0, 7)
        .reverse()
        .map(entry => ({
          date: entry.date,
          value: entry[key] as number
        }));
    });
    
    return result;
  }, [timeline]);

  return {
    current,
    timeline,
    reports,
    sourceStats,
    sparklines,
    isLoading,
    hasData: Object.keys(current).length > 0,
  };
}
