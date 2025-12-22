import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SupplementMatch {
  scientificName: string;
  confidence: number;
  biomarkerIds: string[];
  correlations: Array<{
    biomarkerName: string;
    biomarkerId: string;
    correlationType: string;
    expectedChangePercent: number;
    evidenceLevel: string;
    researchSummary: string;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { stackItemId, supplementName, userId } = await req.json();

    if (!supplementName) {
      return new Response(
        JSON.stringify({ error: 'supplementName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[auto-link-biomarkers] Processing: ${supplementName}`);

    // Step 1: Check supplement_synonyms table first for fast matching
    let matchedScientificName: string | null = null;
    let matchConfidence = 0;

    const { data: synonymMatch } = await supabase
      .from('supplement_synonyms')
      .select('canonical_name, confidence')
      .or(`synonym.ilike.%${supplementName}%,canonical_name.ilike.%${supplementName}%`)
      .order('confidence', { ascending: false })
      .limit(1);

    if (synonymMatch && synonymMatch.length > 0) {
      matchedScientificName = synonymMatch[0].canonical_name;
      matchConfidence = (synonymMatch[0].confidence || 0.8) * 100;
      console.log(`[auto-link-biomarkers] Synonym match: ${matchedScientificName} (${matchConfidence}%)`);
    }

    // Step 2: Get all unique supplement names from biomarker_correlations
    const { data: correlations, error: corrError } = await supabase
      .from('biomarker_correlations')
      .select('supplement_name, biomarker_id, correlation_type, expected_change_percent, evidence_level, research_summary');

    if (corrError) {
      console.error('[auto-link-biomarkers] Error fetching correlations:', corrError);
      throw corrError;
    }

    const scientificNames = [...new Set(correlations?.map(c => c.supplement_name) || [])];
    console.log(`[auto-link-biomarkers] Found ${scientificNames.length} scientific names in database`);

    // Step 3: Use AI to match if no synonym match found
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!matchedScientificName && LOVABLE_API_KEY && scientificNames.length > 0) {
      const matchPrompt = `You are a supplement expert. Match the user's supplement name to the most appropriate scientific name from the database.

User supplement: "${supplementName}"

Available scientific names in database:
${scientificNames.map(n => `- ${n}`).join('\n')}

IMPORTANT MATCHING RULES:
1. Match supplement types, not exact names. For example:
   - "Magnesium Citrate" should match "magnesium_glycinate" (both are magnesium forms)
   - "Fish Oil" should match "omega3_epa_dha" (fish oil contains omega-3)
   - "Vitamin D3 5000IU" should match "vitamin_d3"
   - "CoQ10" should match "coenzyme_q10"
2. Ignore brand names, dosages, and form variations
3. Focus on the active ingredient/compound

Return a JSON object with:
- "scientificName": the best matching name from the list (null if no match)
- "confidence": number 0-100 indicating match confidence

Return ONLY the JSON object, no other text.`;

      try {
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'user', content: matchPrompt }
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || '';
          
          // Parse JSON from response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            matchedScientificName = parsed.scientificName;
            matchConfidence = parsed.confidence || 0;
            console.log(`[auto-link-biomarkers] AI matched: ${matchedScientificName} (confidence: ${matchConfidence}%)`);
          }
        }
      } catch (aiError) {
        console.error('[auto-link-biomarkers] AI matching failed:', aiError);
      }
    }

    // Fallback: Try direct string matching
    if (!matchedScientificName) {
      const normalizedInput = supplementName.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      for (const sciName of scientificNames) {
        const normalizedSci = sciName.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        // Check if input contains key parts of scientific name or vice versa
        if (normalizedInput.includes(normalizedSci) || normalizedSci.includes(normalizedInput)) {
          matchedScientificName = sciName;
          matchConfidence = 70;
          break;
        }
        
        // Check for common patterns
        const keyTerms = ['magnesium', 'vitamin', 'omega', 'zinc', 'iron', 'calcium', 'b12', 'b6', 'folate', 'coq10', 'coenzyme'];
        for (const term of keyTerms) {
          if (normalizedInput.includes(term) && normalizedSci.includes(term)) {
            matchedScientificName = sciName;
            matchConfidence = 60;
            break;
          }
        }
        if (matchedScientificName) break;
      }
    }

    // Step 3: Get all correlations for the matched scientific name
    if (!matchedScientificName) {
      console.log(`[auto-link-biomarkers] No match found for: ${supplementName}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No scientific data found for this supplement',
          supplementName 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const matchedCorrelations = correlations?.filter(c => c.supplement_name === matchedScientificName) || [];
    console.log(`[auto-link-biomarkers] Found ${matchedCorrelations.length} correlations for ${matchedScientificName}`);

    // Get biomarker names
    const biomarkerIds = matchedCorrelations.map(c => c.biomarker_id).filter(Boolean);
    
    let biomarkerNames: Record<string, string> = {};
    if (biomarkerIds.length > 0) {
      const { data: biomarkers } = await supabase
        .from('biomarker_master')
        .select('id, display_name, canonical_name')
        .in('id', biomarkerIds);
      
      biomarkerNames = Object.fromEntries(
        (biomarkers || []).map(b => [b.id, b.display_name || b.canonical_name])
      );
    }

    // Build response
    const result: SupplementMatch = {
      scientificName: matchedScientificName,
      confidence: matchConfidence,
      biomarkerIds,
      correlations: matchedCorrelations.map(c => ({
        biomarkerName: biomarkerNames[c.biomarker_id] || 'Unknown',
        biomarkerId: c.biomarker_id,
        correlationType: c.correlation_type,
        expectedChangePercent: c.expected_change_percent || 0,
        evidenceLevel: c.evidence_level || 'low',
        researchSummary: c.research_summary || '',
      })),
    };

    // Step 4: Update user_stack if stackItemId provided
    if (stackItemId && biomarkerIds.length > 0) {
      const { error: updateError } = await supabase
        .from('user_stack')
        .update({ 
          linked_biomarker_ids: biomarkerIds,
          ai_rationale: `Auto-linked based on scientific data for ${matchedScientificName}. Confidence: ${matchConfidence}%`
        })
        .eq('id', stackItemId);

      if (updateError) {
        console.error('[auto-link-biomarkers] Error updating stack item:', updateError);
      } else {
        console.log(`[auto-link-biomarkers] Updated stack item ${stackItemId} with ${biomarkerIds.length} biomarkers`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[auto-link-biomarkers] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
