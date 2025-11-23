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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('[AI-STACK-GEN] Starting analysis for user:', user.id);

    // Fetch latest blood test results (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: labResults, error: labError } = await supabaseClient
      .from('lab_test_results')
      .select(`
        *,
        biomarker_master (
          id,
          canonical_name,
          display_name,
          category,
          standard_unit,
          reference_ranges
        )
      `)
      .eq('user_id', user.id)
      .gte('test_date', sixMonthsAgo.toISOString().split('T')[0])
      .not('biomarker_id', 'is', null)
      .order('test_date', { ascending: false });

    if (labError) throw labError;

    if (!labResults || labResults.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'no_blood_work',
          message: 'No blood test results found. Please upload lab reports first.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[AI-STACK-GEN] Found', labResults.length, 'lab results');

    // Group by biomarker and take latest test
    const latestByBiomarker = new Map();
    for (const result of labResults) {
      if (!result.biomarker_master) continue;
      const biomarkerId = result.biomarker_id;
      if (!latestByBiomarker.has(biomarkerId)) {
        latestByBiomarker.set(biomarkerId, result);
      }
    }

    console.log('[AI-STACK-GEN] Latest results for', latestByBiomarker.size, 'unique biomarkers');

    // Detect deficiencies
    const deficientBiomarkers = [];
    for (const [biomarkerId, result] of latestByBiomarker) {
      const refMin = result.ref_range_min;
      const refMax = result.ref_range_max;
      const value = result.normalized_value;

      if (!refMin || !refMax || !value) continue;

      const range = refMax - refMin;
      const optimalMin = refMin + (0.3 * range);

      let status = null;
      if (value < refMin) {
        status = 'low';
      } else if (value < optimalMin) {
        status = 'suboptimal';
      }

      if (status) {
        deficientBiomarkers.push({
          biomarker_id: biomarkerId,
          name: result.biomarker_master.display_name,
          canonical_name: result.biomarker_master.canonical_name,
          category: result.biomarker_master.category,
          current_value: value,
          unit: result.normalized_unit,
          ref_min: refMin,
          ref_max: refMax,
          status,
          test_date: result.test_date,
        });
      }
    }

    console.log('[AI-STACK-GEN] Found', deficientBiomarkers.length, 'deficiencies');

    if (deficientBiomarkers.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          no_deficiencies: true,
          message: 'All biomarkers are within optimal ranges. Great work!',
          total_analyzed: latestByBiomarker.size,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Query biomarker_correlations for supplements
    const biomarkerIds = deficientBiomarkers.map(d => d.biomarker_id);
    const { data: correlations, error: corrError } = await supabaseClient
      .from('biomarker_correlations')
      .select('*')
      .in('biomarker_id', biomarkerIds)
      .in('correlation_type', ['increases', 'stabilizes'])
      .order('evidence_level', { ascending: false });

    if (corrError) throw corrError;

    console.log('[AI-STACK-GEN] Found', correlations?.length || 0, 'supplement correlations');

    if (!correlations || correlations.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'no_correlations',
          message: 'Biomarker correlation database is empty. Please run populate-biomarker-correlations first.',
          deficiencies: deficientBiomarkers,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate AI recommendations using Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const prompt = `You are a clinical nutritionist AI. Analyze the following biomarker deficiencies and generate personalized supplement recommendations.

DEFICIENT BIOMARKERS:
${deficientBiomarkers.map(d => `- ${d.name}: ${d.current_value} ${d.unit} (Ref: ${d.ref_min}-${d.ref_max}) [${d.status.toUpperCase()}]`).join('\n')}

AVAILABLE SUPPLEMENT EVIDENCE:
${correlations.map(c => `- ${c.supplement_name} → ${deficientBiomarkers.find(d => d.biomarker_id === c.biomarker_id)?.name}: ${c.correlation_type}, ${c.expected_change_percent}% in ${c.timeframe_weeks} weeks (Evidence: ${c.evidence_level})`).join('\n')}

Generate a JSON array of supplement recommendations. Each recommendation must include:
- supplement_name: exact supplement name
- dosage_amount: numeric dosage
- dosage_unit: unit (mg, mcg, IU, etc.)
- form: capsule/tablet/liquid/powder
- intake_times: array of "morning", "afternoon", "evening", or "as_needed"
- target_biomarker: canonical_name of biomarker being addressed
- expected_improvement: percentage improvement expected
- timeframe_weeks: weeks to see results
- rationale: 2-3 sentence explanation (medical, specific to deficiency)
- synergies: array of other supplements that enhance absorption/effect (empty array if none)

Rules:
1. Prioritize high evidence_level supplements
2. Address most severe deficiencies first (status: "low" > "suboptimal")
3. Include synergistic combinations (e.g., Vitamin D + K2 + Magnesium)
4. Suggest specific forms (e.g., "Magnesium Glycinate" not just "Magnesium")
5. Be conservative with dosages (within safe upper limits)
6. Maximum 8 recommendations total

Return ONLY valid JSON array, no markdown.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a clinical nutritionist AI that generates evidence-based supplement recommendations in JSON format.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[AI-STACK-GEN] AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;

    console.log('[AI-STACK-GEN] AI response length:', aiContent.length);

    // Parse AI response
    let recommendations = [];
    try {
      // Remove markdown code blocks if present
      const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0]);
      } else {
        recommendations = JSON.parse(aiContent);
      }
    } catch (parseError) {
      console.error('[AI-STACK-GEN] Failed to parse AI response:', aiContent);
      throw new Error('Failed to parse AI recommendations');
    }

    console.log('[AI-STACK-GEN] Generated', recommendations.length, 'recommendations');

    // Return structured response
    return new Response(
      JSON.stringify({
        success: true,
        analysis: {
          total_biomarkers: latestByBiomarker.size,
          deficiencies_count: deficientBiomarkers.length,
          recommendations_count: recommendations.length,
          analysis_date: new Date().toISOString(),
          timeframe: '6 months',
        },
        deficiencies: deficientBiomarkers,
        recommendations,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[AI-STACK-GEN] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
