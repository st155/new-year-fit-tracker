import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoalWithProgress {
  id: string;
  goal_name: string;
  goal_type: string;
  target_value: number;
  target_unit: string;
  current_value: number;
  progress_percentage: number;
  created_at: string;
  deadline?: string;
  measurements: Array<{ value: number; measurement_date: string }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { clientId, goalIds, forceRegenerate = false } = await req.json();

    if (!clientId) {
      throw new Error('clientId is required');
    }

    console.log(`[AI Suggest] Analyzing client ${clientId}...`);

    // Check if recent suggestions exist (within last 24 hours)
    if (!forceRegenerate) {
      const { data: recentSuggestions } = await supabase
        .from('ai_goal_suggestions')
        .select('id')
        .eq('client_id', clientId)
        .eq('status', 'pending')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1);

      if (recentSuggestions && recentSuggestions.length > 0) {
        console.log('[AI Suggest] Recent suggestions exist, skipping generation');
        return new Response(
          JSON.stringify({ 
            success: true, 
            suggestions_count: 0,
            message: 'Recent suggestions already exist'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get client profile
    const { data: clientProfile } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('user_id', clientId)
      .single();

    // Get goals with measurements
    let goalsQuery = supabase
      .from('goals')
      .select(`
        id,
        goal_name,
        goal_type,
        target_value,
        target_unit,
        created_at,
        deadline,
        goal_current_values!inner(current_value, last_updated)
      `)
      .eq('user_id', clientId);

    if (goalIds && goalIds.length > 0) {
      goalsQuery = goalsQuery.in('id', goalIds);
    }

    const { data: goals, error: goalsError } = await goalsQuery;
    
    if (goalsError) throw goalsError;
    if (!goals || goals.length === 0) {
      return new Response(
        JSON.stringify({ success: true, suggestions_count: 0, message: 'No goals found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get measurements for each goal (last 30 days)
    const goalsWithProgress: GoalWithProgress[] = await Promise.all(
      goals.map(async (goal: any) => {
        const { data: measurements } = await supabase
          .from('measurements')
          .select('value, measurement_date')
          .eq('goal_id', goal.id)
          .gte('measurement_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .order('measurement_date', { ascending: false });

        const currentValue = goal.goal_current_values?.current_value || 0;
        const progressPercentage = goal.target_value > 0 
          ? Math.min(100, (currentValue / goal.target_value) * 100)
          : 0;

        return {
          id: goal.id,
          goal_name: goal.goal_name,
          goal_type: goal.goal_type,
          target_value: goal.target_value,
          target_unit: goal.target_unit,
          current_value: currentValue,
          progress_percentage: progressPercentage,
          created_at: goal.created_at,
          deadline: goal.deadline,
          measurements: measurements || []
        };
      })
    );

    // Get unified metrics (last 30 days)
    const { data: metrics } = await supabase
      .from('unified_metrics')
      .select('metric_name, value, measurement_date')
      .eq('user_id', clientId)
      .in('metric_name', ['Recovery Score', 'Sleep Duration', 'Day Strain', 'Steps'])
      .gte('measurement_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('measurement_date', { ascending: false });

    // Calculate health metrics averages
    const calculateAvg = (metricName: string) => {
      const values = metrics?.filter(m => m.metric_name === metricName).map(m => m.value) || [];
      return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
    };

    const healthMetrics = {
      recovery: calculateAvg('Recovery Score'),
      sleep: calculateAvg('Sleep Duration'),
      strain: calculateAvg('Day Strain'),
      steps: calculateAvg('Steps')
    };

    // Calculate activity consistency (days with data / total days)
    const daysWithData = new Set(metrics?.map(m => m.measurement_date) || []).size;
    const consistency = (daysWithData / 30) * 100;

    // Build AI prompt
    const clientName = clientProfile?.full_name || clientProfile?.username || 'Клиент';
    
    const goalsDescription = goalsWithProgress.map(g => {
      const daysSinceStart = Math.floor((Date.now() - new Date(g.created_at).getTime()) / (1000 * 60 * 60 * 24));
      const daysToDeadline = g.deadline 
        ? Math.floor((new Date(g.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;
      
      // Calculate trend
      const recent7 = g.measurements.slice(0, 7);
      const prev7 = g.measurements.slice(7, 14);
      const recentAvg = recent7.length > 0 ? recent7.reduce((a, b) => a + b.value, 0) / recent7.length : 0;
      const prevAvg = prev7.length > 0 ? prev7.reduce((a, b) => a + b.value, 0) / prev7.length : 0;
      
      let trend = 'stable';
      if (recentAvg > prevAvg * 1.1) trend = 'improving';
      else if (recentAvg < prevAvg * 0.9) trend = 'declining';
      
      const daysSinceLastMeasurement = g.measurements.length > 0
        ? Math.floor((Date.now() - new Date(g.measurements[0].measurement_date).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      return `
- ${g.goal_name}: ${g.current_value}/${g.target_value} ${g.target_unit}
  Progress: ${g.progress_percentage.toFixed(1)}%
  Trend: ${trend}
  Days since start: ${daysSinceStart}
  Days to deadline: ${daysToDeadline !== null ? daysToDeadline : 'not set'}
  Days since last measurement: ${daysSinceLastMeasurement}
  Measurement count (30d): ${g.measurements.length}`;
    }).join('\n');

    const prompt = `You are an experienced fitness coach analyzing client progress data.

CLIENT: ${clientName}

CURRENT GOALS:
${goalsDescription}

RECENT HEALTH METRICS (30-day averages):
- Recovery Score: ${healthMetrics.recovery ? healthMetrics.recovery.toFixed(1) : 'N/A'}
- Sleep Duration: ${healthMetrics.sleep ? healthMetrics.sleep.toFixed(1) + ' hours' : 'N/A'}
- Day Strain: ${healthMetrics.strain ? healthMetrics.strain.toFixed(1) : 'N/A'}
- Daily Steps: ${healthMetrics.steps ? Math.round(healthMetrics.steps) : 'N/A'}
- Activity Consistency: ${consistency.toFixed(0)}%

ANALYZE each goal and provide suggestions in JSON format. Return ONLY valid JSON, no additional text:
{
  "suggestions": [
    {
      "goal_id": "uuid",
      "suggestion_type": "adjust_target" | "new_goal" | "change_deadline" | "pause_goal" | "celebrate",
      "current_progress": 75.5,
      "progress_trend": "ahead" | "on_track" | "behind" | "stagnant",
      "recommendation_text": "Clear explanation in Russian (2-3 sentences)",
      "suggested_action": {
        "type": "increase_target" | "decrease_target" | "extend_deadline" | "create_goal" | "pause",
        "old_value": 100,
        "new_value": 120,
        "reasoning": "Brief reasoning in Russian"
      },
      "confidence_score": 85,
      "priority": 2
    }
  ]
}

RULES:
- Be specific with numbers
- Consider recovery and overtraining risk (if strain high + recovery low, suggest reduction)
- Celebrate achievements (progress >85%)
- Flag stagnant goals (no measurements in 7+ days)
- Suggest increasing target if ahead of schedule (progress > expected for time elapsed)
- Suggest new related goals when one is nearly complete (>90%)
- Use Russian for recommendation_text and reasoning
- Priority: 1=critical, 2=high, 3=medium, 4=low, 5=optional
- Confidence: how certain you are (0-100)
- Return ONLY the JSON object, no markdown or additional text`;

    console.log('[AI Suggest] Calling Lovable AI...');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[AI Suggest] AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    
    console.log('[AI Suggest] AI response:', aiContent);

    // Parse AI response
    let parsedResponse;
    try {
      // Remove markdown code blocks if present
      const cleanedContent = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedResponse = JSON.parse(cleanedContent);
    } catch (e) {
      console.error('[AI Suggest] Failed to parse AI response:', e);
      throw new Error('Failed to parse AI response as JSON');
    }

    if (!parsedResponse.suggestions || !Array.isArray(parsedResponse.suggestions)) {
      throw new Error('Invalid AI response structure');
    }

    // Save suggestions to database
    const suggestionsToInsert = parsedResponse.suggestions.map((s: any) => ({
      trainer_id: user.id,
      client_id: clientId,
      goal_id: s.goal_id,
      suggestion_type: s.suggestion_type,
      current_progress: s.current_progress,
      progress_trend: s.progress_trend,
      recommendation_text: s.recommendation_text,
      suggested_action: s.suggested_action,
      confidence_score: s.confidence_score,
      priority: s.priority,
      status: 'pending'
    }));

    const { data: insertedSuggestions, error: insertError } = await supabase
      .from('ai_goal_suggestions')
      .insert(suggestionsToInsert)
      .select();

    if (insertError) {
      console.error('[AI Suggest] Insert error:', insertError);
      throw insertError;
    }

    console.log(`[AI Suggest] Created ${insertedSuggestions.length} suggestions`);

    return new Response(
      JSON.stringify({
        success: true,
        suggestions_count: insertedSuggestions.length,
        suggestions: insertedSuggestions,
        analysis_summary: `Проанализировано ${goalsWithProgress.length} целей, создано ${insertedSuggestions.length} рекомендаций`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[AI Suggest] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});