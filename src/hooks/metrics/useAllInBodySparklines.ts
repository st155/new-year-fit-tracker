import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InBodySparklineData {
  date: string;
  value: number;
}

export function useAllInBodySparklines(userId: string | undefined) {
  return useQuery({
    queryKey: ['all-inbody-sparklines', userId],
    queryFn: async () => {
      if (!userId) return new Map<string, InBodySparklineData[]>();
      
      const { data, error } = await supabase
        .from('inbody_analyses')
        .select('test_date, percent_body_fat, weight, skeletal_muscle_mass')
        .eq('user_id', userId)
        .order('test_date', { ascending: true });
      
      if (error || !data) return new Map<string, InBodySparklineData[]>();
      
      const result = new Map<string, InBodySparklineData[]>();
      
      result.set('Body Fat Percentage', data
        .filter(row => row.percent_body_fat != null)
        .map(row => ({ 
          date: row.test_date?.split('T')[0] || '', 
          value: row.percent_body_fat! 
        }))
      );
      
      result.set('Weight', data
        .filter(row => row.weight != null)
        .map(row => ({ 
          date: row.test_date?.split('T')[0] || '', 
          value: row.weight! 
        }))
      );
      
      result.set('Muscle Mass', data
        .filter(row => row.skeletal_muscle_mass != null)
        .map(row => ({ 
          date: row.test_date?.split('T')[0] || '', 
          value: row.skeletal_muscle_mass! 
        }))
      );
      
      return result;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
