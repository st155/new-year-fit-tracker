import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createServiceClient, getAuthenticatedUser } from '../_shared/supabase-client.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createAIClient, AIProvider } from '../_shared/ai-client.ts';

interface GenerateProtocolRequest {
  user_id?: string;
  goals: string[];
  health_conditions?: string[];
  dietary_restrictions?: string[];
  existing_supplements?: string[];
  protocol_duration_days?: number;
  auto_create?: boolean;
}

interface Recommendation {
  supplement_name: string;
  brand_recommendation: string;
  category: string;
  dosage: string;
  frequency: string;
  timing: string[];
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
  estimated_cost_per_month: number;
  warnings: string[];
}

interface ProtocolResponse {
  protocol_name: string;
  description: string;
  duration_days: number;
  recommendations: Recommendation[];
  total_estimated_cost: number;
  key_considerations: string[];
  review_schedule: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization header' }, 401);
    }

    const user = await getAuthenticatedUser(authHeader);
    const supabase = createServiceClient();

    const body: GenerateProtocolRequest = await req.json();
    const {
      user_id = user.id,
      goals,
      health_conditions = [],
      dietary_restrictions = [],
      existing_supplements = [],
      protocol_duration_days = 30,
      auto_create = false
    } = body;

    if (!goals || goals.length === 0) {
      return jsonResponse({ error: 'Goals are required' }, 400);
    }

    console.log(`[generate-supplement-protocol] Generating protocol for user ${user_id}`);

    // Step 1: Gather user context
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('user_id', user_id)
      .single();

    const { data: metrics } = await supabase
      .from('unified_metrics')
      .select('metric_name, value, unit, measurement_date')
      .eq('user_id', user_id)
      .in('metric_name', ['Weight', 'Recovery Score', 'Sleep Duration', 'VO2 Max', 'Body Fat Percentage'])
      .gte('measurement_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('measurement_date', { ascending: false })
      .limit(20);

    const { data: userGoals } = await supabase
      .from('goals')
      .select('goal_name, goal_type, target_value, target_unit')
      .eq('user_id', user_id)
      .eq('is_personal', true);

    const { data: medicalDocs } = await supabase
      .from('medical_documents')
      .select('document_type, ai_summary, ai_extracted_data')
      .eq('user_id', user_id)
      .eq('ai_processed', true)
      .order('document_date', { ascending: false })
      .limit(3);

    // Step 2: Construct AI prompt
    const systemPrompt = `You are an expert nutritionist and supplement specialist. 
Based on user's health data, goals, and conditions, recommend a personalized supplement protocol.

**IMPORTANT RULES:**
1. Only recommend evidence-based supplements
2. Consider potential interactions and contraindications
3. Provide specific dosages and timing
4. Explain WHY each supplement is recommended
5. Warn about any potential side effects or interactions
6. Keep recommendations practical and affordable

Response must be ONLY valid JSON (no markdown, no comments) in this exact format:
{
  "protocol_name": "30-Day Recovery & Performance Protocol",
  "description": "Brief overview of the protocol",
  "duration_days": 30,
  "recommendations": [
    {
      "supplement_name": "Vitamin D3",
      "brand_recommendation": "Any quality brand with 2000 IU",
      "category": "vitamin",
      "dosage": "2000 IU",
      "frequency": "once_daily",
      "timing": ["morning"],
      "reasoning": "Your latest data shows low vitamin D levels which affects recovery",
      "priority": "high",
      "estimated_cost_per_month": 15,
      "warnings": ["Take with fat-containing meal for better absorption"]
    }
  ],
  "total_estimated_cost": 120,
  "key_considerations": ["Start with lower doses", "Monitor for side effects"],
  "review_schedule": "Check progress in 2 weeks"
}`;

    const metricsText = metrics?.map(m => `- ${m.metric_name}: ${m.value} ${m.unit} (${new Date(m.measurement_date).toLocaleDateString()})`).join('\n') || 'No recent metrics available';
    const goalsText = userGoals?.map(g => `- ${g.goal_name} (${g.goal_type}): ${g.target_value} ${g.target_unit}`).join('\n') || 'No active goals';
    const medicalText = medicalDocs?.map(d => `- ${d.document_type}: ${d.ai_summary}`).join('\n') || 'No medical history available';

    const userPrompt = `**User Profile:**
- Name: ${profile?.full_name || 'Unknown'}
- Goals: ${goals.join(', ')}
- Health Conditions: ${health_conditions.length > 0 ? health_conditions.join(', ') : 'None reported'}
- Dietary Restrictions: ${dietary_restrictions.length > 0 ? dietary_restrictions.join(', ') : 'None'}

**Recent Metrics (last 30 days):**
${metricsText}

**Active Goals:**
${goalsText}

**Medical History:**
${medicalText}

**Current Supplements:**
${existing_supplements.length > 0 ? 'User already takes: ' + existing_supplements.join(', ') : 'None'}

**Protocol Duration:** ${protocol_duration_days} days

Generate a personalized supplement protocol. Return ONLY the JSON response, no additional text.`;

    console.log('[generate-supplement-protocol] Calling AI...');

    // Step 3: Call AI
    const aiClient = createAIClient(AIProvider.LOVABLE);
    const aiResponse = await aiClient.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 3000
    });

    console.log('[generate-supplement-protocol] AI response received');

    // Step 4: Parse and validate response
    let protocol: ProtocolResponse;
    try {
      // Remove markdown code blocks if present
      let content = aiResponse.content.trim();
      if (content.startsWith('```json')) {
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (content.startsWith('```')) {
        content = content.replace(/```\n?/g, '');
      }
      
      protocol = JSON.parse(content);
    } catch (parseError) {
      console.error('[generate-supplement-protocol] Parse error:', parseError);
      console.error('[generate-supplement-protocol] AI response:', aiResponse.content);
      return jsonResponse({
        error: 'Failed to parse AI response',
        details: parseError instanceof Error ? parseError.message : 'Unknown error'
      }, 500);
    }

    // Validate structure
    if (!protocol.recommendations || !Array.isArray(protocol.recommendations)) {
      return jsonResponse({ error: 'Invalid AI response format: missing recommendations' }, 500);
    }

    // Step 5: Optionally create protocol in database
    let protocol_id: string | undefined;
    if (auto_create) {
      console.log('[generate-supplement-protocol] Creating protocol in database');

      const { data: newProtocol, error: protocolError } = await supabase
        .from('protocols')
        .insert({
          user_id,
          name: protocol.protocol_name,
          description: protocol.description,
          duration_days: protocol.duration_days,
          is_active: false
        })
        .select()
        .single();

      if (protocolError) {
        console.error('[generate-supplement-protocol] Protocol creation error:', protocolError);
      } else {
        protocol_id = newProtocol.id;

        // Create protocol items
        for (const rec of protocol.recommendations) {
          // Try to find existing product
          let { data: product } = await supabase
            .from('supplement_products')
            .select('id')
            .ilike('name', `%${rec.supplement_name}%`)
            .limit(1)
            .maybeSingle();

          // Create placeholder if not found
          if (!product) {
            const { data: newProduct } = await supabase
              .from('supplement_products')
              .insert({
                name: rec.supplement_name,
                category: rec.category,
                brand: rec.brand_recommendation || 'Generic',
                type: 'supplement',
                serving_size: 1,
                serving_unit: 'capsule',
                recommended_dosage: rec.dosage,
                is_placeholder: true
              })
              .select()
              .single();

            product = newProduct;
          }

          if (product) {
            await supabase
              .from('protocol_items')
              .insert({
                protocol_id: newProtocol.id,
                product_id: product.id,
                servings_per_intake: 1,
                intake_times: rec.timing,
                notes: rec.reasoning,
                priority: rec.priority
              });
          }
        }

        console.log('[generate-supplement-protocol] Protocol created successfully');
      }
    }

    return jsonResponse({
      protocol,
      protocol_id,
      created: !!protocol_id
    });

  } catch (error) {
    console.error('[generate-supplement-protocol] Error:', error);
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});
