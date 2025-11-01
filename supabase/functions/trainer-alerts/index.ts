import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[Trainer Alerts] Starting automated alert checks');

    // 1. Check stale integrations (>7 days without data)
    const { data: staleIntegrations, error: staleError } = await supabase
      .rpc('get_stale_integrations');

    if (staleError) {
      console.error('[Trainer Alerts] Error fetching stale integrations:', staleError);
    }

    const staleAlerts = (staleIntegrations || []).map((item: any) => ({
      user_id: item.trainer_id,
      type: 'system',
      title: '⚠️ Проблема с интеграцией',
      message: `${item.full_name}: нет данных от ${item.source} уже ${item.days_stale} дней`,
      data: {
        client_id: item.client_id,
        source: item.source,
        days_stale: item.days_stale,
        alert_type: 'integration_issue'
      },
      created_at: new Date().toISOString()
    }));

    // 2. Check overtrained clients (strain > 18 + recovery < 33%)
    const { data: overtrainedClients, error: overtrainError } = await supabase
      .rpc('get_overtrained_clients');

    if (overtrainError) {
      console.error('[Trainer Alerts] Error fetching overtrained clients:', overtrainError);
    }

    const overtrainAlerts = (overtrainedClients || []).map((item: any) => ({
      user_id: item.trainer_id,
      type: 'system',
      title: '🔥 Риск перетренированности',
      message: `${item.full_name}: высокий strain (${item.avg_strain}) + низкий recovery (${item.avg_recovery}%)`,
      data: {
        client_id: item.client_id,
        avg_strain: item.avg_strain,
        avg_recovery: item.avg_recovery,
        alert_type: 'client_overtrain'
      },
      created_at: new Date().toISOString()
    }));

    // 3. Combine all alerts
    const allAlerts = [...staleAlerts, ...overtrainAlerts];

    // 4. Check notification settings and insert alerts
    let insertedCount = 0;
    let skippedCount = 0;

    for (const alert of allAlerts) {
      // Check trainer's notification settings
      const { data: settings } = await supabase
        .from('trainer_notification_settings')
        .select('email_enabled, email_integration_issues, email_client_alerts')
        .eq('trainer_id', alert.user_id)
        .maybeSingle();

      // Default to enabled if no settings found
      const shouldNotify = !settings || (
        settings.email_enabled && (
          (alert.data.alert_type === 'integration_issue' && settings.email_integration_issues) ||
          (alert.data.alert_type === 'client_overtrain' && settings.email_client_alerts)
        )
      );

      if (shouldNotify) {
        // Check if similar alert already exists today
        const today = new Date().toISOString().split('T')[0];
        const { data: existingAlert } = await supabase
          .from('user_notifications')
          .select('id')
          .eq('user_id', alert.user_id)
          .eq('type', alert.type)
          .gte('created_at', today)
          .maybeSingle();

        if (!existingAlert) {
          const { error: insertError } = await supabase
            .from('user_notifications')
            .insert({
              user_id: alert.user_id,
              type: alert.type,
              title: alert.title,
              message: alert.message,
              metadata: alert.data,
              created_at: alert.created_at
            });

          if (insertError) {
            console.error('[Trainer Alerts] Error inserting notification:', insertError);
          } else {
            insertedCount++;
          }
        } else {
          skippedCount++;
        }
      } else {
        skippedCount++;
      }
    }

    console.log('[Trainer Alerts] Alerts created:', {
      stale_integrations: staleAlerts.length,
      overtrained_clients: overtrainAlerts.length,
      inserted: insertedCount,
      skipped: skippedCount
    });

    return new Response(
      JSON.stringify({
        success: true,
        alerts_created: insertedCount,
        alerts_skipped: skippedCount,
        breakdown: {
          stale_integrations: staleAlerts.length,
          overtrained_clients: overtrainAlerts.length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[Trainer Alerts] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
