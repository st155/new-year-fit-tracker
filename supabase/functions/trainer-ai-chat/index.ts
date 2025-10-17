import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      conversationId, 
      message, 
      contextMode = 'general',
      mentionedClients = []
    } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    console.log('AI Chat request:', { conversationId, contextMode, mentionedClients });

    // Get or create conversation
    let conversation;
    if (conversationId) {
      const { data } = await supabaseClient
        .from('ai_conversations')
        .select('*')
        .eq('id', conversationId)
        .single();
      conversation = data;
    } else {
      const { data, error } = await supabaseClient
        .from('ai_conversations')
        .insert({
          trainer_id: user.id,
          context_mode: contextMode,
          title: 'New Conversation'
        })
        .select()
        .single();
      
      if (error) throw error;
      conversation = data;
    }

    // Get conversation history
    const { data: messages } = await supabaseClient
      .from('ai_messages')
      .select('role, content')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
      .limit(20);

    // Build context based on mode and mentioned clients
    let contextData = '';
    
    if (mentionedClients.length > 0) {
      for (const clientId of mentionedClients) {
        // Get client info
        const { data: clientProfile } = await supabaseClient
          .from('profiles')
          .select('username, full_name')
          .eq('user_id', clientId)
          .single();

        // Get client goals
        const { data: clientGoals } = await supabaseClient
          .from('goals')
          .select('*, measurements(value, measurement_date)')
          .eq('user_id', clientId)
          .order('created_at', { ascending: false });

        // Get recent metrics
        const { data: recentMetrics } = await supabaseClient
          .from('metric_values')
          .select('*, user_metrics(metric_name, unit)')
          .eq('user_id', clientId)
          .gte('measurement_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('measurement_date', { ascending: false })
          .limit(50);

        contextData += `\n\n=== Client: ${clientProfile?.username || clientProfile?.full_name} ===\n`;
        contextData += `Goals: ${JSON.stringify(clientGoals, null, 2)}\n`;
        contextData += `Recent Metrics (last 7 days): ${JSON.stringify(recentMetrics, null, 2)}\n`;
      }
    }

    // Add mode-specific context
    if (contextMode === 'goals' || contextMode === 'analysis') {
      const { data: allClients } = await supabaseClient
        .from('trainer_clients')
        .select('client_id, profiles(username, full_name)')
        .eq('trainer_id', user.id)
        .eq('active', true);
      
      contextData += `\n\n=== All Your Clients ===\n${JSON.stringify(allClients, null, 2)}\n`;
    }

    // Build system prompt
    let systemPrompt = `You are a professional fitness trainer AI assistant. You help trainers manage their clients, analyze progress, and create effective training plans.

Current mode: ${contextMode}
${contextMode === 'goals' ? '- Focus on goal setting and progress tracking\n- Suggest specific, measurable goals' : ''}
${contextMode === 'analysis' ? '- Analyze client data and provide insights\n- Identify patterns and potential issues' : ''}
${contextMode === 'challenge' ? '- Help manage challenges and competitions\n- Suggest engagement strategies' : ''}

Context data:${contextData}

IMPORTANT INSTRUCTIONS:
1. When the trainer wants to make changes (update goals, add measurements, create tasks), respond in PLAN MODE:
   - Clearly explain what you'll do
   - List specific actions with data
   - End with "Ready to implement this plan?"
   
2. For analysis and discussion, respond normally with insights and suggestions.

3. Use @username format when referring to specific clients.

4. Be concise but thorough. Focus on actionable advice.`;

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...(messages || []),
      { role: 'user', content: message }
    ];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: aiMessages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const assistantMessage = aiResponse.choices[0].message.content;

    console.log('AI response generated');

    // Save messages to database
    await supabaseClient.from('ai_messages').insert([
      {
        conversation_id: conversation.id,
        role: 'user',
        content: message,
        metadata: { mentioned_clients: mentionedClients }
      },
      {
        conversation_id: conversation.id,
        role: 'assistant',
        content: assistantMessage
      }
    ]);

    // Check if this is a plan that needs actions
    const isPlan = assistantMessage.toLowerCase().includes('ready to implement') ||
                   assistantMessage.toLowerCase().includes('план действий') ||
                   assistantMessage.toLowerCase().includes('action plan');

    // Parse potential actions from the plan
    let suggestedActions = [];
    if (isPlan) {
      // Extract structured actions from the response
      // This is a simplified version - you might want more sophisticated parsing
      const actionPattern = /- (добавить|обновить|создать|изменить)[^-]*/gi;
      const matches = assistantMessage.match(actionPattern);
      
      if (matches) {
        suggestedActions = matches.map((action, index) => ({
          action_type: 'suggested',
          description: action.trim(),
          order: index
        }));
      }
    }

    // Update conversation title if it's the first message
    if (!conversationId && messages?.length === 0) {
      const titlePrompt = `Generate a short title (max 5 words) for this conversation: "${message}"`;
      const titleResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: titlePrompt }],
        }),
      });

      if (titleResponse.ok) {
        const titleData = await titleResponse.json();
        const title = titleData.choices[0].message.content.replace(/['"]/g, '').trim();
        
        await supabaseClient
          .from('ai_conversations')
          .update({ title })
          .eq('id', conversation.id);
      }
    }

    return new Response(
      JSON.stringify({
        conversationId: conversation.id,
        message: assistantMessage,
        isPlan,
        suggestedActions
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in trainer-ai-chat:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
