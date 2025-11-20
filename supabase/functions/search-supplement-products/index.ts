import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createServiceClient } from '../_shared/supabase-client.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

interface SearchParams {
  query?: string;
  brand?: string;
  category?: string;
  type?: string;
  limit?: number;
  offset?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const params: SearchParams = {
      query: url.searchParams.get('query') || undefined,
      brand: url.searchParams.get('brand') || undefined,
      category: url.searchParams.get('category') || undefined,
      type: url.searchParams.get('type') || undefined,
      limit: parseInt(url.searchParams.get('limit') || '20'),
      offset: parseInt(url.searchParams.get('offset') || '0')
    };

    console.log('[search-supplement-products] Search params:', params);

    const supabase = createServiceClient();

    // Build query
    let query = supabase
      .from('supplement_products')
      .select('*', { count: 'exact' });

    // Apply filters
    if (params.query) {
      query = query.or(`name.ilike.%${params.query}%,brand.ilike.%${params.query}%`);
    }

    if (params.brand) {
      query = query.eq('brand', params.brand);
    }

    if (params.category) {
      query = query.eq('category', params.category);
    }

    if (params.type) {
      query = query.eq('type', params.type);
    }

    // Apply pagination and ordering
    query = query
      .order('name', { ascending: true })
      .range(params.offset, params.offset + params.limit - 1);

    const { data: products, error, count } = await query;

    if (error) {
      console.error('[search-supplement-products] Query error:', error);
      return jsonResponse({ error: error.message }, 500);
    }

    console.log(`[search-supplement-products] Found ${products?.length || 0} products`);

    return jsonResponse({
      products: products || [],
      total_count: count || 0,
      limit: params.limit,
      offset: params.offset
    });

  } catch (error) {
    console.error('[search-supplement-products] Error:', error);
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});
