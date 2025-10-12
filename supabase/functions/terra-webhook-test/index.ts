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
    const dryRun = !!body.dryRun;
    const customRawBody = body.rawBody as string | undefined;
    const overrideTimestamp = body.timestamp as string | undefined;

    // Minimal Terra-like payloads (or use provided rawBody)
    const payload: any = customRawBody ? null : (type === 'auth'
      ? {
          type: 'auth',
          reference_id: user.id,
          user: { user_id: `terra_test_${user.id.slice(0,8)}`, provider },
        }
      : {
          type: type,
          user: { user_id: `terra_test_${user.id.slice(0,8)}`, provider },
          data: [],
        });

    const rawBody = customRawBody ?? JSON.stringify(payload);
    const timestamp = (overrideTimestamp ?? Math.floor(Date.now() / 1000).toString());

    // Sign using Terra formats
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(terraSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sigBuf1 = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${rawBody}`));
    const sig1 = Array.from(new Uint8Array(sigBuf1)).map(b => b.toString(16).padStart(2,'0')).join('');
    const sigBuf2 = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}${rawBody}`));
    const sig2 = Array.from(new Uint8Array(sigBuf2)).map(b => b.toString(16).padStart(2,'0')).join('');

    const header1 = `t=${timestamp},v1=${sig1}`;
    const header2 = `t=${timestamp},v1=${sig2}`;

    const webhookUrl = `${supabaseUrl}/functions/v1/webhook-terra`;

    if (dryRun) {
      return new Response(JSON.stringify({
        ok: true,
        dryRun: true,
        timestamp,
        header_examples: { preferred: header1, alternative: header2 },
        bodyPreview: rawBody.slice(0, 120),
        webhookUrl,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'terra-signature': header1,
      },
      body: rawBody,
    });

    const text = await resp.text();

    return new Response(JSON.stringify({ ok: resp.ok, status: resp.status, response: text, sent: payload ?? rawBody, used_header: header1, timestamp }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('terra-webhook-test error', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});