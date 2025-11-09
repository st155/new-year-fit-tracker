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
      actions,
      autoExecuted = false
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
          
          case 'create_training_plan':
            result = await executeCreateTrainingPlan(supabaseClient, user.id, action.data);
            break;

          default:
            throw new Error(`Unknown action type: ${action.type}`);
        }

        // Build detailed result message
        let resultMessage = '';
        if (action.type === 'add_measurement' && result) {
          const operation = result._operation || 'created';
          if (operation === 'updated' && result._old_value !== null) {
            resultMessage = `Измерение обновлено: ${result._old_value} → ${result.value} ${result.unit}`;
          } else {
            resultMessage = `Измерение добавлено: ${result.value} ${result.unit}`;
          }
        } else if (action.type === 'update_goal' && result) {
          resultMessage = `Цель обновлена: target = ${result.target_value} ${result.target_unit}`;
        }
        
        executionResults.push({
          action: action.type,
          success: true,
          data: result,
          message: resultMessage
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
        console.error(`❌ Error executing action ${action.type}:`, {
          action_data: action.data,
          error_message: error.message,
          error_details: error
        });
        
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

    // Update pending action status if provided (skip for auto-executed)
    if (pendingActionId && !autoExecuted) {
      await supabaseClient
        .from('ai_pending_actions')
        .update({
          status: 'executed',
          executed_at: new Date().toISOString()
        })
        .eq('id', pendingActionId);
    }

    // Add detailed completion message to conversation
    if (conversationId && !autoExecuted) {
      const successCount = executionResults.filter(r => r.success).length;
      const failCount = executionResults.filter(r => !r.success).length;
      
      // Build detailed message
      let detailedMessage = `✅ Выполнено действий: ${successCount}${failCount > 0 ? `, ошибок: ${failCount}` : ''}.\n\n`;
      
      // Add details for each successful action
      const successfulActions = executionResults.filter(r => r.success && r.message);
      if (successfulActions.length > 0) {
        detailedMessage += 'Детали:\n';
        successfulActions.forEach((result, idx) => {
          detailedMessage += `${idx + 1}. ${result.message}\n`;
        });
      }
      
      await supabaseClient.from('ai_messages').insert({
        conversation_id: conversationId,
        role: 'system',
        content: detailedMessage.trim()
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
  
  console.log(`🔍 executeUpdateGoalByName: searching for goal "${goal_name}" for client ${client_id}`);
  
  // Validate that client belongs to trainer
  const { data: clientCheck, error: clientError } = await supabase
    .from('trainer_clients')
    .select('id')
    .eq('trainer_id', trainerId)
    .eq('client_id', client_id)
    .eq('active', true)
    .maybeSingle();
    
  if (clientError || !clientCheck) {
    console.error(`❌ Client validation failed:`, clientError);
    throw new Error(`Client ${client_id} not found or not assigned to trainer`);
  }
  
  // Find all goals with this name for this client (may have duplicates)
  const { data: goals, error: goalsError } = await supabase
    .from('goals')
    .select('id, is_personal, created_at, updated_at, challenge_id')
    .eq('user_id', client_id)
    .ilike('goal_name', goal_name)
    .order('is_personal', { ascending: false })  // Personal goals first
    .order('updated_at', { ascending: false });  // Most recent first
  
  if (goalsError) {
    console.error(`❌ Error fetching goals:`, goalsError);
    throw goalsError;
  }
  
  if (!goals || goals.length === 0) {
    throw new Error(`Goal "${goal_name}" not found for client ${client_id}`);
  }
  
  console.log(`📊 Found ${goals.length} goal(s) with name "${goal_name}":`, goals.map(g => ({ id: g.id, is_personal: g.is_personal, challenge_id: g.challenge_id })));
  
  // Pick the first one (personal + most recent)
  const selectedGoal = goals[0];
  console.log(`✅ Selected goal ID: ${selectedGoal.id} (is_personal: ${selectedGoal.is_personal})`);
  
  // Update the selected goal
  const { data: result, error } = await supabase
    .from('goals')
    .update({
      target_value,
      ...(target_unit && { target_unit }),
      updated_at: new Date().toISOString()
    })
    .eq('id', selectedGoal.id)
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
  
  console.log(`📊 Adding/updating measurement:`, { goal_id, goal_name, client_id, value, unit, measurement_date });
  
  let finalGoalId = goal_id;
  let finalUserId = user_id || client_id;
  
  // If goal_name is provided instead of goal_id, find the goal
  if (!finalGoalId && goal_name && finalUserId) {
    const { data: goalData, error: goalError } = await supabase
      .from('goals')
      .select('id, user_id, goal_name, target_unit')
      .eq('user_id', finalUserId)
      .ilike('goal_name', goal_name)
      .order('is_personal', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (goalError || !goalData) {
      console.error(`❌ Goal not found: ${goal_name} for user ${finalUserId}`);
      throw new Error(`Goal "${goal_name}" not found for user ${finalUserId}`);
    }
    
    finalGoalId = goalData.id;
    finalUserId = goalData.user_id;
    console.log(`✅ Found goal: ${goalData.goal_name} (${finalGoalId})`);
  }
  
  // Validate that goal exists and belongs to user
  if (finalGoalId) {
    const { data: goal, error: goalCheckError } = await supabase
      .from('goals')
      .select('id, user_id, goal_name')
      .eq('id', finalGoalId)
      .maybeSingle();
      
    if (goalCheckError || !goal) {
      throw new Error(`Goal ${finalGoalId} not found`);
    }
    
    if (finalUserId && goal.user_id !== finalUserId) {
      throw new Error(`Goal ${finalGoalId} does not belong to user ${finalUserId}`);
    }
    
    finalUserId = goal.user_id;
  }
  
  // Calculate measurement date (default to today if not provided)
  const finalMeasurementDate = measurement_date || new Date().toISOString().split('T')[0];
  
  // Check if measurement already exists for this date
  const { data: existing, error: checkError } = await supabase
    .from('measurements')
    .select('id, value, unit')
    .eq('goal_id', finalGoalId)
    .eq('user_id', finalUserId)
    .eq('measurement_date', finalMeasurementDate)
    .maybeSingle();
  
  if (checkError) {
    console.error('❌ Error checking existing measurement:', checkError);
  }
  
  let result;
  let operationType: 'created' | 'updated' = 'created';
  let oldValue = null;
  
  if (existing) {
    // Update existing measurement
    oldValue = existing.value;
    console.log(`🔄 Updating existing measurement for ${finalMeasurementDate}: ${oldValue} → ${value}`);
    
    const { data: updated, error: updateError } = await supabase
      .from('measurements')
      .update({
        value,
        unit,
        source: 'ai_trainer',
        verified_by_trainer: true,
        ...(notes && { notes }),
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Error updating measurement:', updateError);
      throw updateError;
    }
    
    result = updated;
    operationType = 'updated';
    
  } else {
    // Insert new measurement
    console.log(`➕ Creating new measurement for ${finalMeasurementDate}: ${value}`);
    
    const { data: inserted, error: insertError } = await supabase
      .from('measurements')
      .insert({
        goal_id: finalGoalId,
        user_id: finalUserId,
        value,
        unit,
        measurement_date: finalMeasurementDate,
        source: 'ai_trainer',
        verified_by_trainer: true,
        ...(notes && { notes })
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error inserting measurement:', insertError);
      throw insertError;
    }
    
    result = inserted;
  }
  
  console.log(`✅ Measurement ${operationType}: ${value} ${unit} for goal ${finalGoalId} on ${finalMeasurementDate}`);
  
  return {
    ...result,
    _operation: operationType,
    _old_value: oldValue
  };
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

async function executeCreateTrainingPlan(supabase: any, trainerId: string, data: any) {
  const { client_id, plan_name, description, duration_weeks, workouts } = data;
  
  console.log(`Creating training plan "${plan_name}" for client ${client_id}`);
  
  // Validate that client belongs to trainer
  const { data: clientCheck, error: clientError } = await supabase
    .from('trainer_clients')
    .select('id')
    .eq('trainer_id', trainerId)
    .eq('client_id', client_id)
    .eq('active', true)
    .maybeSingle();
    
  if (clientError || !clientCheck) {
    throw new Error(`Client ${client_id} not found or not assigned to trainer`);
  }
  
  // 1. Create the training plan
  const { data: plan, error: planError } = await supabase
    .from('training_plans')
    .insert({
      trainer_id: trainerId,
      name: plan_name,
      description: description || '',
      duration_weeks: duration_weeks || 4
    })
    .select()
    .single();

  if (planError) {
    console.error('Error creating training plan:', planError);
    throw planError;
  }

  console.log(`✅ Created plan: ${plan.name} (${plan.id})`);

  // 2. Create workouts with exercises
  if (workouts && workouts.length > 0) {
    const workoutsToInsert = workouts.map((w: any) => ({
      plan_id: plan.id,
      day_of_week: w.day_of_week,
      workout_name: w.workout_name,
      description: w.description || null,
      exercises: w.exercises // JSONB array
    }));

    const { error: workoutsError } = await supabase
      .from('training_plan_workouts')
      .insert(workoutsToInsert);

    if (workoutsError) {
      console.error('Error creating workouts:', workoutsError);
      throw workoutsError;
    }

    console.log(`✅ Created ${workoutsToInsert.length} workouts`);
  }

  // 3. Assign plan to client
  const { error: assignError } = await supabase
    .from('assigned_training_plans')
    .insert({
      plan_id: plan.id,
      client_id: client_id,
      assigned_by: trainerId,
      start_date: new Date().toISOString().split('T')[0],
      status: 'active'
    });

  if (assignError) {
    console.error('Error assigning plan:', assignError);
    throw assignError;
  }

  console.log(`✅ Assigned plan to client ${client_id}`);

  return {
    plan_id: plan.id,
    plan_name: plan.name,
    workouts_count: workouts?.length || 0
  };
}
