import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[CHECK-RETEST] Starting retest suggestions check');

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`[CHECK-RETEST] Checking retest suggestions for user ${user.id}`);

    const suggestions = [];
    const today = new Date();
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(today.getDate() + 14);

    // CASE 1: Find protocols/supplements approaching planned_end_date
    const { data: endingProtocols, error: endingError } = await supabase
      .from('user_stack')
      .select(`
        id,
        stack_name,
        planned_end_date,
        start_date,
        linked_biomarker_ids,
        end_action,
        supplement_products (
          name
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .not('planned_end_date', 'is', null)
      .lte('planned_end_date', twoWeeksFromNow.toISOString())
      .gte('planned_end_date', today.toISOString());

    if (endingError) {
      console.error('[CHECK-RETEST] Error fetching ending protocols:', endingError);
    } else if (endingProtocols && endingProtocols.length > 0) {
      console.log(`[CHECK-RETEST] Found ${endingProtocols.length} protocols approaching end date`);

      for (const protocol of endingProtocols) {
        const endDate = new Date(protocol.planned_end_date);
        const daysUntilEnd = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        // Calculate protocol duration in weeks
        const startDate = new Date(protocol.start_date);
        const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const durationWeeks = Math.ceil(durationDays / 7);

        suggestions.push({
          type: 'retest_approaching_end',
          stack_item_id: protocol.id,
          supplement_name: protocol.supplement_products?.name || protocol.stack_name,
          linked_biomarker_ids: protocol.linked_biomarker_ids || [],
          priority: daysUntilEnd <= 7 ? 'high' : 'medium',
          title: `Протокол завершается через ${daysUntilEnd} дней`,
          message: `Рекомендуем пересдать анализы после ${durationWeeks} недель приёма ${protocol.supplement_products?.name || protocol.stack_name}`,
          action_label: 'Запланировать пересдачу',
          action_url: '/medical-documents',
          days_until_action: daysUntilEnd,
        });
      }
    }

    // CASE 2: Find supplements taken for 8+ weeks without new lab results
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(today.getDate() - 56);

    const { data: longTermSupplements, error: longTermError } = await supabase
      .from('user_stack')
      .select(`
        id,
        stack_name,
        start_date,
        linked_biomarker_ids,
        supplement_products (
          name
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .not('linked_biomarker_ids', 'is', null)
      .lte('start_date', eightWeeksAgo.toISOString());

    if (longTermError) {
      console.error('[CHECK-RETEST] Error fetching long-term supplements:', longTermError);
    } else if (longTermSupplements && longTermSupplements.length > 0) {
      console.log(`[CHECK-RETEST] Found ${longTermSupplements.length} long-term supplements`);

      for (const supplement of longTermSupplements) {
        if (!supplement.linked_biomarker_ids || supplement.linked_biomarker_ids.length === 0) {
          continue;
        }

        // Check if there are any lab results for linked biomarkers after start_date
        const { data: recentTests, error: testsError } = await supabase
          .from('lab_test_results')
          .select('test_date, biomarker_id')
          .eq('user_id', user.id)
          .in('biomarker_id', supplement.linked_biomarker_ids)
          .gte('test_date', supplement.start_date)
          .order('test_date', { ascending: false })
          .limit(1);

        if (testsError) {
          console.error('[CHECK-RETEST] Error checking recent tests:', testsError);
          continue;
        }

        // If no tests after start_date, or last test was > 4 weeks ago, suggest retest
        const shouldSuggestRetest = !recentTests || recentTests.length === 0 || 
          (recentTests[0] && new Date(recentTests[0].test_date).getTime() < (today.getTime() - (28 * 24 * 60 * 60 * 1000)));

        if (shouldSuggestRetest) {
          const daysSinceStart = Math.ceil((today.getTime() - new Date(supplement.start_date).getTime()) / (1000 * 60 * 60 * 24));
          const weeksSinceStart = Math.ceil(daysSinceStart / 7);

          suggestions.push({
            type: 'retest_no_recent_data',
            stack_item_id: supplement.id,
            supplement_name: supplement.supplement_products?.name || supplement.stack_name,
            linked_biomarker_ids: supplement.linked_biomarker_ids,
            priority: weeksSinceStart >= 12 ? 'high' : 'medium',
            title: `Пора проверить эффективность`,
            message: `Вы принимаете ${supplement.supplement_products?.name || supplement.stack_name} уже ${weeksSinceStart} недель. Пересдайте анализы, чтобы оценить результат`,
            action_label: 'Запланировать пересдачу',
            action_url: '/medical-documents',
            weeks_since_start: weeksSinceStart,
          });
        }
      }
    }

    console.log(`[CHECK-RETEST] Generated ${suggestions.length} retest suggestions`);

    // Save suggestions to protocol_lifecycle_alerts table
    if (suggestions.length > 0) {
      const alerts = suggestions.map(s => ({
        user_id: user.id,
        protocol_id: s.stack_item_id || null,
        alert_type: 'retest_prompt',
        message: s.message,
        is_read: false,
      }));

      const { error: insertError } = await supabase
        .from('protocol_lifecycle_alerts')
        .insert(alerts);

      if (insertError) {
        console.error('[CHECK-RETEST] Error saving alerts:', insertError);
        throw insertError;
      }

      console.log(`[CHECK-RETEST] ✅ Saved ${alerts.length} alerts to protocol_lifecycle_alerts table`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        suggestions_count: suggestions.length,
        suggestions,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[CHECK-RETEST] ❌ Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
