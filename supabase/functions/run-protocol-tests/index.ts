import { createServiceClient } from '../_shared/supabase-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createServiceClient();
    const { userId } = await req.json();

    if (!userId) {
      throw new Error('userId is required');
    }

    console.log('🧪 Starting automated protocol testing for user:', userId);

    // Get a sample product ID
    const { data: products } = await supabase
      .from('supplement_products')
      .select('id')
      .limit(4);

    if (!products || products.length < 4) {
      throw new Error('Not enough supplement products in database');
    }

    const productIds = products.map(p => p.id);

    // 1. Create test protocols
    const testProtocols = [
      {
        user_id: userId,
        stack_name: '🧪 Vitamin D Test Protocol (Active - 88% done)',
        source: 'doctor_rx',
        status: 'active',
        start_date: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        planned_end_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_action: 'prompt_retest',
        product_id: productIds[0],
        target_outcome: 'Improve vitamin D levels to 50+ ng/mL'
      },
      {
        user_id: userId,
        stack_name: '🧪 Omega-3 Completed Protocol (Should trigger alert)',
        source: 'ai_suggestion',
        status: 'active',
        start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        planned_end_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_action: 'prompt_retest',
        product_id: productIds[1],
        target_outcome: 'Reduce inflammation and improve heart health'
      },
      {
        user_id: userId,
        stack_name: '🧪 Magnesium Glycinate Protocol (Active - 30% done)',
        source: 'manual',
        status: 'active',
        start_date: new Date(Date.now() - 27 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        planned_end_date: new Date(Date.now() + 63 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_action: 'prompt_retest',
        product_id: productIds[2],
        target_outcome: 'Support muscle recovery and sleep quality'
      },
      {
        user_id: userId,
        stack_name: '🧪 Vitamin C Protocol (No Alert - end_action=none)',
        source: 'manual',
        status: 'active',
        start_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        planned_end_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_action: 'none',
        product_id: productIds[3]
      }
    ];

    console.log('📝 Inserting test protocols...');
    const { data: insertedProtocols, error: insertError } = await supabase
      .from('user_stack')
      .insert(testProtocols)
      .select();

    if (insertError) {
      console.error('❌ Error inserting protocols:', insertError);
      throw insertError;
    }

    console.log(`✅ Created ${insertedProtocols.length} test protocols`);

    // 2. Call check-completed-protocols function
    console.log('🔄 Calling check-completed-protocols...');
    const checkResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/check-completed-protocols`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      }
    });

    const checkResult = await checkResponse.json();
    console.log('✅ check-completed-protocols result:', checkResult);

    // 3. Verify results
    const { data: completedProtocols } = await supabase
      .from('user_stack')
      .select('stack_name, status')
      .eq('user_id', userId)
      .like('stack_name', '🧪%')
      .eq('status', 'completed');

    const { data: alerts } = await supabase
      .from('protocol_lifecycle_alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const { data: activeProtocols } = await supabase
      .from('user_stack')
      .select('*')
      .eq('user_id', userId)
      .like('stack_name', '🧪%')
      .eq('status', 'active')
      .not('planned_end_date', 'is', null)
      .order('planned_end_date', { ascending: true });

    return new Response(
      JSON.stringify({
        success: true,
        message: '✅ Automated testing completed',
        test_data: {
          protocols_created: insertedProtocols.length,
          protocols_completed: completedProtocols?.length || 0,
          alerts_created: alerts?.length || 0,
          active_protocols_count: activeProtocols?.length || 0
        },
        edge_function_result: checkResult,
        verification: {
          completed_protocols: completedProtocols?.map(p => p.stack_name) || [],
          alerts: alerts?.map(a => ({
            protocol: a.protocol_id,
            type: a.alert_type,
            is_read: a.is_read,
            dismissed: a.dismissed_at !== null
          })) || [],
          active_protocols: activeProtocols?.map(p => ({
            name: p.stack_name,
            progress: Math.round(
              ((new Date().getTime() - new Date(p.start_date).getTime()) / 
               (new Date(p.planned_end_date).getTime() - new Date(p.start_date).getTime())) * 100
            ),
            days_remaining: Math.ceil(
              (new Date(p.planned_end_date).getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000)
            )
          })) || []
        },
        instructions: {
          next_steps: [
            '1. Check dashboard at / to see ActiveProtocolsWidget',
            '2. Verify LifecycleAlertsPanel shows new alerts',
            '3. Test "Schedule Re-test" button navigation',
            '4. Test "Dismiss" button functionality',
            '5. Clean up test data using /clean-protocol-tests endpoint'
          ]
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Test execution failed:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
