import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createServiceClient } from '../_shared/supabase-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { habitId } = await req.json();
    
    if (!habitId) {
      throw new Error('habitId is required');
    }

    console.log('[delete-habit] Starting deletion for habit:', habitId);
    const supabase = createServiceClient();

    // Delete all related data in correct order
    const tables = [
      'habit_feed_events',
      'feed_reactions',
      'habit_completions',
      'habit_measurements',
      'habit_attempts',
      'habit_stats',
      'habit_streak_history',
      'habit_achievements',
      'habit_ai_insights',
      'fasting_windows',
      'habit_journal_entries',
      'habit_notifications',
    ];

    let deletedCount = 0;
    const errors: string[] = [];

    // Delete from each table with error handling
    for (const table of tables) {
      try {
        const { error, count } = await supabase
          .from(table as any)
          .delete()
          .eq('habit_id', habitId);
        
        if (error) {
          console.error(`[delete-habit] Error deleting from ${table}:`, error);
          errors.push(`${table}: ${error.message}`);
        } else {
          console.log(`[delete-habit] Deleted ${count || 0} rows from ${table}`);
          deletedCount += count || 0;
        }
      } catch (e) {
        console.error(`[delete-habit] Exception deleting from ${table}:`, e);
        errors.push(`${table}: ${e.message}`);
      }
    }

    // Delete the habit itself
    const { error: habitError } = await supabase
      .from('habits')
      .delete()
      .eq('id', habitId);

    if (habitError) {
      console.error('[delete-habit] Error deleting habit:', habitError);
      throw new Error(`Failed to delete habit: ${habitError.message}`);
    }

    console.log('[delete-habit] Successfully deleted habit and', deletedCount, 'related records');

    return new Response(
      JSON.stringify({ 
        success: true, 
        deletedCount,
        errors: errors.length > 0 ? errors : undefined 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[delete-habit] Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
