// Trainer AI Chat Assistant - Edge Function
// Migrated to Lovable AI Gateway (Gemini 2.5 Flash)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from '../_shared/cors.ts';
import { createAIClient, AIProvider } from '../_shared/ai-client.ts';
import { Logger } from '../_shared/monitoring.ts';

// Auto-detect context mode from message content
function detectContextMode(message: string, hasClients: boolean): string {
  const lowerMsg = message.toLowerCase();
  
  // Goal-related keywords
  const goalKeywords = ['цель', 'goal', 'прогресс', 'progress', 'вес', 'weight', 
    'достиж', 'achiev', 'target', 'целевой', 'измерен', 'measurement'];
  
  // Analysis keywords
  const analysisKeywords = ['анализ', 'analysis', 'статистик', 'statistic', 
    'динамик', 'trend', 'сравн', 'compare', 'оцен', 'assess', 'результат', 'result'];
  
  // Challenge keywords
  const challengeKeywords = ['челлендж', 'challenge', 'соревнован', 'competition', 
    'лидер', 'leader', 'участник', 'participant'];
  
  // Count keyword matches
  const goalScore = goalKeywords.filter(k => lowerMsg.includes(k)).length;
  const analysisScore = analysisKeywords.filter(k => lowerMsg.includes(k)).length;
  const challengeScore = challengeKeywords.filter(k => lowerMsg.includes(k)).length;
  
  // Determine mode based on highest score
  if (challengeScore > 0 && challengeScore >= goalScore && challengeScore >= analysisScore) {
    return 'challenge';
  }
  if (analysisScore > 0 && analysisScore >= goalScore) {
    return 'analysis';
  }
  if (goalScore > 0 || hasClients) {
    return 'goals';
  }
  
  return 'general';
}

