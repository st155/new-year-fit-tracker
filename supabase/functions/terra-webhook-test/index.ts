import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const terraSecret = Deno.env.get('TERRA_SIGNING_SECRET')!;

    const supabase = createClient(supabaseUrl, serviceKey);

    // Require authenticated caller (uses verify_jwt=true in config)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let body: any = {};
    try { body = await req.json(); } catch {}
    const type = body.type || 'auth';
    const provider = (body.provider || 'WHOOP').toUpperCase();

    // Minimal Terra-like payloads
    const payload: any = type === 'auth'
      ? {
          type: 'auth',
          reference_id: user.id,
          user: { user_id: `terra_test_${user.id.slice(0,8)}`, provider },
        }
      : {
          type: type,
          user: { user_id: `terra_test_${user.id.slice(0,8)}`, provider },
          data: [],
        };

    const rawBody = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();

    // Sign using Terra format (timestamp.body)
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(terraSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${rawBody}`));
    const signature = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2,'0')).join('');

    const webhookUrl = `${supabaseUrl}/functions/v1/webhook-terra`;
    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'terra-signature': `t=${timestamp},v1=${signature}`,
      },
      body: rawBody,
    });

    const text = await resp.text();

    return new Response(JSON.stringify({ ok: resp.ok, status: resp.status, response: text, sent: payload }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('terra-webhook-test error', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});