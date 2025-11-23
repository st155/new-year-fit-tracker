import { createServiceClient } from '../_shared/supabase-client.ts';
import { createAIClient } from '../_shared/ai-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BiomarkerCorrelation {
  supplement_name: string;
  biomarker_canonical_name: string;
  correlation_type: 'increases' | 'decreases' | 'stabilizes';
  expected_change_percent: number;
  timeframe_weeks: number;
  evidence_level: 'high' | 'moderate' | 'low';
  research_summary: string;
}

const COMMON_SUPPLEMENTS = [
  'vitamin_d3',
  'vitamin_b12_methylcobalamin',
  'iron_bisglycinate',
  'magnesium_glycinate',
  'omega3_epa_dha',
  'zinc_picolinate',
  'vitamin_c',
  'vitamin_b_complex',
  'coq10',
  'creatine_monohydrate',
  'ashwagandha',
  'rhodiola_rosea',
  'curcumin_turmeric',
  'probiotics',
  'vitamin_k2_mk7',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createServiceClient();
    const aiClient = createAIClient();

    console.log('[POPULATE-CORRELATIONS] Starting biomarker correlation population');

    let totalInserted = 0;

    for (const supplement of COMMON_SUPPLEMENTS) {
      console.log(`[POPULATE-CORRELATIONS] Processing: ${supplement}`);

      const prompt = `You are a medical research expert. For the supplement "${supplement}", provide a comprehensive list of biomarkers it affects.

For EACH biomarker, provide:
1. biomarker_canonical_name: Use standard medical names (e.g., "vitamin_d_25_oh", "ferritin", "hemoglobin")
2. correlation_type: "increases", "decreases", or "stabilizes"
3. expected_change_percent: Typical % change (as a number, e.g., 25 for 25%)
4. timeframe_weeks: How many weeks to see results (number)
5. evidence_level: "high", "moderate", or "low"
6. research_summary: 2-sentence summary of the research evidence

Return ONLY valid JSON array format:
[
  {
    "biomarker_canonical_name": "vitamin_d_25_oh",
    "correlation_type": "increases",
    "expected_change_percent": 30,
    "timeframe_weeks": 8,
    "evidence_level": "high",
    "research_summary": "Vitamin D3 supplementation consistently raises serum 25(OH)D levels. Studies show 1000 IU daily increases levels by approximately 10 ng/mL over 8 weeks."
  }
]

Focus on the TOP 5-10 most significant biomarkers affected by ${supplement}.`;

      const response = await aiClient.complete({
        messages: [
          { role: 'system', content: 'You are a medical research expert. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      let correlations: BiomarkerCorrelation[];
      try {
        const jsonMatch = response.content.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          console.error(`[POPULATE-CORRELATIONS] No JSON found for ${supplement}`);
          continue;
        }
        correlations = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error(`[POPULATE-CORRELATIONS] JSON parse error for ${supplement}:`, parseError);
        continue;
      }

      // For each correlation, find the biomarker_id and insert
      for (const corr of correlations) {
        // Find biomarker by canonical name
        const { data: biomarker } = await supabase
          .from('biomarker_master')
          .select('id')
          .ilike('canonical_name', corr.biomarker_canonical_name.replace(/_/g, '%'))
          .limit(1)
          .single();

        if (!biomarker) {
          console.warn(`[POPULATE-CORRELATIONS] Biomarker not found: ${corr.biomarker_canonical_name}`);
          continue;
        }

        // Check if correlation already exists
        const { data: existing } = await supabase
          .from('biomarker_correlations')
          .select('id')
          .eq('supplement_name', supplement)
          .eq('biomarker_id', biomarker.id)
          .single();

        if (existing) {
          console.log(`[POPULATE-CORRELATIONS] Correlation exists: ${supplement} -> ${corr.biomarker_canonical_name}`);
          continue;
        }

        // Insert correlation
        const { error: insertError } = await supabase
          .from('biomarker_correlations')
          .insert({
            supplement_name: supplement,
            biomarker_id: biomarker.id,
            correlation_type: corr.correlation_type,
            expected_change_percent: corr.expected_change_percent,
            timeframe_weeks: corr.timeframe_weeks,
            evidence_level: corr.evidence_level,
            research_summary: corr.research_summary,
          });

        if (insertError) {
          console.error(`[POPULATE-CORRELATIONS] Insert error:`, insertError);
        } else {
          totalInserted++;
          console.log(`[POPULATE-CORRELATIONS] ✅ Inserted: ${supplement} -> ${corr.biomarker_canonical_name}`);
        }
      }

      // Rate limiting to avoid API throttling
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully populated ${totalInserted} biomarker correlations`,
        totalInserted,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[POPULATE-CORRELATIONS] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
