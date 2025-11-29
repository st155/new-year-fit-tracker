import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log('[BACKFILL] Starting image URL backfill...');

    // Get all products with NULL image_url
    const { data: products, error: productsError } = await supabaseClient
      .from('supplement_products')
      .select('id, name, brand')
      .is('image_url', null);

    if (productsError) {
      console.error('[BACKFILL] Error fetching products:', productsError);
      throw productsError;
    }

    console.log(`[BACKFILL] Found ${products?.length || 0} products with NULL image_url`);

    let updatedCount = 0;
    let errorCount = 0;
    const results = [];

    for (const product of products || []) {
      try {
        // List files in supplement-images bucket matching this product
        const { data: files, error: listError } = await supabaseClient
          .storage
          .from('supplement-images')
          .list('', {
            search: product.id,
          });

        if (listError) {
          console.error(`[BACKFILL] Error listing files for ${product.id}:`, listError);
          errorCount++;
          results.push({
            productId: product.id,
            name: product.name,
            status: 'error',
            error: listError.message,
          });
          continue;
        }

        if (!files || files.length === 0) {
          results.push({
            productId: product.id,
            name: product.name,
            status: 'skipped',
            reason: 'No image files found in storage',
          });
          continue;
        }

        // Get public URL for first matching file
        const firstFile = files[0];
        const { data: urlData } = supabaseClient
          .storage
          .from('supplement-images')
          .getPublicUrl(firstFile.name);

        if (!urlData?.publicUrl) {
          errorCount++;
          results.push({
            productId: product.id,
            name: product.name,
            status: 'error',
            error: 'Failed to get public URL',
          });
          continue;
        }

        // Update product with image_url
        const { error: updateError } = await supabaseClient
          .from('supplement_products')
          .update({ image_url: urlData.publicUrl })
          .eq('id', product.id);

        if (updateError) {
          console.error(`[BACKFILL] Error updating ${product.id}:`, updateError);
          errorCount++;
          results.push({
            productId: product.id,
            name: product.name,
            status: 'error',
            error: updateError.message,
          });
          continue;
        }

        updatedCount++;
        results.push({
          productId: product.id,
          name: product.name,
          brand: product.brand,
          status: 'success',
          imageUrl: urlData.publicUrl,
        });

        console.log(`[BACKFILL] ✅ Updated ${product.name} (${product.brand})`);
      } catch (error) {
        console.error(`[BACKFILL] Error processing ${product.id}:`, error);
        errorCount++;
        results.push({
          productId: product.id,
          name: product.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(`[BACKFILL] Complete: ${updatedCount} updated, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        totalProducts: products?.length || 0,
        updatedCount,
        errorCount,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('[BACKFILL] Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
