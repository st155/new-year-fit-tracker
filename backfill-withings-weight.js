// Скрипт для ручной синхронизации данных Withings и заполнения metric_values
// Использует существующие данные из body_composition

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ueykmmzmguzjppdudvef.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVleWttbXptZ3V6anBwZHVkdmVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ1MDA2MSwiZXhwIjoyMDc0MDI2MDYxfQ.6AHPcTAWvhA3Nc8PvPaFpLuHgJDkq_BDEjAOc5YS2MI'; // Service role key

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function backfillWithingsWeight() {
  console.log('🔄 Starting Withings weight backfill...');
  
  // 1. Получаем все записи из body_composition с методом withings
  const { data: bodyComps, error: bcError } = await supabase
    .from('body_composition')
    .select('*')
    .eq('measurement_method', 'withings')
    .order('measurement_date', { ascending: false });
  
  if (bcError) {
    console.error('❌ Error fetching body_composition:', bcError);
    return;
  }
  
  console.log(`📊 Found ${bodyComps?.length || 0} Withings measurements in body_composition`);
  
  for (const bc of bodyComps || []) {
    console.log(`\n📝 Processing: ${bc.measurement_date} - Weight: ${bc.weight}kg, Fat: ${bc.body_fat_percentage}%`);
    
    // Создаем/получаем метрику для веса
    if (bc.weight) {
      const { data: weightMetricId, error: wmError } = await supabase.rpc('create_or_get_metric', {
        p_user_id: bc.user_id,
        p_metric_name: 'Weight',
        p_metric_category: 'body',
        p_unit: 'kg',
        p_source: 'withings',
      });
      
      if (wmError) {
        console.error('  ❌ Error creating weight metric:', wmError);
      } else if (weightMetricId) {
        // Вставляем значение
        const { error: wvError } = await supabase.from('metric_values').upsert({
          user_id: bc.user_id,
          metric_id: weightMetricId,
          value: bc.weight,
          measurement_date: bc.measurement_date,
          external_id: `terra_WITHINGS_weight_${bc.measurement_date}`,
        }, {
          onConflict: 'metric_id,measurement_date',
        });
        
        if (wvError) {
          console.error('  ❌ Error inserting weight value:', wvError);
        } else {
          console.log('  ✅ Weight saved to metric_values');
        }
      }
    }
    
    // Создаем/получаем метрику для процента жира
    if (bc.body_fat_percentage) {
      const { data: fatMetricId, error: fmError } = await supabase.rpc('create_or_get_metric', {
        p_user_id: bc.user_id,
        p_metric_name: 'Body Fat Percentage',
        p_metric_category: 'body',
        p_unit: '%',
        p_source: 'withings',
      });
      
      if (fmError) {
        console.error('  ❌ Error creating fat metric:', fmError);
      } else if (fatMetricId) {
        // Вставляем значение
        const { error: fvError } = await supabase.from('metric_values').upsert({
          user_id: bc.user_id,
          metric_id: fatMetricId,
          value: bc.body_fat_percentage,
          measurement_date: bc.measurement_date,
          external_id: `terra_WITHINGS_bodyfat_${bc.measurement_date}`,
        }, {
          onConflict: 'metric_id,measurement_date',
        });
        
        if (fvError) {
          console.error('  ❌ Error inserting fat value:', fvError);
        } else {
          console.log('  ✅ Body fat saved to metric_values');
        }
      }
    }
  }
  
  console.log('\n✅ Backfill complete!');
}

backfillWithingsWeight().catch(console.error);
