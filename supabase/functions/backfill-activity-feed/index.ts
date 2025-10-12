import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Получаем все Workout Strain метрики за последние 7 дней, для которых нет activity feed
    const { data: strainMetrics, error: metricsError } = await supabaseClient
      .from('metric_values')
      .select(`
        id,
        user_id,
        value,
        measurement_date,
        external_id,
        metric_id,
        user_metrics!inner (
          metric_name,
          metric_category
        )
      `)
      .eq('user_metrics.metric_name', 'Workout Strain')
      .gte('measurement_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

    if (metricsError) throw metricsError

    console.log(`Found ${strainMetrics?.length || 0} strain metrics`)

    const feedEntries = []

    for (const strain of strainMetrics || []) {
      // Проверяем, есть ли уже запись в activity_feed
      const { data: existing } = await supabaseClient
        .from('activity_feed')
        .select('id')
        .eq('source_id', strain.id)
        .eq('source_table', 'metric_values')
        .single()

      if (existing) {
        console.log(`Activity feed entry already exists for ${strain.id}`)
        continue
      }

      // Получаем username
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('username')
        .eq('user_id', strain.user_id)
        .single()

      const username = profile?.username || 'user'

      // Ищем соответствующие calories для этой тренировки
      const baseExternalId = strain.external_id
      const caloriesExternalId = `${baseExternalId}_calories`

      const { data: caloriesMetric } = await supabaseClient
        .from('metric_values')
        .select(`
          value,
          user_metrics!inner (
            metric_name
          )
        `)
        .eq('user_id', strain.user_id)
        .eq('measurement_date', strain.measurement_date)
        .eq('external_id', caloriesExternalId)
        .eq('user_metrics.metric_name', 'Workout Calories')
        .single()

      let actionText = `${username} completed a workout`
      
      if (caloriesMetric?.value) {
        actionText += `, ${Math.round(caloriesMetric.value)}kcal`
      }
      
      actionText += `, ${Number(strain.value).toFixed(1)} strain`

      feedEntries.push({
        user_id: strain.user_id,
        action_type: 'metric_values',
        action_text: actionText,
        source_table: 'metric_values',
        source_id: strain.id,
        metadata: {
          workout_id: strain.external_id,
          strain: strain.value,
          calories: caloriesMetric?.value || null,
          date: strain.measurement_date
        }
      })
    }

    console.log(`Creating ${feedEntries.length} activity feed entries`)

    if (feedEntries.length > 0) {
      const { data, error: insertError } = await supabaseClient
        .from('activity_feed')
        .insert(feedEntries)
        .select()

      if (insertError) throw insertError

      return new Response(
        JSON.stringify({
          success: true,
          created: data.length,
          entries: data
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'No new entries to create',
        created: 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
