import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Apple Health processing request:', { bodyKeys: Object.keys(body) });

    const { userId, filePath, metrics, workouts, summaries } = body;

    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log('Processing request body:', {
      userId: userId ? 'present' : 'missing',
      filePath: filePath ? 'present' : 'missing',
      metricsPresent: !!metrics,
      workoutsPresent: !!workouts,
      summariesPresent: !!summaries,
      metricsCount: metrics?.length || 0,
      workoutsCount: workouts?.length || 0,
      summariesCount: summaries?.length || 0
    });

    // If filePath is provided but no parsed data, we need to parse the file
    if (filePath && (!metrics && !workouts && !summaries)) {
      console.log('No structured data provided, need to implement file parsing');
      console.log('FilePath received:', filePath);
      
      // For now, return early with information
      return new Response(
        JSON.stringify({ 
          error: 'File parsing not yet implemented in edge function',
          message: 'Please parse the file client-side and send structured data',
          received: { filePath, userId }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const saved = {
      metrics: 0,
      workouts: 0,
      summaries: 0
    };

    // Process metrics in batches for better performance
    if (metrics && metrics.length > 0) {
      const batchSize = 500;
      let totalSaved = 0;
      
      for (let i = 0; i < metrics.length; i += batchSize) {
        const batch = metrics.slice(i, i + batchSize);
        
        try {
          // Insert metric definitions first
          const uniqueMetrics = Array.from(new Set(batch.map((m: any) => m.metric_name)))
            .map(name => {
              const sampleMetric = batch.find((m: any) => m.metric_name === name);
              return {
                user_id: userId,
                metric_name: name,
                metric_type: sampleMetric?.metric_type || 'health',
                unit: sampleMetric?.unit || '',
                source: 'apple_health'
              };
            });

          await supabase
            .from('user_metrics')
            .upsert(uniqueMetrics, { onConflict: 'user_id,metric_name' });

          // Then insert metric values
          const { error } = await supabase
            .from('metric_values')
            .insert(batch);

          if (error) {
            console.error('Error inserting metrics batch:', error);
          } else {
            totalSaved += batch.length;
          }
        } catch (err) {
          console.error('Error processing metrics batch:', err);
        }
      }
      
      saved.metrics = totalSaved;
    }

    // Process workouts
    if (workouts && workouts.length > 0) {
      try {
        const { error } = await supabase
          .from('workouts')
          .insert(workouts);

        if (error) {
          console.error('Error inserting workouts:', error);
        } else {
          saved.workouts = workouts.length;
        }
      } catch (err) {
        console.error('Error processing workouts:', err);
      }
    }

    // Process activity summaries
    if (summaries && summaries.length > 0) {
      try {
        const { error } = await supabase
          .from('activity_summaries')
          .insert(summaries);

        if (error) {
          console.error('Error inserting summaries:', error);
        } else {
          saved.summaries = summaries.length;
        }
      } catch (err) {
        console.error('Error processing summaries:', err);
      }
    }

    // Create health record entry
    await supabase
      .from('health_records')
      .insert({
        user_id: userId,
        metric_name: 'Apple Health Import',
        category: 'apple_health',
        data_count: saved.metrics + saved.workouts + saved.summaries,
        file_name: 'apple_health_export.zip',
        import_date: new Date().toISOString()
      });

    const result = { saved };
    console.log('Processing completed successfully:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Apple Health processing error:', error);

    return new Response(
      JSON.stringify({ 
        error: 'Processing failed',
        message: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});