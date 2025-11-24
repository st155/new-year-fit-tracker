import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createAuthClient } from "../_shared/supabase-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScanRequest {
  imageBase64: string;
}

interface ExtractedData {
  brand: string;
  supplement_name: string;
  dosage_per_serving: string;
  servings_per_container: number;
  form: string;
  recommended_daily_intake?: string | null;
  ingredients?: string[] | null;
  warnings?: string | null;
  expiration_info?: string | null;
}

interface AIResponse {
  success: boolean;
  extracted?: ExtractedData;
  suggestions?: {
    intake_times: string[];
    linked_biomarkers: string[];
    ai_rationale: string;
    target_outcome: string;
  };
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createAuthClient(authHeader);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { imageBase64 }: ScanRequest = await req.json();

    if (!imageBase64) {
      throw new Error('No image provided');
    }

    console.log('[SCAN-BOTTLE] Starting AI analysis...');
    console.log('[SCAN-BOTTLE] Image size:', imageBase64.length, 'bytes');

    // Call Lovable AI Gateway with Gemini Vision
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const visionPrompt = `Analyze this supplement bottle photo and extract ALL available information:

REQUIRED FIELDS:
1. BRAND: Manufacturer/brand name
2. SUPPLEMENT_NAME: Main supplement name (e.g., "Vitamin D3", "Magnesium Glycinate")
3. DOSAGE_PER_SERVING: Amount per serving with unit (e.g., "5000 IU", "400mg")
4. SERVINGS_PER_CONTAINER: Total servings in the bottle (number)
5. FORM: capsule/tablet/powder/liquid/gummy/softgel

ADDITIONAL FIELDS (if visible on label):
6. RECOMMENDED_DAILY_INTAKE: Manufacturer's usage instructions (e.g., "Take 1 capsule daily with food", "2 tablets twice daily")
7. INGREDIENTS: List of active and inactive ingredients
8. WARNINGS: Health warnings or contraindications
9. EXPIRATION_INFO: Expiration date or "Best by" information

Return ONLY valid JSON (no markdown):
{
  "brand": "...",
  "supplement_name": "...",
  "dosage_per_serving": "...",
  "servings_per_container": number,
  "form": "...",
  "recommended_daily_intake": "..." or null,
  "ingredients": ["..."] or null,
  "warnings": "..." or null,
  "expiration_info": "..." or null
}`;

    // Setup timeout with AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds

    const visionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: visionPrompt },
              { 
                type: 'image_url', 
                image_url: { url: imageBase64 } 
              }
            ]
          }
        ],
        max_tokens: 1000,
      }),
    });

    clearTimeout(timeoutId);

    if (!visionResponse.ok) {
      const error = await visionResponse.text();
      console.error('[SCAN-BOTTLE] Vision API error:', error);
      throw new Error(`Vision API error: ${visionResponse.status}`);
    }

    const visionData = await visionResponse.json();
    const content = visionData.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content from Vision API');
    }

    console.log('[SCAN-BOTTLE] Raw AI response:', content);

    // Parse extracted data
    let extracted: ExtractedData;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extracted = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('[SCAN-BOTTLE] Failed to parse AI response:', content);
      throw new Error('Failed to parse AI response');
    }

    console.log('[SCAN-BOTTLE] Extracted:', extracted);

    // Query biomarker_correlations for matching supplement
    const supplementName = extracted.supplement_name.toLowerCase();
    const { data: correlations, error: corrError } = await supabase
      .from('biomarker_correlations')
      .select('biomarker_id, research_summary')
      .ilike('supplement_name', `%${supplementName}%`)
      .limit(3);

    if (corrError) {
      console.error('[SCAN-BOTTLE] Error querying correlations:', corrError);
    }

    const linkedBiomarkers = correlations?.map(c => c.biomarker_id).filter(Boolean) || [];
    
    // AI Reasoning Layer: Suggest intake times based on supplement type
    const intakeTimes = suggestIntakeTimes(extracted.supplement_name, extracted.form);
    const targetOutcome = generateTargetOutcome(extracted.supplement_name);
    const aiRationale = generateRationale(extracted.supplement_name, intakeTimes, linkedBiomarkers.length);

    const response: AIResponse = {
      success: true,
      extracted,
      suggestions: {
        intake_times: intakeTimes,
        linked_biomarkers: linkedBiomarkers,
        ai_rationale: aiRationale,
        target_outcome: targetOutcome,
      },
    };

    console.log('[SCAN-BOTTLE] Success:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[SCAN-BOTTLE] Error:', error);
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

// Helper functions for AI suggestions
function suggestIntakeTimes(supplementName: string, form: string): string[] {
  const name = supplementName.toLowerCase();
  
  // Fat-soluble vitamins (morning with food)
  if (name.includes('vitamin d') || name.includes('vitamin a') || name.includes('vitamin k')) {
    return ['morning'];
  }
  
  // Magnesium (evening for relaxation)
  if (name.includes('magnesium')) {
    return ['evening'];
  }
  
  // B vitamins (morning for energy)
  if (name.includes('vitamin b') || name.includes('b-complex')) {
    return ['morning'];
  }
  
  // Omega-3 (with meals)
  if (name.includes('omega') || name.includes('fish oil')) {
    return ['morning', 'evening'];
  }
  
  // Probiotics (morning on empty stomach)
  if (name.includes('probiotic')) {
    return ['morning'];
  }
  
  // Default: morning
  return ['morning'];
}

function generateTargetOutcome(supplementName: string): string {
  const name = supplementName.toLowerCase();
  
  if (name.includes('vitamin d')) return 'Optimize Vitamin D levels';
  if (name.includes('magnesium')) return 'Support relaxation and sleep quality';
  if (name.includes('omega') || name.includes('fish oil')) return 'Support cardiovascular health';
  if (name.includes('vitamin b')) return 'Boost energy and cognitive function';
  if (name.includes('probiotic')) return 'Improve gut health and digestion';
  if (name.includes('iron')) return 'Support healthy iron levels';
  if (name.includes('zinc')) return 'Support immune function';
  
  return `Optimize ${supplementName} levels`;
}

function generateRationale(supplementName: string, intakeTimes: string[], biomarkerCount: number): string {
  const timeStr = intakeTimes.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(' and ');
  const trackingStr = biomarkerCount > 0 
    ? ` This supplement is linked to ${biomarkerCount} biomarker(s) we're tracking in your blood work.`
    : '';
  
  return `${supplementName} is best taken in the ${timeStr} for optimal absorption.${trackingStr}`;
}
