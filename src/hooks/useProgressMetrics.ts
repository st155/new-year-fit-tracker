import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export function useProgressMetrics(userId?: string) {
  const [selectedMetric, setSelectedMetric] = useState("bench_press_1rm");

  const availableMetrics = [
    { value: "bench_press_1rm", label: "Bench Press (1RM)" },
    { value: "squat_1rm", label: "Squat (1RM)" },
    { value: "deadlift_1rm", label: "Deadlift (1RM)" },
    { value: "overhead_press_1rm", label: "Overhead Press (1RM)" },
    { value: "body_weight", label: "Body Weight" },
  ];

  // Fetch real data from unified_metrics
  const { data: metricsData } = useQuery({
    queryKey: ['progress-metrics', selectedMetric, userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('unified_metrics')
        .select('*')
        .eq('user_id', userId)
        .eq('metric_name', selectedMetric)
        .order('measurement_date', { ascending: true })
        .limit(12);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId
  });

  // Transform data for chart or use mock data
  const chartData = useMemo(() => {
    if (metricsData && metricsData.length > 0) {
      return metricsData.map(m => ({
        date: format(new Date(m.measurement_date), 'dd MMM'),
        value: m.value
      }));
    }
    
    // Fallback to mock data if no real data
    const baseValue = selectedMetric === "bench_press_1rm" ? 100 : 
                      selectedMetric === "squat_1rm" ? 140 :
                      selectedMetric === "deadlift_1rm" ? 160 : 
                      selectedMetric === "body_weight" ? 80 : 70;
    
    return Array.from({ length: 12 }, (_, i) => ({
      date: `Week ${i + 1}`,
      value: baseValue + (i * 2.5) + (Math.random() * 5 - 2.5)
    }));
  }, [metricsData, selectedMetric]);

  const metrics = useMemo(() => {
    const values = chartData.map(d => d.value);
    return {
      start: values[0],
      current: values[values.length - 1],
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length
    };
  }, [chartData]);

  return {
    selectedMetric,
    setSelectedMetric,
    availableMetrics,
    chartData,
    metrics
  };
}
