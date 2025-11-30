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

// Static mapping for common AI-generated names to canonical names
const AI_TO_CANONICAL_MAP: Record<string, string> = {
  'c_reactive_protein': 'crp',
  'hs_crp': 'crp',
  'ldl_cholesterol': 'cholesterol_ldl',
  'hdl_cholesterol': 'cholesterol_hdl',
  'total_cholesterol': 'cholesterol_total',
  'fasting_blood_glucose': 'glucose',
  'blood_glucose': 'glucose',
  'fasting_glucose': 'glucose',
  'mean_corpuscular_volume': 'mcv',
  'red_blood_cell_count': 'rbc',
  'white_blood_cell_count': 'wbc',
  'vitamin_d_25_oh': 'vitamin_d',
  '25_oh_vitamin_d': 'vitamin_d',
  'vitamin_d3': 'vitamin_d',
  'haemoglobin': 'hemoglobin',
  'total_iron_binding_capacity': 'tibc',
  'tsh_thyroid_stimulating_hormone': 'tsh',
  'free_testosterone': 'testosterone_free',
  'total_testosterone': 'testosterone_total',
};

const CANONICAL_NAME_MAPPING = `
CRITICAL: Use ONLY these exact canonical names from our database:
- crp (NOT c_reactive_protein, NOT hs_crp)
- cholesterol_ldl (NOT ldl_cholesterol, NOT ldl)
- cholesterol_hdl (NOT hdl_cholesterol, NOT hdl)
- cholesterol_total (NOT total_cholesterol)
- triglycerides
- glucose (NOT fasting_blood_glucose, NOT blood_glucose)
- rbc (NOT red_blood_cell_count)
- wbc (NOT white_blood_cell_count)
- hemoglobin (NOT haemoglobin)
- hematocrit
- mcv (NOT mean_corpuscular_volume)
- platelets
- ferritin
- iron
- tibc
- vitamin_d (NOT vitamin_d_25_oh, NOT 25_oh_vitamin_d)
- vitamin_b12
- folate
- tsh (NOT thyroid_stimulating_hormone)
- t3_free
- t4_free
- cortisol
- testosterone_total (NOT total_testosterone)
- testosterone_free (NOT free_testosterone)
- hba1c
- alt, ast, ggt, alp
- creatinine
- bun
- calcium
- magnesium
- potassium
- sodium
`;

// Multi-level biomarker matching function
async function findBiomarkerId(supabase: any, aiName: string): Promise<string | null> {
  console.log(`[FIND_BIOMARKER] Looking for: ${aiName}`);
  
  // 0. Check static mapping first
  const mappedName = AI_TO_CANONICAL_MAP[aiName.toLowerCase()];
  const searchName = mappedName || aiName;
  
  if (mappedName) {
    console.log(`[FIND_BIOMARKER] Mapped ${aiName} → ${mappedName}`);
  }
  
  // 1. Exact match on canonical_name
  let { data, error } = await supabase
    .from('biomarker_master')
    .select('id')
    .eq('canonical_name', searchName)
    .limit(1)
    .single();
  
  if (data) {
    console.log(`[FIND_BIOMARKER] ✅ Exact match: ${searchName}`);
    return data.id;
  }
  
  // 2. Normalized match on canonical_name (remove underscores)
  const normalizedSearch = searchName.replace(/_/g, '');
  const { data: allBiomarkers } = await supabase
    .from('biomarker_master')
    .select('id, canonical_name')
    .limit(200);
  
  const normalizedMatch = allBiomarkers?.find((b: any) => 
    b.canonical_name.replace(/_/g, '').toLowerCase() === normalizedSearch.toLowerCase()
  );
  
  if (normalizedMatch) {
    console.log(`[FIND_BIOMARKER] ✅ Normalized match: ${searchName} → ${normalizedMatch.canonical_name}`);
    return normalizedMatch.id;
  }
  
  // 3. Search via biomarker_aliases.alias_normalized
  const fullyNormalized = searchName.toLowerCase().replace(/[^a-z0-9]/g, '');
  ({ data, error } = await supabase
    .from('biomarker_aliases')
    .select('biomarker_id')
    .eq('alias_normalized', fullyNormalized)
    .limit(1)
    .single());
  
  if (data) {
    console.log(`[FIND_BIOMARKER] ✅ Alias exact match: ${fullyNormalized}`);
    return data.biomarker_id;
  }
  
  // 4. Fuzzy matching via alias_normalized (contains)
  ({ data, error } = await supabase
    .from('biomarker_aliases')
    .select('biomarker_id, alias')
    .ilike('alias_normalized', `%${fullyNormalized}%`)
    .limit(1)
    .single());
  
  if (data) {
    console.log(`[FIND_BIOMARKER] ✅ Alias fuzzy match: ${fullyNormalized} via ${data.alias}`);
    return data.biomarker_id;
  }
  
  console.warn(`[FIND_BIOMARKER] ❌ Not found: ${aiName}`);
  return null;
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

${CANONICAL_NAME_MAPPING}

For EACH biomarker, provide:
1. biomarker_canonical_name: Use EXACT canonical names from the list above
2. correlation_type: "increases", "decreases", or "stabilizes"
3. expected_change_percent: Typical % change (as a number, e.g., 25 for 25%)
4. timeframe_weeks: How many weeks to see results (number)
5. evidence_level: "high", "moderate", or "low"
6. research_summary: 2-sentence summary of the research evidence

Return ONLY valid JSON array format:
[
  {
    "biomarker_canonical_name": "vitamin_d",
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
        // Use improved matching function
        const biomarkerId = await findBiomarkerId(supabase, corr.biomarker_canonical_name);

        if (!biomarkerId) {
          console.warn(`[POPULATE-CORRELATIONS] ❌ Biomarker not found: ${corr.biomarker_canonical_name}`);
          continue;
        }

        // Check if correlation already exists
        const { data: existing } = await supabase
          .from('biomarker_correlations')
          .select('id')
          .eq('supplement_name', supplement)
          .eq('biomarker_id', biomarkerId)
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
            biomarker_id: biomarkerId,
            correlation_type: corr.correlation_type,
            expected_change_percent: corr.expected_change_percent,
            timeframe_weeks: corr.timeframe_weeks,
            evidence_level: corr.evidence_level,
            research_summary: corr.research_summary,
          });

        if (insertError) {
          console.error(`[POPULATE-CORRELATIONS] ❌ Insert error:`, insertError);
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
