import { withAuth, jsonResponse, parseBody } from '../_shared/handler.ts';

interface TerraDaily {
  date?: string;
  stress_data?: {
    stress_level?: number;
    recovery_level?: number;
    stress_duration_seconds?: number;
  };
  strain_data?: {
    strain_level?: number;
  };
  scores?: {
    recovery?: number;
    strain?: number;
    activity?: number;
    sleep?: number;
  };
  heart_rate_data?: {
    hr_max_bpm?: number;
    hr_min_bpm?: number;
    hr_resting_bpm?: number;
    hr_avg_bpm?: number;
    summary?: {
      hr_maximum_bpm?: number;
      hr_minimum_bpm?: number;
      resting_hr_bpm?: number;
      hr_average_bpm?: number;
    };
  };
  distance_data?: {
    distance_metres?: number;
    steps?: number;
    active_duration_seconds?: number;
  };
  calories_data?: {
    total_burned_calories?: number;
    active_burned_calories?: number;
    calorie_samples?: { calories?: number }[];
  };
  metadata?: {
    start_time?: string;
    end_time?: string;
    upload_type?: number;
  };
}

interface TerraSleep {
  sleep_durations_data?: {
    sleep_efficiency?: number;
    other?: {
      duration_in_bed_seconds?: number;
      duration_unmeasurable_sleep_seconds?: number;
    };
    asleep?: {
      duration_asleep_state_seconds?: number;
      duration_deep_sleep_state_seconds?: number;
      duration_light_sleep_state_seconds?: number;
      duration_REM_sleep_state_seconds?: number;
    };
  };
  metadata?: {
    start_time?: string;
    end_time?: string;
    upload_type?: number;
  };
  heart_rate_data?: {
    summary?: {
      avg_hrv_rmssd?: number;
      avg_hrv_sdnn?: number;
    };
  };
}

