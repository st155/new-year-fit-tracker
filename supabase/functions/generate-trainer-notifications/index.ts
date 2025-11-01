import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active trainer-client relationships
    const { data: relationships, error: relError } = await supabase
      .from('trainer_clients')
      .select(`
        trainer_id,
        client_id,
        profiles:client_id (
          full_name,
          username
        )
      `)
      .eq('active', true);

    if (relError) throw relError;

    const notifications: any[] = [];
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Check each client for alert conditions
    for (const rel of relationships) {
      const clientName = rel.profiles?.full_name || rel.profiles?.username || 'Unknown';

      // Check 1: Low Recovery Alert (<30%)
      const { data: recoveryMetrics } = await supabase
        .from('unified_metrics')
        .select('value, measurement_date')
        .eq('user_id', rel.client_id)
        .eq('metric_name', 'Recovery Score')
        .gte('measurement_date', oneDayAgo.toISOString().split('T')[0])
        .order('measurement_date', { ascending: false })
        .limit(1);

      if (recoveryMetrics && recoveryMetrics.length > 0) {
        const recovery = recoveryMetrics[0].value;
        if (recovery < 30) {
          notifications.push({
            user_id: rel.trainer_id,
            type: 'client_alert',
            title: 'Low Recovery Alert',
            message: `${clientName} has a low recovery score of ${recovery}%`,
            metadata: {
              client_id: rel.client_id,
              client_name: clientName,
              metric_value: recovery,
            },
          });
        }
      }

      // Check 2: Stale Data (no data in last 7 days)
      const { data: recentMetrics, count } = await supabase
        .from('unified_metrics')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', rel.client_id)
        .gte('measurement_date', sevenDaysAgo.toISOString().split('T')[0]);

      if (count === 0) {
        notifications.push({
          user_id: rel.trainer_id,
          type: 'data_stale',
          title: 'Stale Data Detected',
          message: `${clientName} has not synced data in over 7 days`,
          metadata: {
            client_id: rel.client_id,
            client_name: clientName,
          },
        });
      }

      // Check 3: Goal Achieved (check recent goals)
      const { data: achievedGoals } = await supabase
        .from('goals')
        .select('goal_name, current_value, target_value, target_unit')
        .eq('user_id', rel.client_id)
        .gte('current_value', supabase.raw('target_value'))
        .eq('is_completed', false);

      if (achievedGoals && achievedGoals.length > 0) {
        for (const goal of achievedGoals) {
          notifications.push({
            user_id: rel.trainer_id,
            type: 'goal_achieved',
            title: 'Goal Achieved!',
            message: `${clientName} has achieved their goal: ${goal.goal_name}`,
            metadata: {
              client_id: rel.client_id,
              client_name: clientName,
              goal_name: goal.goal_name,
            },
          });
        }
      }

      // Check 4: Data conflicts (check for recent conflicts)
      const { data: conflicts, count: conflictCount } = await supabase
        .from('unified_metrics')
        .select('metric_name', { count: 'exact' })
        .eq('user_id', rel.client_id)
        .lt('confidence_score', 50)
        .gte('created_at', oneDayAgo.toISOString());

      if (conflictCount && conflictCount > 0) {
        notifications.push({
          user_id: rel.trainer_id,
          type: 'conflict_detected',
          title: 'Data Conflict Detected',
          message: `${clientName} has ${conflictCount} low-confidence metrics that need review`,
          metadata: {
            client_id: rel.client_id,
            client_name: clientName,
            conflict_count: conflictCount,
          },
        });
      }
    }

    // Insert notifications (avoid duplicates by checking recent notifications)
    if (notifications.length > 0) {
      // Check for existing similar notifications in last 24 hours
      const { data: existingNotifs } = await supabase
        .from('user_notifications')
        .select('id, metadata')
        .in('user_id', notifications.map(n => n.user_id))
        .gte('created_at', oneDayAgo.toISOString());

      // Filter out duplicate notifications
      const uniqueNotifications = notifications.filter(notif => {
        const isDuplicate = existingNotifs?.some(existing => {
          const existingMeta = existing.metadata as any;
          const notifMeta = notif.metadata;
          return (
            existingMeta?.client_id === notifMeta?.client_id &&
            notif.type === 'client_alert' // Only dedupe alerts, not achievements
          );
        });
        return !isDuplicate;
      });

      if (uniqueNotifications.length > 0) {
        const { error: insertError } = await supabase
          .from('user_notifications')
          .insert(uniqueNotifications);

        if (insertError) throw insertError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          generated: uniqueNotifications.length,
          skipped: notifications.length - uniqueNotifications.length,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, generated: 0 }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating notifications:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
