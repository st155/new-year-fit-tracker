import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InBodySparklineData {
  date: string;
  value: number;
}

export function useInBodySparkline(userId: string | undefined, metricName: string) {
  return useQuery({
    queryKey: ['inbody-sparkline', userId, metricName],
    queryFn: async () => {
      if (!userId) return [];
      
      // Только для Body Fat / Weight / Muscle Mass
      const fieldMap: Record<string, string> = {
        'Body Fat Percentage': 'percent_body_fat',
        'Weight': 'weight',
        'Muscle Mass': 'skeletal_muscle_mass',
      };
      
      const field = fieldMap[metricName];
      if (!field) return [];
      
      const { data, error } = await supabase
        .from('inbody_analyses')
        .select(`test_date, ${field}`)
        .eq('user_id', userId)
        .not(field, 'is', null)
        .order('test_date', { ascending: true });
      
      if (error) {
        console.error('Error fetching InBody sparkline:', error);
        return [];
      }
      
      return (data || []).map((row: any) => {
        const fieldValue = row[field];
        const testDate = row.test_date;
        return {
          date: typeof testDate === 'string' ? testDate.split('T')[0] : '',
          value: typeof fieldValue === 'number' ? fieldValue : 0,
        };
      });
    },
    enabled: !!userId && ['Body Fat Percentage', 'Weight', 'Muscle Mass'].includes(metricName),
    staleTime: 5 * 60 * 1000,
  });
}
