import { createAuthClient, getAuthenticatedUser } from '../_shared/supabase-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CorrelationResult {
  success: boolean;
  correlation?: {
    score: number;
    interpretation: string;
    pValue: number;
  };
  aiInsights?: {
    is_effective: boolean;
    confidence_level: 'high' | 'medium' | 'low';
    key_insight: string;
    recommendation: string;
  };
  biomarker?: {
    changePercent: number;
    endValue: number;
    referenceRange: any;
  };
  avgConsistency?: number;
}

function calculateEffectivenessScore(correlationData: CorrelationResult): number {
  if (!correlationData.success || !correlationData.correlation || !correlationData.aiInsights) {
    return 0;
  }

  const { correlation, aiInsights, avgConsistency = 0, biomarker } = correlationData;
  
  // Base score from correlation (-1..1 → 0..10)
  let score = Math.round(((correlation.score + 1) / 2) * 10);
  
  // Adjust by AI confidence
  if (aiInsights.confidence_level === 'low') {
    score = Math.max(score - 2, 0);
  } else if (aiInsights.confidence_level === 'high') {
    score = Math.min(score + 1, 10);
  }
  
  // Boost if biomarker is in optimal range
  if (biomarker && biomarker.referenceRange) {
    const isInOptimal = biomarker.endValue >= biomarker.referenceRange.optimal_min &&
                        biomarker.endValue <= biomarker.referenceRange.optimal_max;
    if (isInOptimal && biomarker.changePercent > 0) {
      score = Math.min(score + 2, 10);
    }
  }
  
  // Penalize low adherence
  if (avgConsistency < 50) {
    score = Math.max(score - 2, 0);
  }
  
  return score;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    const user = await getAuthenticatedUser(authHeader);
    const supabase = createAuthClient(authHeader);

    console.log(`[EFFECTIVENESS] Starting calculation for user ${user.id}`);

    // Get all active supplements with linked biomarkers
    const { data: stackItems, error: stackError } = await supabase
      .from('user_stack')
      .select(`
        id,
        stack_name,
        linked_biomarker_ids,
        supplement_products (
          id,
          name,
          brand
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .not('linked_biomarker_ids', 'is', null);

    if (stackError) throw stackError;

    if (!stackItems || stackItems.length === 0) {
      console.log('[EFFECTIVENESS] No active supplements with linked biomarkers found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No supplements to analyze',
          updatedCount: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[EFFECTIVENESS] Analyzing ${stackItems.length} supplements`);

    const results = [];
    const THROTTLE_DELAY = 500; // 500ms between calls

    for (const item of stackItems) {
      try {
        console.log(`[EFFECTIVENESS] Processing: ${item.stack_name}`);

        // Call calculate-correlation for this supplement
        const { data: correlationData, error: corrError } = await supabase.functions.invoke(
          'calculate-correlation',
          {
            body: { 
              stackItemId: item.id,
              timeframeMonths: 6 
            }
          }
        );

        if (corrError) {
          console.error(`[EFFECTIVENESS] Correlation error for ${item.stack_name}:`, corrError);
          results.push({ 
            stackItemId: item.id, 
            name: item.stack_name,
            success: false, 
            error: corrError.message 
          });
          continue;
        }

        if (!correlationData || !correlationData.success) {
          console.log(`[EFFECTIVENESS] Insufficient data for ${item.stack_name}`);
          results.push({ 
            stackItemId: item.id, 
            name: item.stack_name,
            success: false, 
            error: 'Insufficient data' 
          });
          continue;
        }

        // Calculate effectiveness score
        const effectivenessScore = calculateEffectivenessScore(correlationData);

        console.log(`[EFFECTIVENESS] ${item.stack_name} score: ${effectivenessScore}/10`);

        // Update user_stack with new score
        const { error: updateError } = await supabase
          .from('user_stack')
          .update({ 
            effectiveness_score: effectivenessScore,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id);

        if (updateError) throw updateError;

        // Record in stack_effectiveness history
        const { error: historyError } = await supabase
          .from('stack_effectiveness')
          .insert({
            user_id: user.id,
            stack_item_id: item.id,
            biomarker_id: correlationData.biomarker?.id,
            correlation_score: correlationData.correlation?.score || 0,
            effectiveness_score: effectivenessScore,
            intake_consistency: correlationData.avgConsistency || 0,
            ai_confidence: correlationData.aiInsights?.confidence_level || 'low',
            analyzed_period_days: 180, // 6 months
            metadata: {
              correlation: correlationData.correlation,
              aiInsights: correlationData.aiInsights,
              biomarkerChange: correlationData.biomarker?.changePercent
            }
          });

        if (historyError) {
          console.error('[EFFECTIVENESS] History insert error:', historyError);
        }

        results.push({
          stackItemId: item.id,
          name: item.stack_name,
          success: true,
          effectivenessScore,
          correlationScore: correlationData.correlation?.score,
          confidence: correlationData.aiInsights?.confidence_level
        });

        // Throttle to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, THROTTLE_DELAY));

      } catch (error) {
        console.error(`[EFFECTIVENESS] Error processing ${item.stack_name}:`, error);
        results.push({ 
          stackItemId: item.id, 
          name: item.stack_name,
          success: false, 
          error: error.message 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`[EFFECTIVENESS] Complete: ${successCount}/${stackItems.length} successful`);

    return new Response(
      JSON.stringify({
        success: true,
        updatedCount: successCount,
        totalItems: stackItems.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[EFFECTIVENESS] Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
