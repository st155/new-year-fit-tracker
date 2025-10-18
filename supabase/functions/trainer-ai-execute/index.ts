import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      pendingActionId,
      conversationId,
      actionPlan,
      actions
    } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    console.log('AI Execute request:', { pendingActionId, conversationId, actionsCount: actions?.length });

    const executionResults = [];

    // Execute each action
    for (const action of actions) {
      try {
        // Validate action structure
        if (!action || !action.type) {
          console.error('Invalid action structure:', action);
          throw new Error('Invalid action: missing type');
        }
        
        if (!action.data) {
          console.error('Invalid action: missing data', action);
          throw new Error('Invalid action: missing data');
        }
        
        let result;
        
        switch (action.type) {
          case 'update_goal':
            // Check if it's update by name or by ID
            if (action.data.goal_name && !action.data.goal_id) {
              result = await executeUpdateGoalByName(supabaseClient, user.id, action.data);
            } else {
              result = await executeUpdateGoal(supabaseClient, action.data);
            }
            break;
          
          case 'create_goal':
            result = await executeCreateGoal(supabaseClient, user.id, action.data);
            break;
          
          case 'add_measurement':
            result = await executeAddMeasurement(supabaseClient, action.data);
            break;
          
          case 'create_task':
            result = await executeCreateTask(supabaseClient, user.id, action.data);
            break;
          
          case 'update_task':
            result = await executeUpdateTask(supabaseClient, action.data);
            break;

          default:
            throw new Error(`Unknown action type: ${action.type}`);
        }

        executionResults.push({
          action: action.type,
          success: true,
          data: result
        });

        // Log successful action
        await supabaseClient.from('ai_action_logs').insert({
          trainer_id: user.id,
          conversation_id: conversationId,
          pending_action_id: pendingActionId,
          client_id: action.data?.client_id || action.data?.user_id || null,
          action_type: action.type,
          action_details: action.data,
          success: true
        });

      } catch (error) {
        console.error(`Error executing action ${action.type}:`, error);
        
        executionResults.push({
          action: action.type,
          success: false,
          error: error.message
        });

        // Log failed action
        await supabaseClient.from('ai_action_logs').insert({
          trainer_id: user.id,
          conversation_id: conversationId,
          pending_action_id: pendingActionId,
          client_id: action.data?.client_id || action.data?.user_id || null,
          action_type: action.type,
          action_details: action.data,
          success: false,
          error_message: error.message
        });
      }
    }

    // Update pending action status if provided
    if (pendingActionId) {
      await supabaseClient
        .from('ai_pending_actions')
        .update({
          status: 'executed',
          executed_at: new Date().toISOString()
        })
        .eq('id', pendingActionId);
    }

    // Add completion message to conversation
    if (conversationId) {
      const successCount = executionResults.filter(r => r.success).length;
      const failCount = executionResults.filter(r => !r.success).length;
      
      await supabaseClient.from('ai_messages').insert({
        conversation_id: conversationId,
        role: 'system',
        content: `✅ Executed ${successCount} action(s) successfully${failCount > 0 ? `, ${failCount} failed` : ''}.`
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        results: executionResults
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in trainer-ai-execute:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Action executors
async function executeUpdateGoal(supabase: any, data: any) {
  const { goal_id, target_value, target_unit, notes } = data;
  
  const { data: result, error } = await supabase
    .from('goals')
    .update({
      target_value,
      ...(target_unit && { target_unit }),
      updated_at: new Date().toISOString()
    })
    .eq('id', goal_id)
    .select()
    .single();

  if (error) throw error;
  return result;
}

async function executeUpdateGoalByName(supabase: any, trainerId: string, data: any) {
  const { client_id, goal_name, target_value, target_unit } = data;
  
  console.log(`Updating goal "${goal_name}" for client ${client_id}:`, { target_value, target_unit });
  
  // Validate that client belongs to trainer
  const { data: clientCheck, error: clientError } = await supabase
    .from('trainer_clients')
    .select('id')
    .eq('trainer_id', trainerId)
    .eq('client_id', client_id)
    .eq('active', true)
    .single();
    
  if (clientError || !clientCheck) {
    throw new Error(`Client ${client_id} not found or not assigned to trainer`);
  }
  
  // Find goal by name for this client
  const { data: existingGoal, error: findError } = await supabase
    .from('goals')
    .select('id')
    .eq('user_id', client_id)
    .ilike('goal_name', goal_name)
    .single();
  
  if (findError || !existingGoal) {
    throw new Error(`Goal "${goal_name}" not found for client ${client_id}`);
  }
  
  // Update the goal
  const { data: result, error } = await supabase
    .from('goals')
    .update({
      target_value,
      ...(target_unit && { target_unit }),
      updated_at: new Date().toISOString()
    })
    .eq('id', existingGoal.id)
    .select()
    .single();

  if (error) throw error;
  return result;
}

async function executeCreateGoal(supabase: any, trainerId: string, data: any) {
  const { client_id, goal_name, goal_type, target_value, target_unit, challenge_id } = data;
  
  console.log(`Creating goal for client ${client_id}:`, { goal_name, target_value, target_unit });
  
  // Validate that client belongs to trainer
  const { data: clientCheck, error: clientError } = await supabase
    .from('trainer_clients')
    .select('id')
    .eq('trainer_id', trainerId)
    .eq('client_id', client_id)
    .eq('active', true)
    .single();
    
  if (clientError || !clientCheck) {
    throw new Error(`Client ${client_id} not found or not assigned to trainer`);
  }
  
  const { data: result, error } = await supabase
    .from('goals')
    .insert({
      user_id: client_id,
      goal_name,
      goal_type,
      target_value,
      target_unit,
      is_personal: !challenge_id,
      ...(challenge_id && { challenge_id })
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating goal:', error);
    throw error;
  }
  
  console.log(`✅ Created goal: ${goal_name} (${target_value} ${target_unit}) for client ${client_id}`);
  return result;
}

async function executeAddMeasurement(supabase: any, data: any) {
  const { goal_id, user_id, client_id, goal_name, value, unit, measurement_date, notes } = data;
  
  console.log(`Adding measurement:`, { goal_id, goal_name, client_id, value, unit });
  
  let finalGoalId = goal_id;
  let finalUserId = user_id || client_id;
  
  // If goal_name is provided instead of goal_id, find the goal
  if (!finalGoalId && goal_name && finalUserId) {
    const { data: goalData, error: goalError } = await supabase
      .from('goals')
      .select('id, user_id, goal_name, target_unit')
      .eq('user_id', finalUserId)
      .eq('goal_name', goal_name)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (goalError || !goalData) {
      console.error(`Goal not found: ${goal_name} for user ${finalUserId}`);
      throw new Error(`Goal "${goal_name}" not found for user ${finalUserId}`);
    }
    
    finalGoalId = goalData.id;
    finalUserId = goalData.user_id;
    console.log(`Found goal: ${goalData.goal_name} (${finalGoalId})`);
  }
  
  // Validate that goal exists and belongs to user
  if (finalGoalId) {
    const { data: goal, error: goalCheckError } = await supabase
      .from('goals')
      .select('id, user_id, goal_name')
      .eq('id', finalGoalId)
      .single();
      
    if (goalCheckError || !goal) {
      throw new Error(`Goal ${finalGoalId} not found`);
    }
    
    if (finalUserId && goal.user_id !== finalUserId) {
      throw new Error(`Goal ${finalGoalId} does not belong to user ${finalUserId}`);
    }
    
    finalUserId = goal.user_id;
  }
  
  const { data: result, error } = await supabase
    .from('measurements')
    .insert({
      goal_id: finalGoalId,
      user_id: finalUserId,
      value,
      unit,
      measurement_date: measurement_date || new Date().toISOString().split('T')[0],
      source: 'ai_trainer',
      verified_by_trainer: true,
      ...(notes && { notes })
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding measurement:', error);
    throw error;
  }
  
  console.log(`✅ Added measurement: ${value} ${unit} for goal ${finalGoalId}`);
  return result;
}

async function executeCreateTask(supabase: any, trainerId: string, data: any) {
  const { client_id, title, description, task_type, priority, deadline } = data;
  
  const { data: result, error } = await supabase
    .from('client_tasks')
    .insert({
      trainer_id: trainerId,
      client_id,
      title,
      description,
      task_type: task_type || 'general',
      priority: priority || 'normal',
      status: 'pending',
      ...(deadline && { deadline })
    })
    .select()
    .single();

  if (error) throw error;
  return result;
}

async function executeUpdateTask(supabase: any, data: any) {
  const { task_id, status, priority, deadline, notes } = data;
  
  const updateData: any = { updated_at: new Date().toISOString() };
  if (status) updateData.status = status;
  if (priority) updateData.priority = priority;
  if (deadline) updateData.deadline = deadline;
  if (notes) updateData.description = notes;
  
  const { data: result, error } = await supabase
    .from('client_tasks')
    .update(updateData)
    .eq('id', task_id)
    .select()
    .single();

  if (error) throw error;
  return result;
}
