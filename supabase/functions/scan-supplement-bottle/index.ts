import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createAuthClient } from "../_shared/supabase-client.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScanRequest {
  frontImageBase64: string;      // Front side (required)
  backImageBase64?: string;      // Back side (optional)
  imageBase64?: string;          // Legacy single image for backward compatibility
}

async function uploadImageToStorage(
  imageBase64: string,
  productId: string
): Promise<string | null> {
  try {
    console.log('[SCAN-BOTTLE] Uploading image to Storage...');
    
    // Convert base64 to Uint8Array
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Create storage client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const storageClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Upload to supplement-images bucket
    const fileName = `${productId}_${Date.now()}.jpg`;
    const { error: uploadError } = await storageClient.storage
      .from('supplement-images')
      .upload(fileName, bytes, {
        contentType: 'image/jpeg',
        upsert: true,
      });
    
    if (uploadError) {
      console.error('[SCAN-BOTTLE] Upload error:', uploadError);
      return null;
    }
    
    // Get public URL
    const { data: urlData } = storageClient.storage
      .from('supplement-images')
      .getPublicUrl(fileName);
    
    console.log('[SCAN-BOTTLE] ✅ Image uploaded:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error('[SCAN-BOTTLE] Image upload error:', error);
    return null;
  }
}

interface ExtractedData {
  brand: string;
  supplement_name: string;
  dosage_per_serving: string;
  servings_per_container: number;
  form: string;
  barcode?: string | null;        // NEW: Barcode from back side
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

// Normalize form values to match database constraint
function normalizeForm(rawForm: string | null | undefined): string {
  if (!rawForm) return 'other';
  
  const form = rawForm.toLowerCase().trim();
  
  // Mapping different variants to standard values
  if (form.includes('capsule') || form.includes('vcap') || form.includes('veggie cap')) {
    return 'capsule';
  }
  if (form.includes('tablet') || form.includes('tab')) {
    return 'tablet';
  }
  if (form.includes('powder')) {
    return 'powder';
  }
  if (form.includes('liquid') || form.includes('drops') || form.includes('tincture')) {
    return 'liquid';
  }
  if (form.includes('gummy') || form.includes('gummies')) {
    return 'gummy';
  }
  if (form.includes('softgel') || form.includes('soft gel') || form.includes('gelcap')) {
    return 'softgel';
  }
  
  return 'other';
}

// Normalize dosage unit to match database constraint
// Allowed values: 'mg', 'g', 'mcg', 'IU', 'ml', 'serving'
function normalizeDosageUnit(rawUnit: string | null | undefined): string {
  if (!rawUnit) return 'serving';
  
  const unit = rawUnit.toLowerCase().trim();
  
  // Direct matches
  if (['mg', 'g', 'mcg', 'iu', 'ml', 'serving'].includes(unit)) {
    return unit === 'iu' ? 'IU' : unit;
  }
  
  // Common aliases
  const aliases: Record<string, string> = {
    'milligram': 'mg',
    'milligrams': 'mg',
    'gram': 'g',
    'grams': 'g',
    'microgram': 'mcg',
    'micrograms': 'mcg',
    'µg': 'mcg',
    'μg': 'mcg',
    'international unit': 'IU',
    'international units': 'IU',
    'milliliter': 'ml',
    'milliliters': 'ml',
    'capsule': 'serving',
    'capsules': 'serving',
    'tablet': 'serving',
    'tablets': 'serving',
    'softgel': 'serving',
    'softgels': 'serving',
    'veggie': 'serving',
    'veg': 'serving',
    'scoop': 'serving',
    'scoops': 'serving',
    'drop': 'ml',
    'drops': 'ml',
  };
  
  if (aliases[unit]) return aliases[unit];
  
  // Partial matches
  if (unit.includes('mg')) return 'mg';
  if (unit.includes('mcg') || unit.includes('µg')) return 'mcg';
  if (unit.includes('ml')) return 'ml';
  if (unit.includes('iu')) return 'IU';
  if (unit.includes('gram')) return 'g';
  
  return 'serving'; // Safe default
}

// Validate and clean barcode
function validateBarcode(barcode: string | null | undefined): string | null {
  if (!barcode) return null;
  
  // Remove all non-digit characters
  const cleaned = barcode.replace(/\D/g, '');
  
  // UPC-A: 12 digits, EAN-13: 13 digits
  if (cleaned.length !== 12 && cleaned.length !== 13) {
    console.log('[BARCODE] Invalid length:', cleaned.length, '(expected 12 or 13)');
    return null;
  }
  
  console.log('[BARCODE] ✅ Valid barcode:', cleaned);
  return cleaned;
}

async function callGeminiWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 2
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // If rate limited, wait and retry
      if (response.status === 429) {
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          console.log(`[SCAN-RETRY] Rate limited (429), waiting ${delay}ms before retry ${attempt + 1}/${maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      return response;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`[SCAN-RETRY] Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Max retries exceeded');
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

    const { frontImageBase64, backImageBase64, imageBase64 }: ScanRequest = await req.json();

    // Handle backward compatibility - if only imageBase64 provided, use it as frontImage
    const frontImage = frontImageBase64 || imageBase64;
    const backImage = backImageBase64;

    if (!frontImage) {
      console.error(`[SCAN-${requestId}] ❌ No front image provided`);
      throw new Error('No front image provided');
    }

    console.log(`[SCAN-${requestId}] 📷 Images received:`, {
      front: `${Math.round(frontImage.length / 1024)}KB`,
      back: backImage ? `${Math.round(backImage.length / 1024)}KB` : 'not provided'
    });

    // Call Lovable AI Gateway with Gemini Vision
    console.log(`[SCAN-${requestId}] 🤖 Calling Gemini Vision API...`);
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error(`[SCAN-${requestId}] ❌ LOVABLE_API_KEY not configured`);
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const visionPrompt = backImage 
      ? `Analyze these two supplement bottle photos and extract ALL visible information:

IMAGE 1 (FRONT SIDE): Extract product identification
- BRAND: Manufacturer/brand name
- SUPPLEMENT_NAME: Main supplement name (e.g., "Vitamin D3", "Magnesium Glycinate")
- DOSAGE_PER_SERVING: Amount per serving with unit (e.g., "5000 IU", "400mg")
- SERVINGS_PER_CONTAINER: Total servings in the bottle (number)
- FORM: capsule/tablet/powder/liquid/gummy/softgel

IMAGE 2 (BACK SIDE): Extract additional details - FOCUS ON BARCODE EXTRACTION!
🎯 CRITICAL: BARCODE EXTRACTION IS TOP PRIORITY!
Look for the BARCODE on the back side image:
- Standard formats: UPC-A (12 digits) or EAN-13 (13 digits)
- Usually located near the bottom of the label
- Look for the black and white vertical lines: ████████████
- The NUMBERS appear BENEATH the barcode lines
- Extract the EXACT DIGITS (e.g., "012345678901" for UPC-A, "5901234123457" for EAN-13)
- NO spaces, NO dashes, ONLY the numeric digits
- If you cannot clearly read the barcode digits, return null

OTHER BACK SIDE INFO:
- INGREDIENTS: Complete ingredients list (active + inactive)
- WARNINGS: Health warnings, allergens, or contraindications
- STORAGE_INSTRUCTIONS: Storage recommendations
- RECOMMENDED_DAILY_INTAKE: Usage instructions from manufacturer
- EXPIRATION_INFO: Expiration or "Best by" date
- Other visible label information

Return ONLY valid JSON (no markdown):
{
  "brand": "...",
  "supplement_name": "...",
  "dosage_per_serving": "...",
  "servings_per_container": number,
  "form": "...",
  "barcode": "012345678901" or null,
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
}`
      : `Analyze this supplement bottle photo and extract ALL visible information from the label:

REQUIRED FIELDS:
1. BRAND: Manufacturer/brand name
2. SUPPLEMENT_NAME: Main supplement name (e.g., "Vitamin D3", "Magnesium Glycinate")
3. DOSAGE_PER_SERVING: Amount per serving with unit (e.g., "5000 IU", "400mg")
4. SERVINGS_PER_CONTAINER: Total servings in the bottle (number)
5. FORM: capsule/tablet/powder/liquid/gummy/softgel

EXTRACT FROM LABEL (if visible):
6. BARCODE: UPC or EAN barcode if visible (typically 12-13 digits)
7. LABEL_DESCRIPTION: Product description text from the bottle label
8. LABEL_BENEFITS: Any health claims or benefits listed on the label (array)
9. INGREDIENTS: Complete ingredients list (active + inactive)
10. MANUFACTURER_COUNTRY: Country of origin ("Made in...", "Product of...")
11. MANUFACTURER_WEBSITE: Website URL if visible on label
12. CERTIFICATIONS: Quality certifications (GMP, NSF, Organic, Non-GMO, etc.)
13. PRICE: Price if visible on label or price sticker
14. STORAGE_INSTRUCTIONS: Storage recommendations ("Keep refrigerated", "Store in cool dry place")
15. WARNINGS: Health warnings, allergens, or contraindications
16. RECOMMENDED_DAILY_INTAKE: Usage instructions from manufacturer
17. EXPIRATION_INFO: Expiration or "Best by" date

Return ONLY valid JSON (no markdown):
{
  "brand": "...",
  "supplement_name": "...",
  "dosage_per_serving": "...",
  "servings_per_container": number,
  "form": "...",
  "barcode": "..." or null,
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

    // Setup timeout with AbortController (increased to 90s)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 seconds

    const visionResponse = await callGeminiWithRetry(
      'https://ai.gateway.lovable.dev/v1/chat/completions',
      {
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
              content: backImage 
                ? [
                    { type: 'text', text: visionPrompt },
                    { type: 'image_url', image_url: { url: frontImage } },
                    { type: 'image_url', image_url: { url: backImage } }
                  ]
                : [
                    { type: 'text', text: visionPrompt },
                    { type: 'image_url', image_url: { url: frontImage } }
                  ]
            }
          ],
          max_tokens: 1000,
        }),
      },
      2 // max 2 retries (3 total attempts)
    );

    clearTimeout(timeoutId);

    if (!visionResponse.ok) {
      const error = await visionResponse.text();
      console.error(`[SCAN-${requestId}] ❌ Vision API error (${visionResponse.status}):`, error);
      
      // Return specific error codes
      if (visionResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            errorCode: 'RATE_LIMITED',
            error: 'Too many requests. Please wait a moment and try again.' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
      
      if (visionResponse.status >= 500) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            errorCode: 'GEMINI_SERVER_ERROR',
            error: 'AI service temporarily unavailable. Please try again.' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          errorCode: 'VISION_API_ERROR',
          error: `Image analysis failed (${visionResponse.status})` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const visionData = await visionResponse.json();
    const content = visionData.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error(`[SCAN-${requestId}] ❌ No content from Vision API`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          errorCode: 'IMAGE_UNREADABLE',
          error: 'Could not read supplement label from image. Please ensure label is clearly visible.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
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
        dosage: extracted.dosage_per_serving,
        barcode: extracted.barcode || 'not extracted'
      });
    } catch (parseError) {
      console.error(`[SCAN-${requestId}] ❌ Failed to parse AI response:`, parseError);
      console.error(`[SCAN-${requestId}] Raw content:`, content.substring(0, 500));
      return new Response(
        JSON.stringify({ 
          success: false, 
          errorCode: 'PARSE_FAILED',
          error: 'Could not extract supplement information. Label may be unclear or damaged.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // QUICK BARCODE LOOKUP: Check if product already exists by barcode
    const validatedBarcode = validateBarcode(extracted.barcode);
    if (validatedBarcode) {
      console.log(`[SCAN-${requestId}] 🔍 QUICK LOOKUP: Checking barcode ${validatedBarcode}...`);
      
      const { data: existingByBarcode, error: barcodeError } = await supabase
        .from('supplement_products')
        .select('*')
        .eq('barcode', validatedBarcode)
        .maybeSingle();
      
      if (barcodeError) {
        console.error(`[SCAN-${requestId}] ❌ Barcode lookup error:`, barcodeError);
      }
      
      if (existingByBarcode) {
        console.log(`[SCAN-${requestId}] ⚡ QUICK MATCH! Product found by barcode:`, existingByBarcode.id);
        
        // Return immediately with existing product (skip AI enrichment)
        const quickResponse = {
          success: true,
          quick_match: true,  // Flag indicating instant match
          productId: existingByBarcode.id,
          extracted: {
            ...extracted,
            barcode: validatedBarcode,
          },
          suggestions: {
            intake_times: suggestIntakeTimes(existingByBarcode.name, existingByBarcode.form),
            linked_biomarkers: [],
            ai_rationale: `Quick match from barcode ${validatedBarcode}`,
            target_outcome: generateTargetOutcome(existingByBarcode.name),
          },
        };
        
        console.log(`[SCAN-${requestId}] ✅ QUICK MATCH response sent (no AI enrichment needed)`);
        
        return new Response(JSON.stringify(quickResponse), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      console.log(`[SCAN-${requestId}] ℹ️ Barcode not found in database, proceeding with full AI analysis...`);
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

    // Parse dosage with smart extraction and normalization
    const dosageMatch = extracted.dosage_per_serving?.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/);
    const parsedDosageAmount = dosageMatch 
      ? parseFloat(dosageMatch[1]) 
      : 1;  // Default: 1 serving
    const parsedDosageUnit = normalizeDosageUnit(dosageMatch?.[2]);

    let productId: string;
    const productData = {
      name: extracted.supplement_name,
      brand: extracted.brand,
      form: normalizeForm(extracted.form),
      barcode: validatedBarcode || null,  // Save validated barcode
      dosage_amount: parsedDosageAmount,
      dosage_unit: parsedDosageUnit,  // Now always valid!
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
      
      // First attempt with extracted data
      const { data: newProduct, error: insertError } = await supabase
        .from('supplement_products')
        .insert(productData)
        .select('id')
        .single();

      if (insertError) {
        console.error(`[SCAN-${requestId}] ❌ First insert attempt failed:`, insertError);
        console.log(`[SCAN-${requestId}] 🔄 Retrying with safe defaults...`);
        
        // Retry with safe defaults
        const safeProductData = {
          ...productData,
          dosage_unit: 'serving',
          dosage_amount: 1,
        };
        
        const { data: retryProduct, error: retryError } = await supabase
          .from('supplement_products')
          .insert(safeProductData)
          .select('id')
          .single();
        
        if (retryError) {
          console.error(`[SCAN-${requestId}] ❌ Retry also failed:`, retryError);
          throw new Error(`Failed to create product: ${retryError.message}`);
        }
        
        productId = retryProduct.id;
        console.log(`[SCAN-${requestId}] ✅ Product created with safe defaults: ${productId}`);
      } else {
        productId = newProduct.id;
        console.log(`[SCAN-${requestId}] ✅ Product created with ID: ${productId}`);
      }
    }

    // Upload image to Storage and save image_url (use front image)
    let imageUrl: string | null = null;
    if (frontImage && productId) {
      console.log(`[SCAN-${requestId}] 📸 Uploading product image (front side)...`);
      imageUrl = await uploadImageToStorage(frontImage, productId);
      
      if (imageUrl) {
        const { error: updateError } = await supabase
          .from('supplement_products')
          .update({ image_url: imageUrl })
          .eq('id', productId);
        
        if (updateError) {
          console.error(`[SCAN-${requestId}] ❌ Failed to save image_url:`, updateError);
        } else {
          console.log(`[SCAN-${requestId}] ✅ image_url saved to database`);
        }
      }
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
      barcode: extracted.barcode || 'not found',
      biomarkers: linkedBiomarkers.length,
      times: intakeTimes.join(', '),
      imageUrl: imageUrl ? 'uploaded' : 'no image'
    });

    return new Response(JSON.stringify({
      success: true,
      productId,
      imageUrl,
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