Deno.serve(withAuth(async ({ req, supabase, user }) => {
  const requestStart = Date.now();
  const terraApiKey = Deno.env.get('TERRA_API_KEY');
  const terraDevId = Deno.env.get('TERRA_DEV_ID');

  if (!terraApiKey || !terraDevId) {
    console.error('❌ [Realtime Sync] Terra API credentials not configured');
    throw new Error('Terra API credentials not configured');
  }

  const { provider = 'WHOOP' } = await parseBody<{ provider?: string }>(req);
  
  console.log('🔄 [Realtime Sync] Request received:', {
    provider,
    userId: user!.id,
    timestamp: new Date().toISOString()
  });

  // Get Terra user ID
  const { data: token, error: tokenError } = await supabase
    .from('terra_tokens')
    .select('terra_user_id')
    .eq('user_id', user!.id)
    .eq('provider', provider.toUpperCase())
    .eq('is_active', true)
    .single();

  if (tokenError || !token) {
    throw new Error(`No active ${provider} connection found`);
  }
  
  console.log('✅ [Realtime Sync] Terra user:', token.terra_user_id);

  // Fetch today's daily data directly from Terra
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  const dailyUrl = `https://api.tryterra.co/v2/daily?user_id=${token.terra_user_id}&start_date=${yesterday}&end_date=${today}&to_webhook=false`;
  
  console.log('🌍 [Realtime Sync] Fetching daily data...');
  
  const dailyResponse = await fetch(dailyUrl, {
    method: 'GET',
    headers: {
      'dev-id': terraDevId,
      'x-api-key': terraApiKey,
    },
  });

  if (!dailyResponse.ok) {
    const errorText = await dailyResponse.text();
    console.error('❌ [Realtime Sync] Terra API error:', dailyResponse.status, errorText);
    throw new Error(`Terra API error: ${dailyResponse.status}`);
  }

  const dailyResult = await dailyResponse.json();
  console.log('📊 [Realtime Sync] Daily data received:', {
    status: dailyResult.status,
    dataCount: dailyResult.data?.length || 0
  });

  // Also fetch sleep data
  const sleepUrl = `https://api.tryterra.co/v2/sleep?user_id=${token.terra_user_id}&start_date=${yesterday}&end_date=${today}&to_webhook=false`;
  
  console.log('🌍 [Realtime Sync] Fetching sleep data...');
  
  const sleepResponse = await fetch(sleepUrl, {
    method: 'GET',
    headers: {
      'dev-id': terraDevId,
      'x-api-key': terraApiKey,
    },
  });

  const sleepResult = sleepResponse.ok ? await sleepResponse.json() : { data: [] };
  console.log('💤 [Realtime Sync] Sleep data received:', {
    status: sleepResult.status,
    dataCount: sleepResult.data?.length || 0
  });

  // Process and write metrics
  const metricsWritten: string[] = [];
  const errors: string[] = [];

  // Process daily data
  if (dailyResult.data && Array.isArray(dailyResult.data)) {
    for (const daily of dailyResult.data as TerraDaily[]) {
      const measurementDate = daily.metadata?.start_time?.split('T')[0] || today;
      
      // Day Strain
      const strainValue = daily.scores?.strain ?? daily.strain_data?.strain_level;
      if (strainValue !== undefined && strainValue !== null) {
        const { error } = await supabase
          .from('unified_metrics')
          .upsert({
            user_id: user!.id,
            metric_name: 'Day Strain',
            value: strainValue,
            unit: 'score',
            source: provider.toUpperCase(),
            measurement_date: measurementDate,
            provider_priority: 1,
            category: 'workout',
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,metric_name,measurement_date,source'
          });
        
        if (error) {
          errors.push(`Day Strain: ${error.message}`);
        } else {
          metricsWritten.push(`Day Strain: ${strainValue}`);
        }
      }

      // Recovery Score
      const recoveryValue = daily.scores?.recovery ?? daily.stress_data?.recovery_level;
      if (recoveryValue !== undefined && recoveryValue !== null) {
        const { error } = await supabase
          .from('unified_metrics')
          .upsert({
            user_id: user!.id,
            metric_name: 'Recovery Score',
            value: recoveryValue,
            unit: '%',
            source: provider.toUpperCase(),
            measurement_date: measurementDate,
            provider_priority: 1,
            category: 'recovery',
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,metric_name,measurement_date,source'
          });
        
        if (error) {
          errors.push(`Recovery: ${error.message}`);
        } else {
          metricsWritten.push(`Recovery: ${recoveryValue}`);
        }
      }

      // Steps
      const steps = daily.distance_data?.steps;
      if (steps !== undefined && steps !== null) {
        const { error } = await supabase
          .from('unified_metrics')
          .upsert({
            user_id: user!.id,
            metric_name: 'Steps',
            value: steps,
            unit: 'steps',
            source: provider.toUpperCase(),
            measurement_date: measurementDate,
            provider_priority: 1,
            category: 'activity',
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,metric_name,measurement_date,source'
          });
        
        if (error) {
          errors.push(`Steps: ${error.message}`);
        } else {
          metricsWritten.push(`Steps: ${steps}`);
        }
      }

      // Active Calories
      const activeCalories = daily.calories_data?.active_burned_calories;
      if (activeCalories !== undefined && activeCalories !== null) {
        const { error } = await supabase
          .from('unified_metrics')
          .upsert({
            user_id: user!.id,
            metric_name: 'Active Calories',
            value: Math.round(activeCalories),
            unit: 'kcal',
            source: provider.toUpperCase(),
            measurement_date: measurementDate,
            provider_priority: 1,
            category: 'activity',
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,metric_name,measurement_date,source'
          });
        
        if (error) {
          errors.push(`Active Calories: ${error.message}`);
        } else {
          metricsWritten.push(`Active Calories: ${activeCalories}`);
        }
      }

      // Resting Heart Rate
      const restingHR = daily.heart_rate_data?.hr_resting_bpm ?? 
                        daily.heart_rate_data?.summary?.resting_hr_bpm;
      if (restingHR !== undefined && restingHR !== null) {
        const { error } = await supabase
          .from('unified_metrics')
          .upsert({
            user_id: user!.id,
            metric_name: 'Resting Heart Rate',
            value: restingHR,
            unit: 'bpm',
            source: provider.toUpperCase(),
            measurement_date: measurementDate,
            provider_priority: 1,
            category: 'vitals',
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,metric_name,measurement_date,source'
          });
        
        if (error) {
          errors.push(`Resting HR: ${error.message}`);
        } else {
          metricsWritten.push(`Resting HR: ${restingHR}`);
        }
      }

      // Max Heart Rate
      const maxHR = daily.heart_rate_data?.hr_max_bpm ?? 
                    daily.heart_rate_data?.summary?.hr_maximum_bpm;
      if (maxHR !== undefined && maxHR !== null) {
        const { error } = await supabase
          .from('unified_metrics')
          .upsert({
            user_id: user!.id,
            metric_name: 'Max Heart Rate',
            value: maxHR,
            unit: 'bpm',
            source: provider.toUpperCase(),
            measurement_date: measurementDate,
            provider_priority: 1,
            category: 'vitals',
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,metric_name,measurement_date,source'
          });
        
        if (error) {
          errors.push(`Max HR: ${error.message}`);
        } else {
          metricsWritten.push(`Max HR: ${maxHR}`);
        }
      }
    }
  }

  // Process sleep data
  if (sleepResult.data && Array.isArray(sleepResult.data)) {
    for (const sleep of sleepResult.data as TerraSleep[]) {
      const measurementDate = sleep.metadata?.end_time?.split('T')[0] || today;
      
      // Sleep Efficiency
      const sleepEfficiency = sleep.sleep_durations_data?.sleep_efficiency;
      if (sleepEfficiency !== undefined && sleepEfficiency !== null) {
        const { error } = await supabase
          .from('unified_metrics')
          .upsert({
            user_id: user!.id,
            metric_name: 'Sleep Efficiency',
            value: sleepEfficiency * 100,
            unit: '%',
            source: provider.toUpperCase(),
            measurement_date: measurementDate,
            provider_priority: 1,
            category: 'sleep',
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,metric_name,measurement_date,source'
          });
        
        if (error) {
          errors.push(`Sleep Efficiency: ${error.message}`);
        } else {
          metricsWritten.push(`Sleep Efficiency: ${sleepEfficiency * 100}%`);
        }
      }

      // Sleep Duration
      const sleepDurationSeconds = sleep.sleep_durations_data?.asleep?.duration_asleep_state_seconds;
      if (sleepDurationSeconds !== undefined && sleepDurationSeconds !== null) {
        const sleepHours = sleepDurationSeconds / 3600;
        const { error } = await supabase
          .from('unified_metrics')
          .upsert({
            user_id: user!.id,
            metric_name: 'Sleep Duration',
            value: parseFloat(sleepHours.toFixed(2)),
            unit: 'hours',
            source: provider.toUpperCase(),
            measurement_date: measurementDate,
            provider_priority: 1,
            category: 'sleep',
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,metric_name,measurement_date,source'
          });
        
        if (error) {
          errors.push(`Sleep Duration: ${error.message}`);
        } else {
          metricsWritten.push(`Sleep Duration: ${sleepHours.toFixed(1)}h`);
        }
      }

      // HRV
      const hrv = sleep.heart_rate_data?.summary?.avg_hrv_rmssd;
      if (hrv !== undefined && hrv !== null) {
        const { error } = await supabase
          .from('unified_metrics')
          .upsert({
            user_id: user!.id,
            metric_name: 'HRV',
            value: Math.round(hrv),
            unit: 'ms',
            source: provider.toUpperCase(),
            measurement_date: measurementDate,
            provider_priority: 1,
            category: 'recovery',
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,metric_name,measurement_date,source'
          });
        
        if (error) {
          errors.push(`HRV: ${error.message}`);
        } else {
          metricsWritten.push(`HRV: ${hrv}ms`);
        }
      }
    }
  }

  const totalDuration = Date.now() - requestStart;
  console.log('🎉 [Realtime Sync] Completed:', {
    userId: user!.id,
    provider,
    metricsWritten: metricsWritten.length,
    errors: errors.length,
    duration: `${totalDuration}ms`
  });

  return jsonResponse({ 
    success: true,
    metricsWritten,
    errors: errors.length > 0 ? errors : undefined,
    duration: totalDuration
  });
}));
