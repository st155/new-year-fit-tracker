import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ECHO11_SYNC_URL = "https://ftnlxzcaahvuuisffhka.supabase.co/functions/v1/sync-elite10-data";
const TARGET_USER_ID = "a527db40-3f7f-448f-8782-da632711e818"; // Sergey Tokarev

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log("[sync-echo11] Starting sync for user:", TARGET_USER_ID);

  try {
    const syncSecret = Deno.env.get("ELITE10_SYNC_SECRET");
    if (!syncSecret) {
      throw new Error("ELITE10_SYNC_SECRET not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Get recovery and sleep metrics from unified_metrics
    const { data: metrics, error: metricsError } = await supabase
      .from("unified_metrics")
      .select("metric_name, value, measurement_date, source")
      .eq("user_id", TARGET_USER_ID)
      .in("metric_name", ["Recovery Score", "Sleep Quality", "Sleep Score", "Sleep Efficiency", "HRV"])
      .gte("measurement_date", yesterday)
      .order("measurement_date", { ascending: false })
      .order("priority", { ascending: true });

    if (metricsError) {
      console.error("[sync-echo11] Error fetching metrics:", metricsError);
      throw metricsError;
    }

    console.log("[sync-echo11] Found metrics:", metrics?.length || 0);

    // Get today's workouts
    const { data: workouts, error: workoutsError } = await supabase
      .from("workouts")
      .select("id, workout_type, start_time, end_time, duration_minutes, calories_burned, heart_rate_avg, source_data")
      .eq("user_id", TARGET_USER_ID)
      .gte("start_time", `${yesterday}T00:00:00Z`)
      .order("start_time", { ascending: false })
      .limit(5);

    if (workoutsError) {
      console.error("[sync-echo11] Error fetching workouts:", workoutsError);
    }

    console.log("[sync-echo11] Found workouts:", workouts?.length || 0);

    // Extract best values for each metric
    const getMetricValue = (name: string): number | null => {
      const metric = metrics?.find((m) => m.metric_name === name);
      return metric?.value ?? null;
    };

    // Get sleep quality - use Sleep Efficiency directly as percentage (0-100)
    const sleepQuality = getMetricValue("Sleep Quality") ?? getMetricValue("Sleep Score") ?? getMetricValue("Sleep Efficiency");

    // Determine workout intensity from duration and type
    let workoutIntensity: string | null = null;
    let workoutType = "none";
    
    if (workouts && workouts.length > 0) {
      const latestWorkout = workouts[0];
      workoutType = latestWorkout.workout_type || "workout";
      
      const durationMinutes = latestWorkout.duration_minutes || 0;
      const avgHr = latestWorkout.heart_rate_avg || 0;
      
      if (durationMinutes >= 90 || avgHr >= 160) {
        workoutIntensity = "Extreme";
      } else if (durationMinutes >= 60 || avgHr >= 140) {
        workoutIntensity = "High";
      } else if (durationMinutes >= 30 || avgHr >= 120) {
        workoutIntensity = "Medium";
      } else if (durationMinutes > 0) {
        workoutIntensity = "Low";
      }
    }

    const payload = {
      user_id: TARGET_USER_ID,
      date: today,
      sleep_quality: sleepQuality ? Math.round(sleepQuality) : null, // Now passes 95% instead of 1
      recovery_score: getMetricValue("Recovery Score"),
      hrv: getMetricValue("HRV"),
      workout_type: workoutType,
      workout_intensity: workoutIntensity,
      nutrition_status: "Maintenance", // Default, can be enhanced later
      metrics_count: metrics?.length || 0,
      workouts_count: workouts?.length || 0,
    };

    console.log("[sync-echo11] Sending payload:", JSON.stringify(payload));

    // Send to Echo11
    const response = await fetch(ECHO11_SYNC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Elite10-Secret": syncSecret,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    const duration = Date.now() - startTime;

    if (!response.ok) {
      console.error("[sync-echo11] Echo11 error:", response.status, responseText);
      throw new Error(`Echo11 responded with ${response.status}: ${responseText}`);
    }

    console.log("[sync-echo11] Success in", duration, "ms. Response:", responseText);

    return new Response(
      JSON.stringify({
        success: true,
        user_id: TARGET_USER_ID,
        payload,
        echo11_response: responseText,
        duration_ms: duration,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("[sync-echo11] Error:", error.message);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        duration_ms: duration,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
