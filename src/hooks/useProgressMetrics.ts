import { useState, useMemo } from "react";

// Mock data for progress metrics
// In production, this would fetch from Supabase
export function useProgressMetrics() {
  const [selectedMetric, setSelectedMetric] = useState("bench_press_1rm");

  const availableMetrics = [
    { value: "bench_press_1rm", label: "Bench Press (1RM)" },
    { value: "squat_1rm", label: "Squat (1RM)" },
    { value: "deadlift_1rm", label: "Deadlift (1RM)" },
    { value: "overhead_press_1rm", label: "Overhead Press (1RM)" },
  ];

  // Mock chart data
  const chartData = useMemo(() => {
    const baseValue = selectedMetric === "bench_press_1rm" ? 100 : 
                      selectedMetric === "squat_1rm" ? 140 :
                      selectedMetric === "deadlift_1rm" ? 160 : 70;
    
    return Array.from({ length: 12 }, (_, i) => ({
      date: `Week ${i + 1}`,
      value: baseValue + (i * 2.5) + (Math.random() * 5 - 2.5)
    }));
  }, [selectedMetric]);

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
