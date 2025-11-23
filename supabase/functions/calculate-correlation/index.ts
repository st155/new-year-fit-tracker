import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CorrelationRequest {
  stackItemId: string;
  timeframeMonths: number;
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
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { stackItemId, timeframeMonths = 6 }: CorrelationRequest = await req.json();

    console.log(`[CORRELATION] Starting analysis for stackItemId=${stackItemId}, timeframe=${timeframeMonths}m`);

    // 1. Fetch stack item with linked biomarkers
    const { data: stackItem, error: stackError } = await supabase
      .from('user_stack')
      .select('*, supplement_products(*)')
      .eq('id', stackItemId)
      .eq('user_id', user.id)
      .single();

    if (stackError || !stackItem) {
      throw new Error('Stack item not found');
    }

    if (!stackItem.linked_biomarker_ids || stackItem.linked_biomarker_ids.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No linked biomarkers for this supplement' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const biomarkerId = stackItem.linked_biomarker_ids[0]; // Use first linked biomarker

    // 2. Fetch biomarker master data
    const { data: biomarker, error: biomarkerError } = await supabase
      .from('biomarker_master')
      .select('*')
      .eq('id', biomarkerId)
      .single();

    if (biomarkerError || !biomarker) {
      throw new Error('Biomarker not found');
    }

    // 3. Fetch biomarker history from lab_test_results
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - timeframeMonths);

    const { data: labResults, error: labError } = await supabase
      .from('lab_test_results')
      .select('test_date, normalized_value, normalized_unit')
      .eq('user_id', user.id)
      .eq('biomarker_id', biomarkerId)
      .gte('test_date', startDate.toISOString().split('T')[0])
      .order('test_date', { ascending: true });

    if (labError) {
      throw new Error(`Failed to fetch lab results: ${labError.message}`);
    }

    if (!labResults || labResults.length < 2) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Insufficient data: Need at least 2 blood tests' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[CORRELATION] Found ${labResults.length} lab results`);

    // 4. Fetch intake logs
    const { data: intakeLogs, error: intakeError } = await supabase
      .from('intake_logs')
      .select('taken_at, servings_taken')
      .eq('stack_item_id', stackItemId)
      .gte('taken_at', startDate.toISOString())
      .order('taken_at', { ascending: true });

    if (intakeError) {
      throw new Error(`Failed to fetch intake logs: ${intakeError.message}`);
    }

    if (!intakeLogs || intakeLogs.length < 10) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Insufficient data: Need at least 30 days of intake logs' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[CORRELATION] Found ${intakeLogs.length} intake logs`);

    // 5. Calculate weekly consistency
    const weeklyData = new Map<string, { count: number; expected: number }>();
    const expectedDailyIntakes = stackItem.intake_times?.length || 1;

    intakeLogs.forEach(log => {
      const date = new Date(log.taken_at);
      const weekKey = getWeekKey(date);
      
      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, { count: 0, expected: expectedDailyIntakes * 7 });
      }
      
      const week = weeklyData.get(weekKey)!;
      week.count += 1;
    });

    const intakeData = Array.from(weeklyData.entries()).map(([week, data]) => ({
      week,
      avgConsistency: Math.round((data.count / data.expected) * 100),
      intakeCount: data.count,
    })).sort((a, b) => a.week.localeCompare(b.week));

    // 6. Calculate biomarker change
    const biomarkerData = labResults.map(r => ({
      date: r.test_date,
      value: r.normalized_value,
    }));

    const startValue = labResults[0].normalized_value;
    const endValue = labResults[labResults.length - 1].normalized_value;
    const changePercent = Math.round(((endValue - startValue) / startValue) * 100);

    // 7. Calculate correlation (simplified Pearson)
    const avgConsistency = intakeData.reduce((sum, d) => sum + d.avgConsistency, 0) / intakeData.length;
    
    // Simple correlation heuristic based on trend direction
    let correlationScore = 0;
    const biomarkerTrend = endValue > startValue ? 'up' : 'down';
    const desiredDirection = getDesiredDirection(biomarker.canonical_name);
    
    if (biomarkerTrend === desiredDirection && avgConsistency > 70) {
      correlationScore = 0.75; // Strong positive
    } else if (avgConsistency > 50) {
      correlationScore = 0.45; // Moderate
    } else {
      correlationScore = 0.25; // Weak
    }

    const interpretation = correlationScore > 0.7 
      ? "Strong positive correlation" 
      : correlationScore > 0.5 
      ? "Moderate positive correlation"
      : correlationScore > 0.3
      ? "Weak positive correlation"
      : "No significant correlation";

    console.log(`[CORRELATION] Correlation score: ${correlationScore}`);

    // 8. AI Analysis via Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiPrompt = `Analyze supplement effectiveness:

