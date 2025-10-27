import { supabase } from "@/integrations/supabase/client";

export async function captureBaseline(userId: string, challengeId: string): Promise<boolean> {
  try {
    // 1. Check if baseline already saved
    const { data: existingParticipant } = await supabase
      .from('challenge_participants')
      .select('baseline_body_fat')
      .eq('user_id', userId)
      .eq('challenge_id', challengeId)
      .single();

    if (existingParticipant?.baseline_body_fat) {
      console.log('Baseline already captured');
      return true;
    }

    // 2. Try InBody first
    const { data: inbodyData } = await supabase
      .from('inbody_analyses')
      .select('weight, percent_body_fat, skeletal_muscle_mass, test_date')
      .eq('user_id', userId)
      .order('test_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (inbodyData) {
      await supabase
        .from('challenge_participants')
        .update({
          baseline_weight: inbodyData.weight,
          baseline_body_fat: inbodyData.percent_body_fat,
          baseline_muscle_mass: inbodyData.skeletal_muscle_mass,
          baseline_source: 'inbody',
          baseline_recorded_at: inbodyData.test_date,
        })
        .eq('user_id', userId)
        .eq('challenge_id', challengeId);

      console.log('InBody baseline captured');
      return true;
    }

    // 3. Try Withings (unified metrics)
    const { data: withingsData } = await supabase
      .from('unified_metrics')
      .select('value, unit, measurement_date, metric_name')
      .eq('user_id', userId)
      .eq('source', 'withings')
      .in('metric_name', ['weight', 'body_fat_percentage'])
      .order('measurement_date', { ascending: false })
      .limit(10);

    if (withingsData && withingsData.length > 0) {
      const latestDate = withingsData[0].measurement_date;
      const metricsAtDate = withingsData.filter(m => m.measurement_date === latestDate);
      
      const weight = metricsAtDate.find(m => m.metric_name === 'weight')?.value;
      const bodyFat = metricsAtDate.find(m => m.metric_name === 'body_fat_percentage')?.value;

      if (bodyFat) {
        await supabase
          .from('challenge_participants')
          .update({
            baseline_weight: weight,
            baseline_body_fat: bodyFat,
            baseline_source: 'withings',
            baseline_recorded_at: latestDate,
          })
          .eq('user_id', userId)
          .eq('challenge_id', challengeId);

        console.log('Withings baseline captured');
        return true;
      }
    }

    // 4. No InBody or Withings data
    console.warn('No baseline data available (InBody or Withings required)');
    return false;

  } catch (error) {
    console.error('Error capturing baseline:', error);
    return false;
  }
}
