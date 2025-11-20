import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

interface ScanRequest {
  barcode: string;
  create_if_not_found?: boolean;
}

interface ProductData {
  id?: string;
  name: string;
  brand: string;
  category: string;
  barcode: string;
  serving_size: number;
  serving_unit: string;
  image_url?: string;
  ingredients?: string[];
  recommended_dosage?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { barcode, create_if_not_found = false }: ScanRequest = await req.json();

    if (!barcode) {
      return jsonResponse({ error: 'Barcode is required' }, 400);
    }

    console.log(`[scan-supplement-barcode] Scanning barcode: ${barcode}`);
    const supabase = createServiceClient();

    // Step 1: Check our database first
    const { data: existingProduct, error: dbError } = await supabase
      .from('supplement_products')
      .select('*')
      .eq('barcode', barcode)
      .maybeSingle();

    if (dbError) {
      console.error('[scan-supplement-barcode] Database error:', dbError);
    }

    if (existingProduct) {
      console.log('[scan-supplement-barcode] Found in database');
      return jsonResponse({
        found: true,
        source: 'database',
        product: existingProduct
      });
    }

    // Step 2: Try Open Food Facts API
    console.log('[scan-supplement-barcode] Querying Open Food Facts API');
    const offResponse = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`
    );

    if (offResponse.ok) {
      const offData = await offResponse.json();
      
      if (offData.status === 1 && offData.product) {
        const product = offData.product;
        const productData: ProductData = {
          name: product.product_name || 'Unknown Product',
          brand: product.brands || 'Unknown Brand',
          category: product.categories?.split(',')[0] || 'supplement',
          barcode: barcode,
          serving_size: parseFloat(product.serving_size) || 1,
          serving_unit: product.serving_quantity_unit || 'serving',
          image_url: product.image_url || product.image_front_url,
          ingredients: product.ingredients_text?.split(',').map((i: string) => i.trim()) || [],
          recommended_dosage: product.serving_size || '1 serving'
        };

        console.log('[scan-supplement-barcode] Found in Open Food Facts');

        // Step 3: Save to database if requested
        if (create_if_not_found) {
          console.log('[scan-supplement-barcode] Creating product in database');
          const { data: newProduct, error: insertError } = await supabase
            .from('supplement_products')
            .insert({
              name: productData.name,
              brand: productData.brand,
              category: productData.category,
              barcode: productData.barcode,
              serving_size: productData.serving_size,
              serving_unit: productData.serving_unit,
              image_url: productData.image_url,
              ingredients: productData.ingredients,
              recommended_dosage: productData.recommended_dosage,
              type: 'supplement',
              is_placeholder: false
            })
            .select()
            .single();

          if (insertError) {
            console.error('[scan-supplement-barcode] Insert error:', insertError);
          } else {
            productData.id = newProduct.id;
          }
        }

        return jsonResponse({
          found: true,
          source: 'openfoodfacts',
          product: productData
        });
      }
    }

    // Step 4: Not found
    console.log('[scan-supplement-barcode] Product not found');
    return jsonResponse({
      found: false,
      source: null,
      product: null,
      message: 'Product not found in any database'
    }, 404);

  } catch (error) {
    console.error('[scan-supplement-barcode] Error:', error);
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});
