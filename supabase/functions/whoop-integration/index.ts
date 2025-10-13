import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TokenResponse {
  access_token: string;
  token_type: string;
  refresh_token?: string;
  scope?: string;
  expires_in?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const WHOOP_CLIENT_ID = Deno.env.get('WHOOP_CLIENT_ID')!;
    const WHOOP_CLIENT_SECRET = Deno.env.get('WHOOP_CLIENT_SECRET')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    let action = url.searchParams.get('action');
    let body: any = {};

    if (req.method !== 'GET') {
      try {
        body = await req.json();
        action = action || body.action;
      } catch {}
    }

    const json = (data: any, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    // Helper: auth user from bearer token
    const getUser = async () => {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) return { user: null };
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) return { user: null };
      return { user };
    };

    // Helper: RPC create_or_get_metric
    async function createOrGetMetric(userId: string, name: string, category: string, unit: string, source = 'whoop') {
      const { data: metricId, error } = await supabase.rpc('create_or_get_metric', {
        p_user_id: userId,
        p_metric_name: name,
        p_metric_category: category,
        p_unit: unit,
        p_source: source,
      });
      if (error) throw error;
      return metricId as string;
    }

    async function insertMetricValue(userId: string, metricId: string, dateISO: string, value: number, externalId?: string, source_data?: any) {
      const { error } = await supabase.from('metric_values').insert({
        user_id: userId,
        metric_id: metricId,
        measurement_date: dateISO.split('T')[0],
        value,
        external_id: externalId,
        source_data,
      });
      if (error) throw error;
    }

    async function fetchJSON(url: string, accessToken: string) {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) throw new Error(`WHOOP ${url} -> ${res.status}`);
      return res.json();
    }

    async function refreshTokenIfNeeded(userId: string) {
      const { data: tokens } = await supabase
        .from('whoop_tokens')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (!tokens) return null;

      const now = Date.now();
      const expiresAt = tokens.expires_at ? new Date(tokens.expires_at).getTime() : 0;
      let accessToken = tokens.access_token as string;
      let refreshToken = tokens.refresh_token as string | undefined;

      if (expiresAt && expiresAt - now < 60_000 && refreshToken) {
        const form = new URLSearchParams();
        form.set('grant_type', 'refresh_token');
        form.set('refresh_token', refreshToken);
        form.set('client_id', WHOOP_CLIENT_ID);
        form.set('client_secret', WHOOP_CLIENT_SECRET);
        const res = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: form.toString(),
        });
        if (!res.ok) throw new Error(`WHOOP refresh failed ${res.status}`);
        const t: TokenResponse = await res.json();
        const expiresAtNew = new Date(Date.now() + (t.expires_in ?? 3600) * 1000).toISOString();
        accessToken = t.access_token;
        refreshToken = t.refresh_token || refreshToken;
        await supabase.from('whoop_tokens').update({
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: expiresAtNew,
          scope: t.scope,
        }).eq('id', tokens.id);
      }

      return { accessToken, whoop_user_id: tokens.whoop_user_id as string };
    }

    async function ingestInitialData(userId: string, accessToken: string) {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 14);
      const startISO = start.toISOString();
      const endISO = end.toISOString();

      // Workouts
      try {
        const workouts = await fetchJSON(`https://api.prod.whoop.com/developer/v1/workout?start=${startISO}&end=${endISO}`, accessToken);
        if (workouts?.records?.length) {
          const strainId = await createOrGetMetric(userId, 'Workout Strain', 'workout', 'AU', 'whoop');
          const kcalId = await createOrGetMetric(userId, 'Workout Calories', 'workout', 'kcal', 'whoop');
          const avgHrId = await createOrGetMetric(userId, 'Workout Avg HR', 'workout', 'bpm', 'whoop');
          for (const w of workouts.records) {
            const dateISO = w.start || w.created_at;
            if (w.score?.strain != null) await insertMetricValue(userId, strainId, dateISO, Number(w.score.strain), w.id, w);
            if (w.score?.kilojoule != null) await insertMetricValue(userId, kcalId, dateISO, Math.round(Number(w.score.kilojoule) / 4.184), w.id, w);
            if (w.score?.average_heart_rate != null) await insertMetricValue(userId, avgHrId, dateISO, Number(w.score.average_heart_rate), w.id, w);
          }
        }
      } catch (e) {
        console.log('WHOOP workouts fetch error', e?.message || e);
      }

      // Recovery
      try {
        const rec = await fetchJSON(`https://api.prod.whoop.com/developer/v1/recovery?start=${startISO}&end=${endISO}`, accessToken);
        if (rec?.records?.length) {
          const rScoreId = await createOrGetMetric(userId, 'Recovery Score', 'recovery', '%', 'whoop');
          const rhrId = await createOrGetMetric(userId, 'Resting HR', 'recovery', 'bpm', 'whoop');
          const hrvId = await createOrGetMetric(userId, 'HRV (rMSSD)', 'recovery', 'ms', 'whoop');
          for (const r of rec.records) {
            const dateISO = r.created_at || r.updated_at;
            if (r.score?.recovery_score != null) await insertMetricValue(userId, rScoreId, dateISO, Number(r.score.recovery_score), r.cycle_id, r);
            if (r.score?.resting_heart_rate != null) await insertMetricValue(userId, rhrId, dateISO, Number(r.score.resting_heart_rate), r.cycle_id, r);
            if (r.score?.hrv_rmssd_milli != null) await insertMetricValue(userId, hrvId, dateISO, Number(r.score.hrv_rmssd_milli), r.cycle_id, r);
          }
        }
      } catch (e) {
        console.log('WHOOP recovery fetch error', e?.message || e);
      }

      // Sleep
      try {
        const sleep = await fetchJSON(`https://api.prod.whoop.com/developer/v1/sleep?start=${startISO}&end=${endISO}`, accessToken);
        if (sleep?.records?.length) {
          const sleepDurId = await createOrGetMetric(userId, 'Sleep Duration', 'sleep', 'h', 'whoop');
          for (const s of sleep.records) {
            const startTs = new Date(s.start || s.created_at).getTime();
            const endTs = new Date(s.end || s.updated_at).getTime();
            const hours = Math.max(0, (endTs - startTs) / 3_600_000);
            await insertMetricValue(userId, sleepDurId, s.start || s.created_at, Number(hours.toFixed(2)), s.id, s);
          }
        }
      } catch (e) {
        console.log('WHOOP sleep fetch error', e?.message || e);
      }
    }

    if (action === 'get-auth-url') {
      const { user } = await getUser();
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const baseUrl: string = body.baseUrl || url.searchParams.get('baseUrl') || '';
      const redirectUri = `${baseUrl}/whoop-callback`;
      const state = Math.random().toString(36).slice(2, 10);
      const scope = encodeURIComponent('read:workout read:profile read:cycles offline read:recovery read:body_measurement read:sleep');
      const authUrl = `https://api.prod.whoop.com/oauth/oauth2/auth?client_id=${encodeURIComponent(WHOOP_CLIENT_ID)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}`;
      return json({ url: authUrl, state, redirectUri });
    }

    if (action === 'exchange-token') {
      const { user } = await getUser();
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const code: string = body.code;
      const redirectUri: string = body.redirectUri;
      if (!code || !redirectUri) return json({ error: 'Missing code or redirectUri' }, 400);

      // Exchange code -> token
      const form = new URLSearchParams();
      form.set('grant_type', 'authorization_code');
      form.set('code', code);
      form.set('redirect_uri', redirectUri);
      form.set('client_id', WHOOP_CLIENT_ID);
      form.set('client_secret', WHOOP_CLIENT_SECRET);

      const tokenRes = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      });

      if (!tokenRes.ok) {
        const txt = await tokenRes.text();
        console.log('WHOOP token error', tokenRes.status, txt);
        return json({ error: 'Token exchange failed', details: txt }, 400);
      }

      const token: TokenResponse = await tokenRes.json();
      const expiresAt = new Date(Date.now() + (token.expires_in ?? 3600) * 1000).toISOString();

      // Fetch basic profile to get whoop user id
      const profile = await fetchJSON('https://api.prod.whoop.com/developer/v2/user/profile/basic', token.access_token);
      const whoopUserId = String(profile?.user_id ?? '');

      // Upsert mapping
      await supabase.from('whoop_user_mapping').upsert({
        user_id: user.id,
        whoop_user_id: whoopUserId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      // Upsert token
      await supabase.from('whoop_tokens').upsert({
        user_id: user.id,
        whoop_user_id: whoopUserId,
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        scope: token.scope,
        expires_at: expiresAt,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      // Ingest initial data in background
      // @ts-ignore - Edge Runtime
      EdgeRuntime.waitUntil(ingestInitialData(user.id, token.access_token));

      return json({ success: true, whoop_user_id: whoopUserId });
    }

    if (action === 'sync-data') {
      const { user } = await getUser();
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const refreshed = await refreshTokenIfNeeded(user.id);
      if (!refreshed) return json({ error: 'Not connected' }, 404);
      await ingestInitialData(user.id, refreshed.accessToken);
      return json({ success: true });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e: any) {
    console.error('whoop-integration error', e?.message || e);
    return new Response(JSON.stringify({ error: e?.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});