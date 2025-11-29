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
  label_description?: string | null;
  label_benefits?: string[] | null;
  ingredients?: string[] | null;
  manufacturer_country?: string | null;
  manufacturer_website?: string | null;
  certifications?: string[] | null;
  price?: string | null;
  storage_instructions?: string | null;
  warnings?: string | null;
  recommended_daily_intake?: string | null;
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
  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[SCAN-${requestId}] ====== NEW REQUEST ======`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error(`[SCAN-${requestId}] ❌ Missing authorization header`);
      throw new Error('No authorization header');
    }

    const supabase = createAuthClient(authHeader);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error(`[SCAN-${requestId}] ❌ Unauthorized:`, userError);
      throw new Error('Unauthorized');
    }

    console.log(`[SCAN-${requestId}] 👤 User authenticated:`, user.id);

    const { imageBase64 }: ScanRequest = await req.json();

    if (!imageBase64) {
      console.error(`[SCAN-${requestId}] ❌ No image provided`);
      throw new Error('No image provided');
    }

    console.log(`[SCAN-${requestId}] 📷 Image received (${Math.round(imageBase64.length / 1024)}KB)`);

    // Call Lovable AI Gateway with Gemini Vision
    console.log(`[SCAN-${requestId}] 🤖 Calling Gemini Vision API...`);
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error(`[SCAN-${requestId}] ❌ LOVABLE_API_KEY not configured`);
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const visionPrompt = `Analyze this supplement bottle photo and extract ALL visible information from the label:

REQUIRED FIELDS:
1. BRAND: Manufacturer/brand name
2. SUPPLEMENT_NAME: Main supplement name (e.g., "Vitamin D3", "Magnesium Glycinate")
3. DOSAGE_PER_SERVING: Amount per serving with unit (e.g., "5000 IU", "400mg")
4. SERVINGS_PER_CONTAINER: Total servings in the bottle (number)
5. FORM: capsule/tablet/powder/liquid/gummy/softgel

EXTRACT FROM LABEL (if visible):
6. LABEL_DESCRIPTION: Product description text from the bottle label
7. LABEL_BENEFITS: Any health claims or benefits listed on the label (array)
8. INGREDIENTS: Complete ingredients list (active + inactive)
9. MANUFACTURER_COUNTRY: Country of origin ("Made in...", "Product of...")
10. MANUFACTURER_WEBSITE: Website URL if visible on label
11. CERTIFICATIONS: Quality certifications (GMP, NSF, Organic, Non-GMO, etc.)
12. PRICE: Price if visible on label or price sticker
13. STORAGE_INSTRUCTIONS: Storage recommendations ("Keep refrigerated", "Store in cool dry place")
14. WARNINGS: Health warnings, allergens, or contraindications
15. RECOMMENDED_DAILY_INTAKE: Usage instructions from manufacturer
16. EXPIRATION_INFO: Expiration or "Best by" date

Return ONLY valid JSON (no markdown):
{
  "brand": "...",
  "supplement_name": "...",
  "dosage_per_serving": "...",
  "servings_per_container": number,
  "form": "...",
  "label_description": "..." or null,
  "label_benefits": ["..."] or null,
  "ingredients": ["..."] or null,
  "manufacturer_country": "..." or null,
  "manufacturer_website": "..." or null,
  "certifications": ["GMP", "NSF"] or null,
  "price": "..." or null,
  "storage_instructions": "..." or null,
  "warnings": "..." or null,
  "recommended_daily_intake": "..." or null,
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
      console.error(`[SCAN-${requestId}] ❌ Vision API error (${visionResponse.status}):`, error);
      throw new Error(`Vision API error: ${visionResponse.status}`);
    }

    const visionData = await visionResponse.json();
    const content = visionData.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error(`[SCAN-${requestId}] ❌ No content from Vision API`);
      throw new Error('No content from Vision API');
    }

    console.log(`[SCAN-${requestId}] ✅ AI response received (${content.length} chars)`);

    // Parse extracted data
    let extracted: ExtractedData;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extracted = JSON.parse(cleanContent);
      console.log(`[SCAN-${requestId}] 📊 Extracted data:`, {
        brand: extracted.brand,
        name: extracted.supplement_name,
        form: extracted.form,
        dosage: extracted.dosage_per_serving
      });
    } catch (parseError) {
      console.error(`[SCAN-${requestId}] ❌ Failed to parse AI response:`, parseError);
      console.error(`[SCAN-${requestId}] Raw content:`, content.substring(0, 500));
      throw new Error('Failed to parse AI response');
    }

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

    // Check if product already exists
    const { data: existingProduct, error: productCheckError } = await supabase
      .from('supplement_products')
      .select('id')
      .eq('name', extracted.supplement_name)
      .eq('brand', extracted.brand)
      .maybeSingle();

    if (productCheckError) {
      console.error(`[SCAN-${requestId}] ❌ Error checking existing product:`, productCheckError);
    }

    let productId: string;
    const productData = {
      name: extracted.supplement_name,
      brand: extracted.brand,
      form: extracted.form,
      dosage_amount: extracted.dosage_per_serving 
        ? parseFloat(extracted.dosage_per_serving.replace(/[^0-9.]/g, '')) || null 
        : null,
      dosage_unit: extracted.dosage_per_serving?.match(/[a-zA-Z]+/)?.[0] || null,
      servings_per_container: extracted.servings_per_container,
      label_description: extracted.label_description,
      label_benefits: extracted.label_benefits,
      ingredients: extracted.ingredients,
      country_of_origin: extracted.manufacturer_country,
      website: extracted.manufacturer_website,
      certifications: extracted.certifications,
      price: extracted.price,
      storage_instructions: extracted.storage_instructions,
      warnings: extracted.warnings,
      recommended_daily_intake: extracted.recommended_daily_intake,
      expiration_info: extracted.expiration_info,
    };

    if (existingProduct) {
      console.log(`[SCAN-${requestId}] 🔄 Product exists, updating: ${existingProduct.id}`);
      productId = existingProduct.id;
      
      // Update existing product
      const { error: updateError } = await supabase
        .from('supplement_products')
        .update(productData)
        .eq('id', productId);

      if (updateError) {
        console.error(`[SCAN-${requestId}] ❌ Error updating product:`, updateError);
      } else {
        console.log(`[SCAN-${requestId}] ✅ Product updated successfully`);
      }
    } else {
      console.log(`[SCAN-${requestId}] ➕ Creating new product`);
      
      const { data: newProduct, error: insertError } = await supabase
        .from('supplement_products')
        .insert(productData)
        .select('id')
        .single();

      if (insertError) {
        console.error(`[SCAN-${requestId}] ❌ Error creating product:`, insertError);
        throw new Error(`Failed to create product: ${insertError.message}`);
      }

      productId = newProduct.id;
      console.log(`[SCAN-${requestId}] ✅ Product created with ID: ${productId}`);
    }

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

    console.log(`[SCAN-${requestId}] ✅ Scan completed successfully`);
    console.log(`[SCAN-${requestId}] Result:`, {
      productId,
      supplement: extracted.supplement_name,
      brand: extracted.brand,
      biomarkers: linkedBiomarkers.length,
      times: intakeTimes.join(', ')
    });

    return new Response(JSON.stringify({
      success: true,
      productId,
      name: extracted.supplement_name,
      brand: extracted.brand,
      form: extracted.form,
      extracted,
      suggestions: response.suggestions,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(`[SCAN-${requestId}] ❌ Error:`, error);
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
