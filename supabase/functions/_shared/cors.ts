/**
 * Unified CORS configuration
 * Single source of truth for all Edge Functions
 */

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 
    'authorization, x-client-info, apikey, content-type, x-idempotency-key, x-request-id',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
  'Access-Control-Max-Age': '86400', // 24 hours
};

/**
 * Handle CORS preflight
 */
export function handleCorsPreFlight(): Response {
  return new Response('ok', { 
    status: 200, 
    headers: corsHeaders 
  });
}

/**
 * Add CORS headers to response
 */
export function withCors(response: Response): Response {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

/**
 * Create JSON response with CORS
 */
export function jsonResponse(
  data: any, 
  status: number = 200
): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
}
