import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { corsHeaders } from '../_shared/cors.ts';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[ANALYZE-TRENDS] Starting biomarker trend analysis');

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

    const { biomarkerId } = await req.json();

    if (!biomarkerId) {
      throw new Error('Biomarker ID is required');
    }

    console.log(`[ANALYZE-TRENDS] Analyzing biomarker ${biomarkerId} for user ${user.id}`);

    // Check cache first
    const { data: cachedAnalysis } = await supabase
      .from('biomarker_ai_analysis')
      .select('*')
      .eq('biomarker_id', biomarkerId)
      .eq('user_id', user.id)
      .single();

    // Fetch biomarker master data
    const { data: biomarker, error: biomarkerError } = await supabase
      .from('biomarker_master')
      .select('*')
      .eq('id', biomarkerId)
      .single();

    if (biomarkerError || !biomarker) {
      throw new Error('Biomarker not found');
    }

    // Fetch all test results for this biomarker
    const { data: results, error: resultsError } = await supabase
      .from('lab_test_results')
      .select('*')
      .eq('user_id', user.id)
      .eq('biomarker_id', biomarkerId)
      .order('test_date', { ascending: true });

    if (resultsError) {
      throw new Error('Failed to fetch test results');
    }

    console.log(`[ANALYZE-TRENDS] Found ${results.length} test results`);

    if (!results || results.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No test results found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if cache is still valid
    if (cachedAnalysis && 
        cachedAnalysis.results_count === results.length &&
        cachedAnalysis.latest_test_date === results[results.length - 1].test_date) {
      console.log('[ANALYZE-TRENDS] ✓ Using cached analysis');
      return new Response(JSON.stringify(cachedAnalysis.analysis), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Calculate statistics
    const values = results.map(r => r.normalized_value);
    const latestValue = results[results.length - 1].normalized_value;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    
    // Calculate trend (last 3 values if available)
    let trend = 'stable';
    if (results.length >= 2) {
      const recent = results.slice(-3).map(r => r.normalized_value);
      const firstRecent = recent[0];
      const lastRecent = recent[recent.length - 1];
      const changePercent = ((lastRecent - firstRecent) / firstRecent) * 100;
      
      if (changePercent > 5) {
        trend = 'increasing';
      } else if (changePercent < -5) {
        trend = 'decreasing';
      }
    }

    // Get reference ranges (assuming male, 18-99 for simplicity)
    const refRanges = biomarker.reference_ranges?.male?.['18-99'] || 
                      biomarker.reference_ranges?.female?.['18-99'] || 
                      {};

    // Classify zones
    const zones = {
      below_normal: 0,
      normal: 0,
      optimal: 0,
      above_normal: 0
    };

    results.forEach(r => {
      const val = r.normalized_value;
      if (refRanges.optimal_min && val >= refRanges.optimal_min && val <= refRanges.optimal_max) {
        zones.optimal++;
      } else if (val >= refRanges.min && val <= refRanges.max) {
        zones.normal++;
      } else if (val < refRanges.min) {
        zones.below_normal++;
      } else {
        zones.above_normal++;
      }
    });

    // Calculate percentages
    const totalCount = results.length;
    const zonePercentages = {
      below_normal: Math.round((zones.below_normal / totalCount) * 100),
      normal: Math.round((zones.normal / totalCount) * 100),
      optimal: Math.round((zones.optimal / totalCount) * 100),
      above_normal: Math.round((zones.above_normal / totalCount) * 100)
    };

    console.log('[ANALYZE-TRENDS] Requesting AI insights from OpenAI');

    // Generate AI insights
    const aiPrompt = `Analyze this biomarker trend data and provide insights in Russian:

Biomarker: ${biomarker.display_name}
Description: ${biomarker.description}
Standard Unit: ${biomarker.standard_unit}

Test History (${results.length} tests):
${results.map(r => `- ${r.test_date}: ${r.normalized_value} ${r.normalized_unit} (Lab: ${r.laboratory_name || 'Unknown'})`).join('\n')}

Statistics:
- Latest: ${latestValue} ${biomarker.standard_unit}
- Average: ${avg.toFixed(2)} ${biomarker.standard_unit}
- Range: ${min} - ${max} ${biomarker.standard_unit}
- Trend: ${trend}

Reference Ranges:
- Normal: ${refRanges.min} - ${refRanges.max}
- Optimal: ${refRanges.optimal_min} - ${refRanges.optimal_max}

Zone Distribution:
- Below Normal: ${zonePercentages.below_normal}%
- Normal: ${zonePercentages.normal}%
- Optimal: ${zonePercentages.optimal}%
- Above Normal: ${zonePercentages.above_normal}%

Provide:
1. Current Status (1 sentence about the latest value)
2. Trend Analysis (what the trend means)
3. Key Insights (2-3 important observations)
4. Recommendations (if any concerns or optimizations)

Keep it concise and actionable. Write in Russian.`;

    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a medical data analyst providing insights on lab test results in Russian.'
          },
          {
            role: 'user',
            content: aiPrompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    const openAiData = await openAiResponse.json();
    const insights = openAiData.choices?.[0]?.message?.content || 'Не удалось сгенерировать анализ';

    console.log('[ANALYZE-TRENDS] ✓ Analysis complete');

    const responseData = {
      success: true,
      biomarker: {
        id: biomarker.id,
        name: biomarker.display_name,
        category: biomarker.category,
        unit: biomarker.standard_unit
      },
      statistics: {
        count: results.length,
        latest: latestValue,
        min,
        max,
        average: parseFloat(avg.toFixed(2)),
        trend
      },
      zones: zonePercentages,
      reference_ranges: refRanges,
      history: results.map(r => ({
        date: r.test_date,
        value: r.normalized_value,
        unit: r.normalized_unit,
        laboratory: r.laboratory_name,
        original_value: r.value,
        original_unit: r.unit
      })),
      insights
    };

    // Cache the analysis
    await supabase
      .from('biomarker_ai_analysis')
      .upsert({
        biomarker_id: biomarkerId,
        user_id: user.id,
        analysis: responseData,
        insights: insights,
        statistics: {
          count: results.length,
          latest: latestValue,
          min,
          max,
          average: parseFloat(avg.toFixed(2)),
          trend
        },
        zones: zonePercentages,
        results_count: results.length,
        latest_test_date: results[results.length - 1].test_date,
        updated_at: new Date().toISOString()
      });

    console.log('[ANALYZE-TRENDS] ✓ Analysis cached');

    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('[ANALYZE-TRENDS] Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
