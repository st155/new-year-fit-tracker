import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ECHO11_SYNC_URL = "https://ftnlxzcaahvuuisffhka.supabase.co/functions/v1/sync-elite10-data";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DayData {
  date: string;
  sleep_quality: number;
  recovery_score: number;
  workout_type: string;
  workout_intensity: 'Low' | 'Medium' | 'High' | 'Extreme' | null;
  nutrition_status?: 'Fasting' | 'Surplus' | 'Deficit' | 'Maintenance';
}

interface SyncRequest {
  days: DayData[];
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] echo11-sync: Request received`);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from JWT
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      console.log(`[${requestId}] No authorization header`);
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log(`[${requestId}] Auth error:`, userError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized - invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] User authenticated: ${user.id}`);

    // Get sync secret from environment
    const syncSecret = Deno.env.get("ELITE10_SYNC_SECRET");
    if (!syncSecret) {
      console.error(`[${requestId}] ELITE10_SYNC_SECRET not configured`);
      return new Response(
        JSON.stringify({ error: "Sync secret not configured on server" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: SyncRequest = await req.json();
    const { days } = body;

    if (!days || !Array.isArray(days) || days.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid request: 'days' array required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Syncing ${days.length} days for user ${user.id}`);

    // Process each day
    const results: Array<{ date: string; success: boolean; error?: string }> = [];
    const errors: string[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const day of days) {
      try {
        const payload = {
          user_id: user.id,
          date: day.date,
          sleep_quality: day.sleep_quality,
          recovery_score: day.recovery_score,
          workout_type: day.workout_type,
          workout_intensity: day.workout_intensity,
          nutrition_status: day.nutrition_status || 'Maintenance',
        };

        console.log(`[${requestId}] Sending day ${day.date}:`, JSON.stringify(payload));

        const response = await fetch(ECHO11_SYNC_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Elite10-Secret": syncSecret,
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          successCount++;
          results.push({ date: day.date, success: true });
          console.log(`[${requestId}] Day ${day.date}: success`);
        } else {
          failedCount++;
          const errorText = await response.text();
          let errorMessage: string;
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorJson.message || errorText;
          } catch {
            errorMessage = errorText;
          }
          errors.push(`${day.date}: ${errorMessage}`);
          results.push({ date: day.date, success: false, error: errorMessage });
          console.log(`[${requestId}] Day ${day.date}: failed - ${errorMessage}`);
        }
      } catch (error) {
        failedCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${day.date}: ${errorMessage}`);
        results.push({ date: day.date, success: false, error: errorMessage });
        console.error(`[${requestId}] Day ${day.date}: exception - ${errorMessage}`);
      }

      // Small delay to avoid rate limiting
      if (days.indexOf(day) < days.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`[${requestId}] Sync complete: ${successCount} success, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: successCount,
        failed: failedCount,
        errors,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