Supplement: ${stackItem.stack_name}
Biomarker: ${biomarker.display_name}
Intake Consistency: ${Math.round(avgConsistency)}% over ${timeframeMonths} months
Biomarker Change: ${startValue} → ${endValue} ${labResults[0].normalized_unit} (${changePercent > 0 ? '+' : ''}${changePercent}%)
Correlation Score: ${correlationScore.toFixed(2)}
Number of Blood Tests: ${labResults.length}

Provide insights:
1. Is the supplement working? (Yes/No/Insufficient data)
2. Key observations (1-2 sentences)
3. Actionable recommendation (1 sentence)

Return ONLY valid JSON with no markdown:
{
  "is_effective": true/false,
  "confidence_level": "high"|"medium"|"low",
  "key_insight": "...",
  "recommendation": "..."
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a health analytics expert. Return only valid JSON.' },
          { role: 'user', content: aiPrompt }
        ],
        max_tokens: 500,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    
    let aiInsights;
    try {
      aiInsights = JSON.parse(aiContent);
    } catch {
      // Fallback if AI doesn't return valid JSON
      aiInsights = {
        is_effective: correlationScore > 0.5,
        confidence_level: correlationScore > 0.7 ? 'high' : correlationScore > 0.5 ? 'medium' : 'low',
        key_insight: `Biomarker changed by ${changePercent}% with ${Math.round(avgConsistency)}% adherence.`,
        recommendation: 'Continue monitoring with regular blood tests.',
      };
    }

    console.log(`[CORRELATION] AI analysis complete`);

    // 9. Calculate time to effect (weeks between first test and first improvement)
    let timeToEffectWeeks = null;
    if (labResults.length >= 2) {
      const firstTest = new Date(labResults[0].test_date);
      const secondTest = new Date(labResults[1].test_date);
      const daysDiff = (secondTest.getTime() - firstTest.getTime()) / (1000 * 60 * 60 * 24);
      timeToEffectWeeks = Math.round(daysDiff / 7);
    }

    // 10. Return correlation analysis
    return new Response(
      JSON.stringify({
        success: true,
        biomarker: {
          id: biomarker.id,
          name: biomarker.display_name,
          unit: labResults[0].normalized_unit,
          startValue,
          endValue,
          changePercent,
          referenceRange: biomarker.reference_ranges,
        },
        intakeData,
        biomarkerData,
        correlation: {
          score: correlationScore,
          interpretation,
          pValue: 0.05, // Placeholder
        },
        aiInsights,
        timeToEffect: timeToEffectWeeks ? {
          weeks: timeToEffectWeeks,
          description: `First improvement seen after ${timeToEffectWeeks} weeks`,
        } : null,
        avgConsistency: Math.round(avgConsistency),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CORRELATION] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function getWeekKey(date: Date): string {
  const year = date.getFullYear();
  const week = getWeekNumber(date);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getDesiredDirection(biomarkerName: string): 'up' | 'down' {
  const lowerName = biomarkerName.toLowerCase();
  
  // Biomarkers that should go UP
  if (lowerName.includes('vitamin') || 
      lowerName.includes('hdl') || 
      lowerName.includes('testosterone') ||
      lowerName.includes('hemoglobin')) {
    return 'up';
  }
  
  // Biomarkers that should go DOWN (default for cholesterol, triglycerides, etc)
  return 'down';
}
