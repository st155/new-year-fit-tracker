/**
 * Analytics Vitals Edge Function
 * Receives and stores Web Vitals metrics from the frontend
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebVitalMetric {
  name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB' | 'INP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  url: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body
    const metric: WebVitalMetric = await req.json();

    // Validate metric
    if (!metric.name || !metric.value || !metric.rating) {
      return new Response(
        JSON.stringify({ error: 'Invalid metric data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store in database (create table if needed)
    // Table schema:
    // CREATE TABLE IF NOT EXISTS web_vitals_logs (
    //   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    //   metric_name TEXT NOT NULL,
    //   value NUMERIC NOT NULL,
    //   rating TEXT NOT NULL,
    //   url TEXT NOT NULL,
    //   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    // );

    const { error } = await supabase
      .from('web_vitals_logs')
      .insert({
        metric_name: metric.name,
        value: metric.value,
        rating: metric.rating,
        url: metric.url,
      });

    if (error) {
      console.error('Database error:', error);
      
      // If table doesn't exist, log to console only
      if (error.code === '42P01') {
        console.log('Web Vitals (table not found):', metric);
        return new Response(
          JSON.stringify({ success: true, message: 'Logged to console' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw error;
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing web vitals:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
