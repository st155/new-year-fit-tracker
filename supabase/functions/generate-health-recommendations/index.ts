import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { corsHeaders } from '../_shared/cors.ts';
import { createAIClient, AIProvider } from '../_shared/ai-client.ts';
import { Logger } from '../_shared/monitoring.ts';
import { EdgeFunctionError, ErrorCode } from '../_shared/error-handling.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const logger = new Logger('generate-health-recommendations');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`Generating health recommendations for user ${user.id}`);

    // Fetch all medical documents (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const { data: documents, error: docsError } = await supabase
      .from('medical_documents')
      .select('*')
      .eq('user_id', user.id)
      .eq('ai_processed', true)
      .gte('document_date', twelveMonthsAgo.toISOString().split('T')[0])
      .order('document_date', { ascending: false });

    if (docsError) {
      throw new Error('Could not fetch documents');
    }

    // Fetch goals
    const { data: goals } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_personal', true);

    // Fetch recent measurements
    const { data: measurements } = await supabase
      .from('measurements')
      .select('*, goals(goal_name, target_value, target_unit)')
      .eq('user_id', user.id)
      .order('measurement_date', { ascending: false })
      .limit(20);

    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Build comprehensive context
    const context = {
      profile: {
        name: profile?.full_name || 'User',
        username: profile?.username
      },
      documents: documents?.map(doc => ({
        type: doc.document_type,
        date: doc.document_date,
        summary: doc.ai_summary,
        data: doc.ai_extracted_data
      })) || [],
      goals: goals?.map(g => ({
        name: g.goal_name,
        type: g.goal_type,
        target: g.target_value,
        unit: g.target_unit
      })) || [],
      recentMeasurements: measurements?.slice(0, 10).map(m => ({
        goal: m.goals?.goal_name,
        value: m.value,
        unit: m.unit,
        date: m.measurement_date
      })) || []
    };

    const prompt = `You are a professional health and fitness coach analyzing comprehensive health data. Based on the following information, provide personalized recommendations:

**User Profile:**
${JSON.stringify(context.profile, null, 2)}

**Recent Medical Documents (${context.documents.length}):**
${context.documents.map((doc, i) => `
${i + 1}. ${doc.type} (${doc.date})
   Summary: ${doc.summary || 'No summary'}
   Data: ${JSON.stringify(doc.data, null, 2)}
`).join('\n')}

**Active Goals (${context.goals.length}):**
${context.goals.map(g => `- ${g.name}: ${g.target} ${g.unit}`).join('\n')}

**Recent Measurements:**
${context.recentMeasurements.slice(0, 5).map(m => `- ${m.goal}: ${m.value} ${m.unit} (${m.date})`).join('\n')}

Please provide:

1. **Overall Health Assessment** (2-3 sentences)
   - Current state based on latest data
   - Key strengths and concerns

2. **Top 3 Priority Recommendations**
   - Specific, actionable advice
   - Based on actual data trends
   - Aligned with user goals

3. **Nutrition Suggestions** (if relevant data available)
   - Macro targets or adjustments
   - Specific foods/supplements

4. **Training Recommendations** (if relevant)
   - Focus areas based on body composition
   - Suggested workout types

5. **Lifestyle & Recovery**
   - Sleep, stress, hydration
   - Based on available metrics

6. **Next Steps**
   - What to measure/track next
   - When to reassess

Keep it concise, practical, and motivating. Use actual numbers from the data.`;

    await logger.info('Generating health recommendations', { userId: user.id });
    
    const aiClient = createAIClient(AIProvider.LOVABLE);
    const aiResponse = await aiClient.complete({
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const recommendations = aiResponse.content;

    if (!recommendations) {
      throw new EdgeFunctionError(
        ErrorCode.EXTERNAL_API_ERROR,
        'No recommendations generated'
      );
    }

    // Calculate health score (1-10) based on data completeness and quality
    let healthScore = 5; // Base score

    // +1 point for having recent documents
    if (documents && documents.length > 0) healthScore += 1;
    
    // +1 point for having goals
    if (goals && goals.length > 0) healthScore += 1;
    
    // +1 point for having recent measurements
    if (measurements && measurements.length > 0) healthScore += 1;
    
    // +2 points for having multiple document types (comprehensive data)
    if (documents && documents.length >= 3) healthScore += 2;

    // Cap at 10
    healthScore = Math.min(10, healthScore);

    // Determine date range
    const dateRange = documents && documents.length > 0 ? {
      from: documents[documents.length - 1].document_date,
      to: documents[0].document_date
    } : undefined;

    // Save to recommendations_history
    const { error: saveError } = await supabase
      .from('recommendations_history')
      .insert({
        user_id: user.id,
        recommendations_text: recommendations,
        context_snapshot: {
          documents_analyzed: documents?.length || 0,
          biomarkers_count: context.documents.reduce((count, doc: any) => 
            count + (doc.data?.result_count || 0), 0
          ),
          date_range: dateRange
        },
        health_score: healthScore
      } as any);

    if (saveError) {
      console.error('Error saving to recommendations_history:', saveError);
      // Don't fail the request if save fails, just log it
    }

    await logger.info('Recommendations generated successfully', { 
      provider: aiResponse.provider,
      documentsAnalyzed: context.documents.length,
      healthScore 
    });

    return new Response(
      JSON.stringify({
        success: true,
        recommendations,
        health_score: healthScore,
        context: {
          documentsAnalyzed: context.documents.length,
          goalsConsidered: context.goals.length,
          measurementsReviewed: context.recentMeasurements.length
        },
        generatedAt: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error in generate-health-recommendations:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});