// Intent detection function
function detectUserIntent(message: string): { 
  isConfirmation: boolean;
  isRejection: boolean;
  isQuestion: boolean;
} {
  const lowerMsg = message.toLowerCase().trim();
  
  // Confirmation patterns
  const confirmPatterns = [
    'да', 'yes', 'confirm', 'подтверждаю', 'давай', 'согласен',
    'ок', 'okay', 'выполни', 'делай', 'сделай', 'создай',
    'правильно', 'верно', 'точно', 'именно', '+', '✓', '✅'
  ];
  
  // Rejection patterns
  const rejectPatterns = [
    'нет', 'no', 'отмена', 'cancel', 'не надо', 'подожди',
    'не правильно', 'не верно', 'ошибка', 'неправильно'
  ];
  
  // Question patterns
  const questionPatterns = ['?', 'почему', 'зачем', 'как', 'что', 'когда', 'где'];
  
  const isConfirmation = confirmPatterns.some(p => lowerMsg.includes(p));
  const isRejection = rejectPatterns.some(p => lowerMsg.includes(p));
  const isQuestion = questionPatterns.some(p => lowerMsg.includes(p));
  
  return { isConfirmation, isRejection, isQuestion };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const logger = new Logger('trainer-ai-chat');

  try {
    const { 
      conversationId, 
      message, 
      contextMode, // Optional - AI will auto-detect if not provided
      mentionedClients = [],
      mentionedNames = [], // Raw names mentioned (for fuzzy matching)
      contextClientId, // Client selected in UI context
      autoExecute = true // Auto-execute simple actions by default
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

    console.log('AI Chat request:', { conversationId, contextMode, mentionedClients, contextClientId });

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

    // Detect user intent BEFORE AI call
    const userIntent = detectUserIntent(message);
    console.log('🎯 User intent detected:', userIntent);

    // Get conversation history (increased limit for better context)
    const { data: messages } = await supabaseClient
      .from('ai_messages')
      .select('role, content')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
      .limit(50);

    // Check if previous AI message was asking for confirmation
    const lastAIMessage = messages && messages.length > 0 
      ? messages[messages.length - 1] 
      : null;

    const wasAskingForConfirmation = lastAIMessage 
      && lastAIMessage.role === 'assistant'
      && (
        lastAIMessage.content.toLowerCase().includes('please confirm') ||
        lastAIMessage.content.toLowerCase().includes('подтверди') ||
        lastAIMessage.content.toLowerCase().includes('уточните') ||
        lastAIMessage.content.toLowerCase().includes('ready to implement') ||
        lastAIMessage.content.includes('?')
      );

    // EAGER MODE: If user confirmed and AI was waiting - force plan creation
    const eagerMode = userIntent.isConfirmation && wasAskingForConfirmation;

    if (eagerMode) {
      console.log('🚀 EAGER MODE ACTIVATED: User confirmed, forcing plan creation');
    }

    // Build context based on mode and mentioned clients
    let contextData = '';
    let disambiguationNeeded = [];
    
    // Load ALL active clients for AI context
    const { data: allTrainerClients } = await supabaseClient
      .from('trainer_clients')
      .select(`
        client_id,
        profiles!trainer_clients_client_id_fkey (
          user_id,
          username,
          full_name
        )
      `)
      .eq('trainer_id', user.id)
      .eq('active', true)
      .limit(20);

    if (allTrainerClients && allTrainerClients.length > 0) {
      contextData += '\n\n📋 YOUR ACTIVE CLIENTS (use these names ONLY):\n';
      for (const tc of allTrainerClients) {
        const profile = tc.profiles as any;
        if (profile) {
          contextData += `- ${profile.full_name} (@${profile.username}) [ID: ${profile.user_id}]\n`;
        }
      }
      contextData += '\n⚠️ CRITICAL: Only use these exact client names in your responses. Never invent fake names like @coach_*, @john_*, @sarah_*.\n';
    }
    
    // PRIORITY: Load context client first if specified
    if (contextClientId) {
      const { data: contextClientProfile } = await supabaseClient
        .from('profiles')
        .select('user_id, username, full_name')
        .eq('user_id', contextClientId)
        .single();
      
      if (contextClientProfile) {
        contextData += `\n\n=== 🎯 SELECTED CLIENT IN CURRENT CONTEXT ===\n`;
        contextData += `**CLIENT_ID (use this in tool calls): "${contextClientProfile.user_id}"**\n`;
        contextData += `Name: ${contextClientProfile.full_name} (@${contextClientProfile.username})\n`;
        
        // Load client's recent goals with measurements
        const { data: clientGoals } = await supabaseClient
          .from('goals')
          .select(`
            id,
            goal_name,
            goal_type,
            target_value,
            target_unit,
            is_personal,
            created_at,
            measurements (
              value,
              unit,
              measurement_date
            )
          `)
          .eq('user_id', contextClientId)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (clientGoals && clientGoals.length > 0) {
          contextData += `\nRecent Goals:\n`;
          clientGoals.forEach(goal => {
            const measurements = (goal as any).measurements || [];
            const latestMeasurement = measurements.sort((a: any, b: any) => 
              new Date(b.measurement_date).getTime() - new Date(a.measurement_date).getTime()
            )[0];
            
            contextData += `- ${goal.goal_name} (${goal.goal_type}): Target ${goal.target_value} ${goal.target_unit}`;
            if (latestMeasurement) {
              contextData += ` | Current: ${latestMeasurement.value} ${latestMeasurement.unit} (${latestMeasurement.measurement_date})`;
            } else {
              contextData += ` | Current: No measurements yet`;
            }
            contextData += `\n`;
          });
        }
        
        // Load recent metrics
        const { data: recentMetrics } = await supabaseClient
          .from('unified_metrics')
          .select('*')
          .eq('user_id', contextClientId)
          .order('measurement_date', { ascending: false })
          .limit(20);
        
        if (recentMetrics && recentMetrics.length > 0) {
          contextData += `\nRecent Metrics (last 20):\n`;
          recentMetrics.forEach(metric => {
            contextData += `- ${metric.metric_name}: ${metric.value} ${metric.unit} (${metric.measurement_date}, source: ${metric.source})\n`;
          });
        }
      }
    }
    
    // Handle fuzzy matching for mentioned names
    if (mentionedNames.length > 0) {
      console.log('Fuzzy matching for names:', mentionedNames);
      
      for (const mentionedName of mentionedNames) {
        // Check for exact alias match first
        const { data: aliasMatch } = await supabaseClient
          .from('client_aliases')
          .select('client_id, alias_name, profiles!client_aliases_client_id_fkey(user_id, username, full_name, avatar_url)')
          .eq('trainer_id', user.id)
          .ilike('alias_name', mentionedName)
          .single();
        
        if (aliasMatch) {
          // Found exact alias match - use it
          console.log(`Alias match found for "${mentionedName}":`, aliasMatch);
          mentionedClients.push(aliasMatch.client_id);
          
          // Note: used_count increment removed to prevent edge function crashes
          // TODO: Implement safe counter increment via RPC or trigger
        } else {
          // No exact match - perform fuzzy search
          const { data: candidates } = await supabaseClient
            .from('trainer_clients')
            .select(`
              client_id,
              profiles!trainer_clients_client_id_fkey (
                user_id,
                username,
                full_name,
                avatar_url
              )
            `)
            .eq('trainer_id', user.id)
            .eq('active', true);
          
          if (candidates && candidates.length > 0) {
            // Simple fuzzy matching: check if mentioned name is contained in full_name or username
            const nameToMatch = mentionedName.toLowerCase();
            const matches = candidates
              .filter(c => {
                const profile = c.profiles as any;
                if (!profile) return false;
                const fullName = profile.full_name?.toLowerCase() || '';
                const username = profile.username?.toLowerCase() || '';
                return fullName.includes(nameToMatch) || 
                       nameToMatch.includes(fullName) ||
                       username.includes(nameToMatch) ||
                       nameToMatch.includes(username);
              })
              .slice(0, 3); // Top 3 candidates
            
            if (matches.length === 1) {
              // Single match - use it automatically
              const profile = matches[0].profiles as any;
              console.log(`Auto-matched "${mentionedName}" to ${profile.full_name}`);
              mentionedClients.push(profile.user_id);
            } else if (matches.length > 1) {
              // Multiple matches - need disambiguation
              console.log(`Multiple matches for "${mentionedName}":`, matches.length);
              disambiguationNeeded.push({
                mentionedName,
                candidates: matches.map(m => {
                  const p = m.profiles as any;
                  return {
                    user_id: p.user_id,
                    username: p.username,
                    full_name: p.full_name,
                    avatar_url: p.avatar_url
                  };
                })
              });
            } else {
              console.warn(`No matches found for "${mentionedName}"`);
            }
          }
        }
      }
    }
    
    // Return early if disambiguation needed
    if (disambiguationNeeded.length > 0) {
      return new Response(
        JSON.stringify({
          needsDisambiguation: true,
          disambiguations: disambiguationNeeded,
          message: 'Пожалуйста, уточните, кого вы имели в виду'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Filter out contextClientId from mentionedClients to avoid duplication
    const additionalClients = contextClientId 
      ? mentionedClients.filter(id => id !== contextClientId)
      : mentionedClients;
    
    if (additionalClients.length > 0) {
      console.log('Loading context for additional mentioned clients:', additionalClients);
      
      for (const clientId of additionalClients) {
        // Get client profile with details
        const { data: clientProfile } = await supabaseClient
          .from('profiles')
          .select('user_id, username, full_name')
          .eq('user_id', clientId)
          .single();

        if (!clientProfile) {
          console.warn(`Client ${clientId} not found`);
          continue;
        }

        contextData += `\n\n=== Client: ${clientProfile.full_name} (@${clientProfile.username}) ===\n`;
        contextData += `**CLIENT_ID (use this in tool calls): "${clientProfile.user_id}"**\n`;
        
        // Get all client goals with recent measurements
        const { data: clientGoals } = await supabaseClient
          .from('goals')
          .select(`
            id,
            goal_name,
            goal_type,
            target_value,
            target_unit,
            is_personal,
            created_at,
            measurements (
              value,
              unit,
              measurement_date
            )
          `)
          .eq('user_id', clientId)
          .order('created_at', { ascending: false });

        contextData += `\nCurrent Goals:\n`;
        if (clientGoals && clientGoals.length > 0) {
          for (const goal of clientGoals) {
            const measurements = (goal as any).measurements || [];
            const latestMeasurement = measurements.sort((a: any, b: any) => 
              new Date(b.measurement_date).getTime() - new Date(a.measurement_date).getTime()
            )[0];
            
            contextData += `- ${goal.goal_name} (${goal.goal_type}): Target ${goal.target_value} ${goal.target_unit}`;
            if (latestMeasurement) {
              contextData += ` | Current: ${latestMeasurement.value} ${latestMeasurement.unit} (${latestMeasurement.measurement_date})`;
            } else {
              contextData += ` | Current: No measurements yet`;
            }
            contextData += `\n`;
          }
        } else {
          contextData += `No goals set yet.\n`;
        }
        
        // Get recent unified metrics for this client
        const { data: recentMetrics } = await supabaseClient
          .from('unified_metrics')
          .select('*')
          .eq('user_id', clientId)
          .order('measurement_date', { ascending: false })
          .limit(20);
        
        if (recentMetrics && recentMetrics.length > 0) {
          contextData += `\nRecent Metrics (last 20):\n`;
          recentMetrics.forEach(metric => {
            contextData += `- ${metric.metric_name}: ${metric.value} ${metric.unit} (${metric.measurement_date}, source: ${metric.source})\n`;
          });
        }
    }
  }

  // Helper function to extract real client names from context
  const extractClientNamesFromContext = (context: string): string => {
    const clientPattern = /=== Client: (.+?) \(@(\S+)\) ===/g;
    const matches = [];
    let match;
    
    while ((match = clientPattern.exec(context)) !== null) {
      matches.push(`${match[1]} (@${match[2]})`);
    }
    
    return matches.length > 0 
      ? matches.join(', ') 
      : 'No clients found in context';
  };

  // Add mode-specific context
  if (contextMode === 'goals' || contextMode === 'analysis') {
      const { data: allClients } = await supabaseClient
        .from('trainer_clients')
        .select('client_id, profiles(username, full_name)')
        .eq('trainer_id', user.id)
        .eq('active', true);
      
      contextData += `\n\n=== All Your Clients ===\n${JSON.stringify(allClients, null, 2)}\n`;
    }

    // Auto-detect context mode if not provided
    const detectedMode = contextMode || detectContextMode(
      message, 
      mentionedClients.length > 0 || !!contextClientId
    );

    console.log(`Context mode: ${detectedMode} (${contextMode ? 'explicit' : 'auto-detected'})`);

    // Build system prompt
    let systemPrompt = `You are a professional fitness trainer AI assistant. You help trainers manage their clients, analyze progress, and create effective training plans.

Current mode: ${detectedMode}
${detectedMode === 'goals' ? '- Focus on goal setting and progress tracking\n- Suggest specific, measurable goals' : ''}
${detectedMode === 'analysis' ? '- Analyze client data and provide insights\n- Identify patterns and potential issues' : ''}
${detectedMode === 'challenge' ? '- Help manage challenges and competitions\n- Suggest engagement strategies' : ''}

Context data:${contextData}

IMPORTANT INSTRUCTIONS:
1. When the trainer wants to make changes (update goals, add measurements, create tasks), respond in PLAN MODE:
   - Clearly explain what you'll do
   - List specific actions with data
   - End with "Ready to implement this plan?"
   
2. For analysis and discussion, respond normally with insights and suggestions.

3. Use @username format when referring to specific clients.

4. Be concise but thorough. Focus on actionable advice.

5. CRITICAL: When using tools (create_client_goals, add_measurements, update_goal), ALWAYS use the CLIENT_ID UUID from the context, never use client names or usernames.

6. CRITICAL CLIENT NAMES RULE:
   - When mentioning clients in your responses, ALWAYS use EXACT names from the context data
   - NEVER invent fake usernames like @coach_alisa, @john_doe, @sarah_connor, @trainer_*, @client_*, @alice_*, @bob_*
   - Only use real client names provided in the context: ${contextData ? extractClientNamesFromContext(contextData) : 'no clients loaded'}
   - If no specific client is in context, ask the trainer to specify which client they're referring to
   - Example GOOD: "Updating goal for @pavel_radaev (Pavel Radaev)" (using actual client from context)
   - Example BAD: "Updating goal for @john_doe" (fake username not in context)

7. SMART AUTO-EXECUTION RULES:
   - Simple, safe actions (create goal, add note, record measurement) → Execute immediately
   - Potentially dangerous actions (delete, mass update, challenge management) → Always ask for confirmation
   - When in doubt → Ask for confirmation
   - Structure response to clearly indicate if confirmation needed:
     * If auto-executable: End with "Executing now..." and use tools immediately
     * If needs confirmation: End with "Ready to implement? (yes/no)" and wait for user response
   
8. PLAN CREATION:
   - When user requests changes, create a clear plan with numbered steps
   - Use tools to execute the plan (don't just describe what to do)
   - If auto-executable, execute immediately and report results
   - If confirmation needed, present plan and wait for "yes"/"да" response

9. If there is a "🎯 SELECTED CLIENT IN CURRENT CONTEXT", assume all actions relate to this client unless explicitly stated otherwise.

10. When trainer says "update goal" or "change goal", use the update_goal tool if the goal already exists. Check the context data for existing goals before deciding to create or update.

11. Creating Training Plans - BEST PRACTICES:
   
   a) Structure requirements:
      - ALWAYS include complete exercise details: exercise_name, sets, reps, rest_seconds
      - Use realistic rep ranges: "8-12" for hypertrophy, "3-5" for strength, "12-15+" for endurance
      - Set appropriate rest: 60-90s accessory, 90-120s compounds, 180s for heavy strength
   
   b) Exercise selection (use Russian names):
      ГРУДЬ: Жим штанги лежа, Жим гантелей на наклонной, Разводка гантелей, Отжимания на брусьях
      СПИНА: Подтягивания, Тяга штанги в наклоне, Тяга верхнего блока, Тяга гантели в наклоне
      НОГИ: Приседания со штангой, Румынская тяга, Жим ногами, Выпады, Икры стоя
      ПЛЕЧИ: Жим штанги стоя, Махи гантелями в стороны, Махи в наклоне, Протяжка штанги
      РУКИ: Подъем штанги на бицепс, Молотки, Французский жим, Разгибания на блоке
   
   c) Example structure (respond with this format):
   {
     "client_id": "uuid",
     "plan_name": "Тренировка ног",
     "description": "4-недельный план для Сергея",
     "duration_weeks": 4,
     "workouts": [
       {
         "day_of_week": 0,
         "workout_name": "Ноги (квадрицепсы и ягодицы)",
         "description": "Фокус на базовых упражнениях",
         "exercises": [
           {
             "exercise_name": "Приседания со штангой",
             "sets": 4,
             "reps": "8-12",
             "rest_seconds": 120,
             "notes": "Глубокие приседания"
           },
           {
             "exercise_name": "Жим ногами",
             "sets": 3,
             "reps": "10-15",
             "rest_seconds": 90
           },
           {
             "exercise_name": "Румынская тяга",
             "sets": 3,
             "reps": "10-12",
             "rest_seconds": 90,
             "notes": "Акцент на ягодицы"
           }
         ]
       }
     ]
   }
   
   d) IMPORTANT: If user confirms ("да", "давай", "ок") - call create_training_plan tool IMMEDIATELY

12. CRITICAL: Plan Creation Rules:
   - If user confirms with words like "да", "confirm", "давай", "ок" - IMMEDIATELY create a structured plan with tool calls
   - If you detect confirmation intent - DO NOT ask more questions, CREATE THE PLAN NOW
   - User confirmation = instant action plan with function calls
   - After user says "да/yes/confirm" - your NEXT response MUST contain tool calls`;

    // Add eager mode instruction
    if (eagerMode) {
      systemPrompt += `\n\n🚨 URGENT: User just confirmed your proposal. CREATE STRUCTURED PLAN NOW with function calls. DO NOT ask more questions. Use the tools immediately.`;
    }

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...(messages || []),
      { role: 'user', content: message }
    ];

    console.log(`Sending ${aiMessages.length} messages to AI (history: ${messages?.length || 0})`);

    // Create optimistic pending action in eager mode
    let optimisticPendingAction = null;
    if (eagerMode) {
      console.log('🎯 Creating optimistic pending action...');
      
      const { data: pendingAction } = await supabaseClient
        .from('ai_pending_actions')
        .insert({
          conversation_id: conversation.id,
          trainer_id: user.id,
          action_type: 'plan_execution',
          action_plan: 'Preparing plan...',
          action_data: [],
          status: 'preparing'
        })
        .select()
        .single();
      
      optimisticPendingAction = pendingAction;
      
      // Send system message with pending action ID
      await supabaseClient.from('ai_messages').insert({
        conversation_id: conversation.id,
        role: 'system',
        content: '⏳ Готовлю структурированный план...',
        metadata: {
          isPlan: true,
          pendingActionId: pendingAction?.id,
          status: 'preparing'
        }
      });
      
      // Set timeout to mark as failed if not updated in 30 seconds
      setTimeout(async () => {
        const { data: stillPreparing } = await supabaseClient
          .from('ai_pending_actions')
          .select('status')
          .eq('id', optimisticPendingAction.id)
          .single();
        
        if (stillPreparing?.status === 'preparing') {
          console.warn('⚠️ Pending action timeout, marking as rejected');
          await supabaseClient
            .from('ai_pending_actions')
            .update({ status: 'rejected' })
            .eq('id', optimisticPendingAction.id);
        }
      }, 30000);
    }

    // Define tools for structured action extraction
    const tools = [
      {
        type: "function",
        function: {
          name: "create_client_goals",
          description: "Create multiple goals for a client with specific targets",
          parameters: {
            type: "object",
            properties: {
              client_id: { 
                type: "string",
                description: "UUID of the client (use the CLIENT_ID value from context, NOT the client name)"
              },
              goals: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    goal_name: { type: "string", description: "Name of the goal (e.g., 'Гребля 2 км')" },
                    goal_type: { type: "string", description: "Type of goal (e.g., 'rowing_2000m', 'running_1000m', 'pullups', 'bench_press')" },
                    target_value: { type: "number", description: "Target value to achieve" },
                    target_unit: { type: "string", description: "Unit of measurement (e.g., 'minutes', 'reps', 'kg', '%')" }
                  },
                  required: ["goal_name", "goal_type", "target_value", "target_unit"]
                }
              }
            },
            required: ["client_id", "goals"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "add_measurements",
          description: "Add current measurements to existing goals for tracking progress",
          parameters: {
            type: "object",
            properties: {
              client_id: {
                type: "string",
                description: "UUID of the client (use the CLIENT_ID value from context, NOT the client name)"
              },
              measurements: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    goal_name: { type: "string", description: "Name of the goal to add measurement to" },
                    value: { type: "number", description: "Current measurement value" },
                    unit: { type: "string", description: "Unit of measurement" },
                    measurement_date: { type: "string", description: "Date of measurement in YYYY-MM-DD format" }
                  },
                  required: ["goal_name", "value", "unit"]
                }
              }
            },
            required: ["client_id", "measurements"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "update_goal",
          description: "Update target value of an existing goal for a client",
          parameters: {
            type: "object",
            properties: {
              client_id: {
                type: "string",
                description: "UUID of the client (use the CLIENT_ID value from context, NOT the client name)"
              },
              goal_name: {
                type: "string",
                description: "Exact name of the goal to update (e.g., 'Бег 1 км')"
              },
              target_value: {
                type: "number",
                description: "New target value"
              },
              target_unit: {
                type: "string",
                description: "Unit of measurement (e.g., 'minutes', 'reps', 'kg')"
              }
            },
            required: ["client_id", "goal_name", "target_value"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_training_plan",
          description: "Create a complete weekly training plan for a client",
          parameters: {
            type: "object",
            properties: {
              client_id: {
                type: "string",
                description: "UUID of the client"
              },
              plan_name: {
                type: "string",
                description: "Name of the training plan (e.g., 'Набор массы 4 недели')"
              },
              description: {
                type: "string",
                description: "Optional description of the plan goals"
              },
              duration_weeks: {
                type: "number",
                description: "Duration in weeks (default: 4)"
              },
              workouts: {
                type: "array",
                description: "List of workouts for the week",
                items: {
                  type: "object",
                  properties: {
                    day_of_week: {
                      type: "number",
                      description: "0=Monday, 1=Tuesday, ... 6=Sunday"
                    },
                    workout_name: {
                      type: "string",
                      description: "Name of the workout (e.g., 'Грудь + Трицепс')"
                    },
                    description: {
                      type: "string",
                      description: "Optional workout description"
                    },
                    exercises: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          exercise_name: {
                            type: "string",
                            description: "Name of exercise in Russian (e.g., 'Жим штанги лежа')"
                          },
                          sets: {
                            type: "number",
                            description: "Number of sets"
                          },
                          reps: {
                            type: "string",
                            description: "Reps (e.g., '10' or '8-12')"
                          },
                          rest_seconds: {
                            type: "number",
                            description: "Rest time in seconds"
                          },
                          notes: {
                            type: "string",
                            description: "Optional technique notes"
                          }
                        },
                        required: ["exercise_name", "sets", "reps", "rest_seconds"]
                      }
                    }
                  },
                  required: ["day_of_week", "workout_name", "exercises"]
                }
              }
            },
            required: ["client_id", "plan_name", "workouts"]
          }
        }
      }
    ];

    // Check if user is approving a plan
    const isApproval = message.toLowerCase().includes('да, выполнить') ||
                       message.toLowerCase().includes('yes, execute') ||
                       message.toLowerCase().includes('выполнить план') ||
                       message.toLowerCase().includes('да, реализовать');

    const requestBody: any = {
      model: 'google/gemini-2.5-flash',
      messages: aiMessages,
    };

    // Add tools if user is creating plan or approving
    if (isApproval || eagerMode || contextMode === 'goals' || mentionedClients.length > 0) {
      requestBody.tools = tools;
      // Force tool usage in eager mode
      if (eagerMode) {
        requestBody.tool_choice = "required";
        console.log('🔧 Forcing tool usage in eager mode');
      } else {
        requestBody.tool_choice = "auto";
      }
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      // Handle rate limiting
      if (response.status === 429) {
        console.error('⚠️ AI rate limit exceeded (429)');
        
        // Save user message with error info
        await supabaseClient.from('ai_messages').insert({
          conversation_id: conversation.id,
          role: 'user',
          content: message,
          metadata: {}
        });
        
        // Save error message
        await supabaseClient.from('ai_messages').insert({
          conversation_id: conversation.id,
          role: 'system',
          content: '⚠️ Превышен лимит запросов к AI. Пожалуйста, попробуйте через несколько минут.',
          metadata: { error: 'rate_limit', status: 429 }
        });
        
        return new Response(
          JSON.stringify({
            conversationId: conversation.id,
            message: 'Превышен лимит запросов к AI. Пожалуйста, попробуйте через несколько минут.',
            error: 'rate_limit'
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Handle payment required
      if (response.status === 402) {
        console.error('⚠️ AI credits exhausted (402)');
        
        // Save user message with error info
        await supabaseClient.from('ai_messages').insert({
          conversation_id: conversation.id,
          role: 'user',
          content: message,
          metadata: {}
        });
        
        // Save error message
        await supabaseClient.from('ai_messages').insert({
          conversation_id: conversation.id,
          role: 'system',
          content: '⚠️ Кредиты AI исчерпаны. Пожалуйста, пополните баланс для продолжения работы.',
          metadata: { error: 'credits_exhausted', status: 402 }
        });
        
        return new Response(
          JSON.stringify({
            conversationId: conversation.id,
            message: 'Кредиты AI исчерпаны. Пожалуйста, пополните баланс.',
            error: 'credits_exhausted'
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Handle other errors
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    let assistantMessage = aiResponse.choices[0].message.content || '';
    const toolCalls = aiResponse.choices[0].message.tool_calls;

    console.log('AI response generated');
    
    // Initialize isPlan at the top level to avoid scope issues
    let isPlan = false;

    // Parse structured actions from tool calls
    let structuredActions = [];
    let suggestedActions = null;
    let pendingActionId = null;

    if (toolCalls && toolCalls.length > 0) {
      console.log(`Parsing ${toolCalls.length} tool calls...`);
      
      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        
        console.log(`Tool call: ${functionName}`, args);
        
        if (functionName === 'create_client_goals') {
          for (const goal of args.goals) {
            structuredActions.push({
              type: 'create_goal',
              data: {
                client_id: args.client_id,
                goal_name: goal.goal_name,
                goal_type: goal.goal_type,
                target_value: goal.target_value,
                target_unit: goal.target_unit
              }
            });
          }
        } else if (functionName === 'add_measurements') {
          for (const measurement of args.measurements) {
            structuredActions.push({
              type: 'add_measurement',
              data: {
                client_id: args.client_id,
                goal_name: measurement.goal_name,
                value: measurement.value,
                unit: measurement.unit,
                measurement_date: measurement.measurement_date || new Date().toISOString().split('T')[0]
              }
            });
          }
        } else if (functionName === 'update_goal') {
          structuredActions.push({
            type: 'update_goal',
            data: {
              client_id: args.client_id,
              goal_name: args.goal_name,
              target_value: args.target_value,
              target_unit: args.target_unit
            }
          });
        } else if (functionName === 'create_training_plan') {
          structuredActions.push({
            type: 'create_training_plan',
            data: {
              client_id: args.client_id,
              plan_name: args.plan_name,
              description: args.description,
              duration_weeks: args.duration_weeks || 4,
              workouts: args.workouts
            }
          });
        }
      }
      
      // IMPROVED: Better handling of multiple clients
      console.log(`📋 Before normalization: ${structuredActions.length} actions, contextClientId=${contextClientId}, mentionedClients=${mentionedClients?.length || 0}`);
      
      for (let i = 0; i < structuredActions.length; i++) {
        const action = structuredActions[i];
        const beforeClientId = action.data?.client_id;
        
        // Single client in context - force it
        if (contextClientId && mentionedClients.length === 0) {
          console.log(`🔒 Action ${i}: Forcing contextClientId (${contextClientId})`);
          if (action.data) {
            action.data.client_id = contextClientId;
          }
        } 
        // Single mentioned client - use it
        else if (mentionedClients.length === 1) {
          console.log(`✅ Action ${i}: Using single mentioned client`);
          if (action.data) {
            action.data.client_id = mentionedClients[0];
          }
        }
        // Multiple clients - try to match by name
        else if (mentionedClients.length > 1) {
          const actionClientName = action.data.goal_name || action.data.plan_name || '';
          
          // Load all mentioned client profiles for matching
          const { data: mentionedProfiles } = await supabaseClient
            .from('profiles')
            .select('user_id, username, full_name')
            .in('user_id', mentionedClients);
          
          if (mentionedProfiles) {
            const matchedClient = mentionedProfiles.find(c => 
              actionClientName.toLowerCase().includes(c.full_name.toLowerCase()) ||
              actionClientName.toLowerCase().includes(c.username.toLowerCase())
            );
            
            if (matchedClient) {
              console.log(`🎯 Action ${i}: Matched to ${matchedClient.full_name} by name`);
              if (action.data) {
                action.data.client_id = matchedClient.user_id;
              }
            } else if (contextClientId) {
              console.log(`⚠️ Action ${i}: Can't match name, using contextClientId`);
              if (action.data) {
                action.data.client_id = contextClientId;
              }
            } else {
              console.error(`❌ Action ${i}: Can't determine client from ${mentionedClients.length} options`);
            }
          }
        }
        // Validate and auto-correct if needed
        else if (action.data?.client_id) {
          const isUUID = action.data.client_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
          
          if (!isUUID) {
            console.log(`⚠️ Action ${i}: Non-UUID client_id: "${action.data.client_id}"`);
            
            if (contextClientId) {
              console.log(`🔧 Action ${i}: Auto-correcting to contextClientId`);
              action.data.client_id = contextClientId;
            } else {
              // Try to resolve by username or full_name
              const { data: resolvedClient } = await supabaseClient
                .from('profiles')
                .select('user_id')
                .or(`username.ilike.%${action.data.client_id}%,full_name.ilike.%${action.data.client_id}%`)
                .maybeSingle();
              
              if (resolvedClient) {
                console.log(`✅ Action ${i}: Resolved to ${resolvedClient.user_id}`);
                action.data.client_id = resolvedClient.user_id;
              }
            }
          }
        } else if (contextClientId) {
          console.log(`🔧 Action ${i}: No client_id, using contextClientId`);
          if (action.data) {
            action.data.client_id = contextClientId;
          }
        }
        
        console.log(`📝 Action ${i}: ${beforeClientId || 'none'} → ${action.data?.client_id || 'none'}`);
      }
      
      console.log(`✅ After normalization: all actions ready with client_id`);
    }

    // Auto-execute simple actions if enabled
    let autoExecuted = false;
    if (autoExecute && structuredActions.length > 0 && structuredActions.length <= 3) {
      console.log(`🚀 Auto-executing ${structuredActions.length} action(s)...`);
      
      try {
        // Call trainer-ai-execute directly
        const executeResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/trainer-ai-execute`,
          {
            method: 'POST',
            headers: {
              'Authorization': req.headers.get('Authorization')!,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              conversationId: conversation.id,
              actions: structuredActions,
              autoExecuted: true
            })
          }
        );
        
        if (executeResponse.ok) {
          const executeResult = await executeResponse.json();
          console.log('✅ Auto-execution completed:', executeResult);
          autoExecuted = true;
          
          // Add system message about execution
          const successCount = executeResult.results.filter((r: any) => r.success).length;
          const failCount = executeResult.results.filter((r: any) => !r.success).length;
          
          // Format results with detailed information
          const resultsText = executeResult.results.map((r: any, i: number) => {
            let actionText = r.action || r.action_type || 'Unknown action';
            
            // Add details for specific actions with fallback
            if (r.action === 'create_training_plan' && r.success) {
              if (r.data?.plan_id && r.data?.plan_name) {
                const planName = r.data.plan_name;
                const workoutsCount = r.data.workouts_count || 0;
                actionText = `Создан план "${planName}" (${workoutsCount} тренировок)`;
              } else {
                actionText = 'Создан план тренировок';
              }
            } else if (r.action === 'create_goal' && r.success && r.data) {
              actionText = `Создана цель "${r.data.goal_name || 'Цель'}"`;
            } else if (r.action === 'add_measurement' && r.success && r.data) {
              actionText = `Добавлено измерение: ${r.data.value} ${r.data.unit || ''}`;
            }
            
            return `${i+1}. ${r.success ? '✓' : '✗'} ${actionText}`;
          }).join('\n');
          
          await supabaseClient.from('ai_messages').insert({
            conversation_id: conversation.id,
            role: 'system',
            content: `✅ Действия выполнены автоматически:\n${resultsText}\n\nУспешно: ${successCount}, Ошибок: ${failCount}`,
            metadata: { 
              autoExecuted: true, 
              results: executeResult.results,
              structuredActions
            }
          });
        }
      } catch (execError) {
        console.error('❌ Auto-execution failed:', execError);
        // Fall back to creating pending action
        autoExecuted = false;
      }
    }

    // Validate AI response for fake client mentions
    const fakePatterns = ['@coach_', '@john_', '@sarah_', '@trainer_', '@client_', '@alice_', '@bob_'];
    let validatedAssistantMessage = assistantMessage;

    for (const fakePattern of fakePatterns) {
      if (validatedAssistantMessage.includes(fakePattern)) {
        console.warn(`⚠️ Detected fake client mention: ${fakePattern}`);
        
        // Try to replace with actual client from context if available
        if (contextClientId && contextData) {
          const clientNameMatch = contextData.match(/Name: (.+?) \(@(\S+)\)/);
          if (clientNameMatch) {
            const [_, fullName, username] = clientNameMatch;
            console.log(`🔧 Replacing fake mention with real client: @${username}`);
            validatedAssistantMessage = validatedAssistantMessage.replace(
              new RegExp(fakePattern + '\\w*', 'g'),
              `@${username}`
            );
          }
        } else {
          // If no context client, remove fake mentions with warning
          console.warn(`❌ Removing fake mention ${fakePattern} - no real client to replace with`);
          validatedAssistantMessage = validatedAssistantMessage.replace(
            new RegExp(fakePattern + '\\w*', 'g'),
            '[CLIENT_NAME_REMOVED]'
          );
        }
      }
    }

    // Use validated message instead of raw AI response
    assistantMessage = validatedAssistantMessage;

    // Handle optimistic pending action update or create new one
    if (optimisticPendingAction && structuredActions.length > 0) {
      console.log('📝 Updating optimistic pending action with real data');
      
      await supabaseClient
        .from('ai_pending_actions')
        .update({
          action_plan: assistantMessage,
          action_data: structuredActions,
          status: 'pending'
        })
        .eq('id', optimisticPendingAction.id);
      
      pendingActionId = optimisticPendingAction.id;
      suggestedActions = structuredActions.map((action, index) => ({
        type: action.type,
        id: `${optimisticPendingAction.id}_${index}`,
        ...action.data
      }));
      
      // Update system message with real plan
      const { count } = await supabaseClient
        .from('ai_messages')
        .update({
          content: assistantMessage,
          metadata: {
            isPlan: true,
            pendingActionId: optimisticPendingAction.id,
            suggestedActions,
            status: 'pending'
          }
        })
        .eq('conversation_id', conversation.id)
        .eq('role', 'system')
        .eq('metadata->status', 'preparing');
      
      // Fallback: If optimistic message not found, create new assistant message
      if (!count || count === 0) {
        console.warn('⚠️ Optimistic message not found, creating new assistant message');
        await supabaseClient.from('ai_messages').insert({
          conversation_id: conversation.id,
          role: 'assistant',
          content: assistantMessage,
          metadata: {
            isPlan: true,
            pendingActionId: optimisticPendingAction.id,
            suggestedActions,
            status: 'pending'
          }
        });
      } else {
        console.log(`✅ Updated ${count} optimistic message(s) with AI response`);
      }
    } else {
      // Only check for plan if not auto-executed and no optimistic action
      isPlan = !autoExecuted && structuredActions.length > 0;

      if (isPlan && structuredActions.length > 0) {
        console.log(`Creating pending action with ${structuredActions.length} structured actions...`);
        
        // Create pending action in database with structured actions
        const { data: pendingAction, error: actionError } = await supabaseClient
          .from('ai_pending_actions')
          .insert({
            conversation_id: conversation.id,
            trainer_id: user.id,
            action_type: 'plan_execution',
            action_plan: assistantMessage,
            action_data: structuredActions,
            status: 'pending'
          })
          .select()
          .single();

        if (!actionError && pendingAction) {
          pendingActionId = pendingAction.id;
          suggestedActions = structuredActions.map((action, index) => ({
            type: action.type,
            id: `${pendingAction.id}_${index}`,
            ...action.data
          }));
          console.log('Created pending action:', pendingActionId, 'with', suggestedActions.length, 'actions');
        } else if (actionError) {
          console.error('Error creating pending action:', actionError);
        }
      }
    }

    // Save messages to database with metadata (only if not optimistic mode)
    if (!optimisticPendingAction) {
      isPlan = !autoExecuted && structuredActions.length > 0;
      
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
          content: assistantMessage,
          metadata: {
            isPlan,
            pendingActionId,
            suggestedActions
          }
        }
      ]);
    } else {
      // Only save user message in optimistic mode (system message already created)
      await supabaseClient.from('ai_messages').insert({
        conversation_id: conversation.id,
        role: 'user',
        content: message,
        metadata: { mentioned_clients: mentionedClients }
      });
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
        pendingActionId,
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
