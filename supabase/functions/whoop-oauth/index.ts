import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    console.log('Whoop OAuth proxy request:', {
      method: req.method,
      path: url.pathname,
      search: url.search,
    });

    // Получаем поддомен из переменной окружения или используем дефолтный
    const whoopDomain = Deno.env.get('WHOOP_DOMAIN') || 'whoop.yourdomain.com';
    
    // Определяем целевой путь
    const path = url.pathname.replace('/whoop-oauth', '');
    const targetUrl = `https://${whoopDomain}${path}${url.search}`;
    
    console.log('Proxying to Terra Whoop endpoint:', targetUrl);

    // Проксируем запрос к Terra Whoop endpoint
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: Object.fromEntries(req.headers),
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
    });

    const body = await response.text();
    const responseHeaders = Object.fromEntries(response.headers);

    console.log('Whoop OAuth response:', {
      status: response.status,
      hasBody: !!body,
    });

    return new Response(body, {
      status: response.status,
      headers: { ...corsHeaders, ...responseHeaders },
    });

  } catch (error: any) {
    console.error('Whoop OAuth proxy error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
