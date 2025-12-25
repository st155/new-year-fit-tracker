import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SparklineChart } from '../charts/SparklineChart';

interface HabitSparklineWidgetProps {
  habitId: string;
  habitType: string;
  color?: string;
  height?: number;
}

export function HabitSparklineWidget({ 
  habitId, 
  habitType, 
  color = "hsl(var(--primary))",
  height = 40 
}: HabitSparklineWidgetProps) {
  const [data, setData] = useState<number[]>([]);

  useEffect(() => {
    const fetchSparklineData = async () => {
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);

      try {
        if (habitType === 'duration_counter') {
          // For duration counters, show days in each attempt
          const { data: attempts } = await supabase
            .from('habit_attempts')
            .select('start_date, end_date')
            .eq('habit_id', habitId)
            .order('start_date', { ascending: false })
            .limit(7);

          if (attempts && attempts.length > 0) {
            const sparkData = attempts.map(attempt => {
              const start = new Date(attempt.start_date);
              const end = attempt.end_date ? new Date(attempt.end_date) : new Date();
              const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
              return Math.max(0, days);
            }).reverse();
            setData(sparkData.length > 0 ? sparkData : [1]);
          } else {
            setData([1]);
          }
        } else {
          // For all other habits, show completion (1/0) over last 7 days
          const { data: completions } = await supabase
            .from('habit_completions')
            .select('completed_at')
            .eq('habit_id', habitId)
            .gte('completed_at', sevenDaysAgo.toISOString())
            .order('completed_at', { ascending: true });

          if (completions) {
            const daySet = new Set(
              completions.map(c => new Date(c.completed_at).toISOString().split('T')[0])
            );
            
            const sparkData: number[] = [];
            for (let i = 6; i >= 0; i--) {
              const date = new Date(today);
              date.setDate(today.getDate() - i);
              const dayKey = date.toISOString().split('T')[0];
              sparkData.push(daySet.has(dayKey) ? 1 : 0);
            }
            setData(sparkData.some(v => v > 0) ? sparkData : [0, 0, 0, 0, 0, 0, 1]);
          } else {
            setData([0, 0, 0, 0, 0, 0, 1]);
          }
        }
      } catch (error) {
        console.error('Error fetching sparkline data:', error);
        // Fallback to a simple pattern
        setData([0, 0, 0, 0, 0, 0, 1]);
      }
    };

    fetchSparklineData();
  }, [habitId, habitType]);

  if (data.length === 0) {
    // Show a default pattern while loading
    return (
      <SparklineChart 
        data={[0, 0, 0, 0, 0, 0, 1]} 
        height={height} 
        color={color}
      />
    );
  }

  return (
    <SparklineChart 
      data={data} 
      height={height} 
      color={color}
    />
  );
}
