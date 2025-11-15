import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAuthClient } from '../_shared/supabase-client.ts';
import { createAIClient, AIProvider } from '../_shared/ai-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createAuthClient(authHeader);
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { user_id } = await req.json();
    
    // Verify user is requesting their own plan
    if (user_id !== user.id) {
      throw new Error('Unauthorized: Can only generate plans for yourself');
    }

    console.log('[generate-ai-training-plan] Fetching preferences for user:', user_id);

    // Fetch user's AI training preferences
    const { data: preferences, error: prefError } = await supabase
      .from('ai_training_preferences')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (prefError || !preferences) {
      throw new Error('No training preferences found. Please complete onboarding first.');
    }

    console.log('[generate-ai-training-plan] Preferences:', preferences);

    // Build AI prompt
    const equipmentList = Array.isArray(preferences.equipment) 
      ? preferences.equipment.join(', ') 
      : 'bodyweight';

    const masterPrompt = `You are an elite strength coach. Generate a weekly training template.

User Profile:
- Primary Goal: ${preferences.primary_goal}
- Experience Level: ${preferences.experience_level}
- Training Days per Week: ${preferences.days_per_week}
- Available Equipment: ${equipmentList}
- Preferred Workout Duration: ${preferences.preferred_workout_duration || 60} minutes
- Injuries/Limitations: ${preferences.injuries_limitations || 'None'}

Requirements:
1. Create ${preferences.days_per_week} weekly workouts optimized for their goal
2. Include specific exercises with sets, reps (as ranges like "8-12"), RPE, and rest periods
3. Balance volume and intensity for ${preferences.experience_level} level
4. Organize by day of week (0=Sunday, 6=Saturday)

Generate a weekly template that will be repeated with progressive overload.`;

    console.log('[generate-ai-training-plan] Calling Lovable AI...');

    // Call Lovable AI with simplified tool calling
    const aiClient = createAIClient(AIProvider.LOVABLE);
    const aiResponse = await aiClient.complete({
      messages: [
        {
          role: 'system',
          content: 'You are an expert strength coach. Generate structured weekly training templates in valid JSON format.'
        },
        {
          role: 'user',
          content: masterPrompt
        }
      ],
      model: 'google/gemini-2.5-flash',
      maxTokens: 3000,
      tools: [
        {
          type: 'function',
          function: {
            name: 'generate_weekly_template',
            description: 'Generate a weekly training template',
            parameters: {
              type: 'object',
              properties: {
                program_name: { type: 'string' },
                weekly_workouts: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      day_of_week: { type: 'number' },
                      workout_name: { type: 'string' },
                      exercises: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            name: { type: 'string' },
                            sets: { type: 'number' },
                            reps: { type: 'string' },
                            rpe: { type: 'number' },
                            rest_seconds: { type: 'number' },
                            notes: { type: 'string' }
                          },
                          required: ['name', 'sets', 'reps']
                        }
                      }
                    },
                    required: ['day_of_week', 'workout_name', 'exercises']
                  }
                }
              },
              required: ['program_name', 'weekly_workouts']
            }
          }
        }
      ],
      tool_choice: { type: 'function', function: { name: 'generate_weekly_template' } }
    });

    console.log('[generate-ai-training-plan] AI Response received');

    // Parse AI response
    let programData;
    if (aiResponse.tool_calls && aiResponse.tool_calls.length > 0) {
      programData = JSON.parse(aiResponse.tool_calls[0].function.arguments);
    } else {
      throw new Error('AI did not return structured training program');
    }

    console.log('[generate-ai-training-plan] Template generated:', programData.program_name);

    // Save training plan to database (12-week duration with auto-progression)
    const { data: newPlan, error: planError } = await supabase
      .from('training_plans')
      .insert({
        trainer_id: user_id,
        name: programData.program_name,
        description: `AI-generated ${preferences.primary_goal} program for ${preferences.experience_level} level`,
        duration_weeks: 12,
        is_ai_generated: true,
        generation_prompt: masterPrompt,
        ai_metadata: {
          preferences,
          weekly_template: programData.weekly_workouts,
          progression: 'auto_2.5_percent'
        }
      })
      .select()
      .single();

    if (planError) {
      console.error('[generate-ai-training-plan] Error creating plan:', planError);
      throw planError;
    }

    console.log('[generate-ai-training-plan] Plan created:', newPlan.id);

    // Duplicate weekly template for 12 weeks with auto-progression
    const workoutsToInsert = [];
    for (let week = 1; week <= 12; week++) {
      for (const workout of programData.weekly_workouts) {
        workoutsToInsert.push({
          plan_id: newPlan.id,
          day_of_week: workout.day_of_week,
          workout_name: `Week ${week}: ${workout.workout_name}`,
          exercises: workout.exercises
        });
      }
    }

    const { error: workoutsError } = await supabase
      .from('training_plan_workouts')
      .insert(workoutsToInsert);

    if (workoutsError) {
      console.error('[generate-ai-training-plan] Error creating workouts:', workoutsError);
      throw workoutsError;
    }

    console.log('[generate-ai-training-plan] Workouts created:', workoutsToInsert.length);

    // Auto-assign plan to user
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (programData.duration_weeks * 7));

    const { error: assignError } = await supabase
      .from('assigned_training_plans')
      .insert({
        plan_id: newPlan.id,
        client_id: user_id,
        assigned_by: user_id,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        status: 'active'
      });

    if (assignError) {
      console.error('[generate-ai-training-plan] Error assigning plan:', assignError);
      throw assignError;
    }

    console.log('[generate-ai-training-plan] Plan assigned to user');

    return new Response(
      JSON.stringify({
        success: true,
        plan: newPlan,
        workout_count: workoutsToInsert.length,
        weeks: 12,
        template: programData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-ai-training-plan] Error:', error);
    
    if (error.message?.includes('429')) {
      return new Response(
        JSON.stringify({ error: 'AI service rate limit exceeded. Please try again in a few moments.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (error.message?.includes('402')) {
      return new Response(
        JSON.stringify({ error: 'AI credits depleted. Please add credits to your workspace.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate training plan' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
