import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createServiceClient } from "../_shared/supabase-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createServiceClient();
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Unauthorized');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { pending_action_id, conversation_id, actions } = await req.json();

    console.log('⚡ Executing AI actions:', { pending_action_id, actions_count: actions?.length });

    const results = [];

    // Execute each action
    for (const action of actions || []) {
      try {
        let result;

        switch (action.type) {
          case 'create_goal':
            result = await supabase.rpc('create_goal', {
              p_user_id: action.data.client_id,
              p_goal_type: action.data.goal_type,
              p_target_value: action.data.target_value,
              p_target_date: action.data.target_date,
              p_description: action.data.description
            });
            break;

          case 'update_goal':
            result = await supabase
              .from('goals')
              .update({
                target_value: action.data.target_value,
                target_date: action.data.target_date,
                description: action.data.description
              })
              .eq('id', action.data.goal_id);
            break;

          case 'delete_goal':
            result = await supabase
              .from('goals')
              .delete()
              .eq('id', action.data.goal_id);
            break;

          case 'add_measurement':
            result = await supabase
              .from('unified_metrics')
              .insert({
                user_id: action.data.client_id,
                metric_type: action.data.metric_type,
                value: action.data.value,
                recorded_at: action.data.recorded_at || new Date().toISOString()
              });
            break;

          case 'create_task':
            result = await supabase
              .from('client_tasks')
              .insert({
                client_id: action.data.client_id,
                trainer_id: user.id,
                title: action.data.title,
                description: action.data.description,
                priority: action.data.priority || 'medium',
                due_date: action.data.due_date
              });
            break;

          case 'create_training_plan':
            result = await supabase
              .from('training_plans')
              .insert({
                trainer_id: user.id,
                name: action.data.name,
                description: action.data.description,
                duration_weeks: action.data.duration_weeks
              });
            break;

          case 'assign_training_plan':
            result = await supabase
              .from('assigned_training_plans')
              .insert({
                plan_id: action.data.plan_id,
                client_id: action.data.client_id,
                trainer_id: user.id,
                start_date: action.data.start_date || new Date().toISOString(),
                status: 'active'
              });
            break;

          default:
            throw new Error(`Unknown action type: ${action.type}`);
        }

        // Log successful action
        await supabase
          .from('ai_action_logs')
          .insert({
            trainer_id: user.id,
            client_id: action.data.client_id,
            conversation_id,
            action_type: action.type,
            action_details: action.data,
            success: !result.error,
            error_message: result.error?.message
          });

        results.push({
          action_type: action.type,
          success: !result.error,
          error: result.error?.message,
          data: result.data
        });

      } catch (error) {
        console.error(`❌ Error executing action ${action.type}:`, error);
        results.push({
          action_type: action.type,
          success: false,
          error: error.message
        });

        // Log failed action
        await supabase
          .from('ai_action_logs')
          .insert({
            trainer_id: user.id,
            client_id: action.data?.client_id,
            conversation_id,
            action_type: action.type,
            action_details: action.data,
            success: false,
            error_message: error.message
          });
      }
    }

    // Update pending action status
    if (pending_action_id) {
      await supabase
        .from('ai_pending_actions')
        .update({ 
          status: 'completed',
          executed_at: new Date().toISOString()
        })
        .eq('id', pending_action_id);
    }

    // Add summary message to conversation
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    const summaryMessage = `✅ Выполнено действий: ${successCount}${failCount > 0 ? ` | ❌ Ошибок: ${failCount}` : ''}`;

    await supabase
      .from('ai_messages')
      .insert({
        conversation_id,
        role: 'assistant',
        content: summaryMessage
      });

    console.log('✅ Actions executed:', { success: successCount, failed: failCount });

    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary: { success_count: successCount, fail_count: failCount }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Execute actions error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
