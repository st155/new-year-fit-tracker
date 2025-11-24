import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createServiceClient } from "../_shared/supabase-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId } = await req.json();
    
    if (!productId) {
      throw new Error('Product ID is required');
    }

    const supabase = createServiceClient();
    
    // Fetch product data
    const { data: product, error: fetchError } = await supabase
      .from('supplement_products')
      .select('*')
      .eq('id', productId)
      .single();

    if (fetchError || !product) {
      throw new Error('Product not found');
    }

    // Check if already enriched
    if (product.description && product.benefits && product.research_summary) {
      console.log(`[ENRICH] Product ${productId} already enriched, returning cached data`);
      return new Response(JSON.stringify({ 
        success: true, 
        cached: true,
        product 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[ENRICH] Enriching product: ${product.name} by ${product.brand}`);

    // Call Lovable AI Gateway for enrichment
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are a supplement expert. Generate comprehensive, accurate information about supplements based on scientific research.

IMPORTANT: Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks):
{
  "description": "2-3 sentence comprehensive description",
  "benefits": ["benefit1", "benefit2", "benefit3"],
  "research_summary": "Paragraph about scientific research and evidence",
  "manufacturer_info": {
    "country": "Country of origin",
    "founded_year": 2020,
    "description": "About the manufacturer",
    "website": "https://example.com"
  }
}`;

    const userPrompt = `Generate comprehensive information for this supplement:
- Name: ${product.name}
- Brand: ${product.brand}
- Form: ${product.form || 'Not specified'}
- Ingredients: ${product.ingredients ? product.ingredients.join(', ') : 'Not specified'}
- Dosage: ${product.serving_size || ''} ${product.serving_unit || ''}

Focus on:
1. Clear, factual description (2-3 sentences)
2. 3-5 key evidence-based benefits
3. Research summary with scientific backing
4. Manufacturer information (research the brand if known, otherwise provide general info)`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[ENRICH] AI Gateway error:', aiResponse.status, errorText);
      throw new Error('AI enrichment failed');
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;

    // Parse AI response (remove markdown if present)
    let enrichedData;
    try {
      const cleanedContent = aiContent
        .replace(/^```json?\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      enrichedData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('[ENRICH] Failed to parse AI response:', aiContent);
      throw new Error('Failed to parse AI response');
    }

    // Update product with enriched data
    const { error: updateError } = await supabase
      .from('supplement_products')
      .update({
        description: enrichedData.description,
        benefits: enrichedData.benefits,
        research_summary: enrichedData.research_summary,
        manufacturer_info: enrichedData.manufacturer_info,
      })
      .eq('id', productId);

    if (updateError) {
      console.error('[ENRICH] Failed to update product:', updateError);
      throw updateError;
    }

    console.log(`[ENRICH] Successfully enriched product ${productId}`);

    // Return enriched product
    const { data: updatedProduct } = await supabase
      .from('supplement_products')
      .select('*')
      .eq('id', productId)
      .single();

    return new Response(JSON.stringify({ 
      success: true, 
      cached: false,
      product: updatedProduct 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[ENRICH] Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});