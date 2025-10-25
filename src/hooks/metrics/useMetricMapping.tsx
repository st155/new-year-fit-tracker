import { useMemo } from 'react';
import { MetricKey, mapUnifiedToLocal } from '@/lib/metric-config';

interface MetricData {
  value: string;
  source: string | null;
  sources: string[];
  change?: string | null;
  date?: string;
  [key: string]: any;
}

export function useMetricMapping(
  unifiedMetrics: Record<string, any>,
  deviceMetrics: Record<string, any>,
  viewMode: 'unified' | 'by_device',
  deviceFilter: string
) {
  return useMemo(() => {
    const emptyMetric: MetricData = { 
      value: '—', 
      change: null, 
      source: null, 
      sources: [] 
    };

    // Initialize with empty values
    const result: Record<MetricKey, MetricData> = {
      body_fat: { ...emptyMetric },
      weight: { ...emptyMetric },
      vo2max: { ...emptyMetric, records: 0 },
      row_2km: { ...emptyMetric, attempts: 0 },
      recovery: { ...emptyMetric },
      steps: { ...emptyMetric },
      max_hr: { ...emptyMetric },
      day_strain: { ...emptyMetric }
    };

    if (viewMode === 'unified') {
      // Map unified metrics to local keys
      Object.entries(unifiedMetrics).forEach(([unifiedName, data]: any) => {
        const localKey = mapUnifiedToLocal(unifiedName);
        if (localKey && data) {
          const rawValue = (data.aggregated_value ?? data.value);
          
          let displayValue = '—';
          if (rawValue != null && rawValue !== 0) {
            displayValue = localKey === 'steps' 
              ? Math.round(Number(rawValue)).toString() 
              : Number(rawValue).toFixed(1);
          } else if (localKey === 'recovery' && rawValue === 0) {
            displayValue = '0.0';
          }

          const srcs = data.sources || (data.source ? [data.source] : []);

          result[localKey] = {
            value: displayValue,
            source: srcs[0] || 'unified',
            sources: srcs,
            source_count: data.source_count || (srcs.length || 0),
            source_values: data.source_values || {},
            change: null,
            date: data.measurement_date,
          };
        }
      });
    } else if (viewMode === 'by_device' && deviceFilter !== 'all') {
      // Device-specific mapping
      if (Object.keys(deviceMetrics).length > 0) {
        const pickMetric = (names: string[]): any | null => {
          for (const n of names) {
            const found = Object.entries(deviceMetrics).find(([metricName]) => metricName === n);
            if (found) return found[1];
          }
          return null;
        };

        // Recovery
        const recoveryMetric = pickMetric(['Recovery Score', 'Sleep Performance', 'Sleep Efficiency']);
        if (recoveryMetric && typeof recoveryMetric.value === 'number') {
          result.recovery = {
            value: Math.round(recoveryMetric.value).toString(),
            source: deviceFilter,
            sources: [deviceFilter],
            change: null,
          };
        }

        // Weight
        const weightMetric = pickMetric(['Weight', 'Body Mass', 'Body Weight', 'Weight (kg)', 'HKQuantityTypeIdentifierBodyMass']);
        if (weightMetric && typeof weightMetric.value === 'number') {
          result.weight = {
            value: Number(weightMetric.value).toFixed(1),
            source: deviceFilter,
            sources: [deviceFilter],
            change: null,
          };
        }

        // Body Fat
        const bodyFatMetric = pickMetric(['Body Fat Percentage', 'Body Fat %', 'Fat Mass', 'HKQuantityTypeIdentifierBodyFatPercentage']);
        if (bodyFatMetric && typeof bodyFatMetric.value === 'number') {
          result.body_fat = {
            value: Number(bodyFatMetric.value).toFixed(1),
            source: deviceFilter,
            sources: [deviceFilter],
            change: null,
          };
        }

        // VO2Max
        const vo2Metric = pickMetric(['VO2Max', 'VO2 Max']);
        if (vo2Metric && typeof vo2Metric.value === 'number') {
          result.vo2max = {
            value: Number(vo2Metric.value).toFixed(1),
            source: deviceFilter,
            sources: [deviceFilter],
            records: 0,
          };
        }

        // Steps
        const stepsMetric = pickMetric(['Steps', 'Step Count', 'HKQuantityTypeIdentifierStepCount']);
        if (stepsMetric && typeof stepsMetric.value === 'number') {
          result.steps = {
            value: Math.round(stepsMetric.value).toLocaleString(),
            source: deviceFilter,
            sources: [deviceFilter],
            change: null,
          };
        }
      }
    }

    return result;
  }, [unifiedMetrics, deviceMetrics, viewMode, deviceFilter]);
}
