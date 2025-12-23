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
      autoExecute = false, // Require confirmation by default
      optimisticUserId, // User message optimisticId for deduplication
      optimisticAssistantId // Assistant preparing message id to update
    } = await req.json();
    
    console.log(`🎛️ Request params: autoExecute=${autoExecute}, contextMode=${contextMode}`);

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
    
    // Load ALL active clients for AI context using RPC to avoid RLS issues
    const { data: allTrainerClients } = await supabaseClient
      .rpc('get_trainer_clients_summary', { p_trainer_id: user.id });

    if (allTrainerClients && allTrainerClients.length > 0) {
      contextData += '\n\n📋 YOUR ACTIVE CLIENTS (use these names ONLY):\n';
      for (const client of allTrainerClients) {
        if (client.username && client.full_name) {
          contextData += `- ${client.full_name} (@${client.username}) [ID: ${client.client_id}]\n`;
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
    
    // ====== ENHANCED CLIENT RECOGNITION FROM FREE TEXT ======
    // Track recognized client info for UI display
    let recognizedClient: {
      client_id: string;
      recognition_method: string;
      confidence_score: number;
      recognized_from_text: string;
    } | null = null;
    
    // Helper: Normalize text for matching
    function normalizeText(text: string): string {
      return text
        .toLowerCase()
        .trim()
        .replace(/[^\u0400-\u04FFa-z0-9@\s]/gi, '') // Keep Cyrillic, Latin, @, spaces
        .replace(/\s+/g, ' ');
    }

    // Helper: Generate Russian name declension stems for matching
    function generateRussianStems(name: string): string[] {
      const normalized = normalizeText(name);
      const stems: string[] = [normalized];
      
      // For names ending in typical Russian patterns, create stem variants
      if (normalized.length >= 4) {
        // Remove common endings to create base stem
        const patterns = [
          { regex: /(ей|ий|ой|ая|яя|ое|ее)$/i, stem: (n: string) => n.slice(0, -2) },
          { regex: /(а|я|у|ю|е|и|ы|ом|ем|ам|ям)$/i, stem: (n: string) => n.slice(0, -1) },
        ];
        
        for (const pattern of patterns) {
          if (pattern.regex.test(normalized)) {
            const stem = pattern.stem(normalized);
            if (stem.length >= 3) {
              stems.push(stem);
            }
          }
        }
      }
      
      return stems;
    }

    // Helper: Score and match clients from free text
    async function matchClientsFromFreeText(text: string): Promise<{
      matches: Array<{ client_id: string; score: number; matchType: string }>;
      needsDisambiguation: boolean;
    }> {
      const normalizedText = normalizeText(text);
      
      // Load all active clients
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
      
      if (!candidates || candidates.length === 0) {
        return { matches: [], needsDisambiguation: false };
      }

      // Load all aliases
      const { data: aliases } = await supabaseClient
        .from('client_aliases')
        .select('client_id, alias_name')
        .eq('trainer_id', user.id);
      
      const aliasMap = new Map<string, string[]>();
      if (aliases) {
        for (const alias of aliases) {
          const existing = aliasMap.get(alias.client_id) || [];
          existing.push(normalizeText(alias.alias_name));
          aliasMap.set(alias.client_id, existing);
        }
      }

      // Build scoring for each client
      const scoredMatches: Array<{ 
        client_id: string; 
        score: number; 
        matchType: string;
        profile: any;
      }> = [];

      for (const candidate of candidates) {
        const profile = candidate.profiles as any;
        if (!profile) continue;

        const fullName = normalizeText(profile.full_name || '');
        const username = normalizeText(profile.username || '');
        const clientAliases = aliasMap.get(profile.user_id) || [];
        
        let score = 0;
        let matchType = '';

        // 1. Exact alias match (highest priority: 100 points)
        for (const alias of clientAliases) {
          if (normalizedText.includes(alias) || alias.includes(normalizedText)) {
            score = Math.max(score, 100);
            matchType = 'alias';
            break;
          }
        }

        // 2. Full name exact match (90 points)
        if (score < 90 && fullName && normalizedText.includes(fullName)) {
          score = 90;
          matchType = 'full_name_exact';
        }

        // 3. Username match (80 points)
        if (score < 80 && username && (normalizedText.includes(username) || normalizedText.includes(`@${username}`))) {
          score = 80;
          matchType = 'username';
        }

        // 4. First name or last name match (70 points)
        if (score < 70 && fullName) {
          const nameParts = fullName.split(/\s+/);
          for (const part of nameParts) {
            if (part.length >= 3 && normalizedText.includes(part)) {
              score = 70;
              matchType = 'name_part';
              break;
            }
          }
        }

        // 5. Russian name stem matching (50 points)
        if (score < 50 && fullName) {
          const nameParts = fullName.split(/\s+/);
          for (const part of nameParts) {
            const stems = generateRussianStems(part);
            for (const stem of stems) {
              if (stem.length >= 4 && normalizedText.includes(stem)) {
                score = 50;
                matchType = 'name_stem';
                break;
              }
            }
            if (score >= 50) break;
          }
        }

        if (score > 0) {
          scoredMatches.push({
            client_id: profile.user_id,
            score,
            matchType,
            profile
          });
        }
      }

      // Sort by score descending
      scoredMatches.sort((a, b) => b.score - a.score);

      // Deduplicate by client_id (keep highest score)
      const uniqueMatches = new Map<string, typeof scoredMatches[0]>();
      for (const match of scoredMatches) {
        if (!uniqueMatches.has(match.client_id)) {
          uniqueMatches.set(match.client_id, match);
        }
      }

      const finalMatches = Array.from(uniqueMatches.values());
      
      console.log(`📝 Free text matching results: ${finalMatches.length} unique matches from "${text}"`);
      for (const m of finalMatches.slice(0, 3)) {
        console.log(`  - ${m.profile.full_name}: score=${m.score}, type=${m.matchType}`);
      }

      return {
        matches: finalMatches.map(m => ({ 
          client_id: m.client_id, 
          score: m.score, 
          matchType: m.matchType 
        })),
        needsDisambiguation: finalMatches.length > 1 && finalMatches[0].score === finalMatches[1].score
      };
    }

    // Extract potential client mentions from free text (not @-mentions)
    const freeTextMessage = message.replace(/@\w+/g, ''); // Remove @mentions
    if (freeTextMessage.length > 5 && !contextClientId && mentionedNames.length === 0) {
      console.log('🔍 Attempting free-text client recognition...');
      const freeTextResult = await matchClientsFromFreeText(freeTextMessage);
      
      if (freeTextResult.matches.length === 1) {
        // Single high-confidence match
        const match = freeTextResult.matches[0];
        if (match.score >= 70) { // Only auto-match if score is good
          console.log(`✅ Auto-matched from free text: client_id=${match.client_id}, score=${match.score}`);
          mentionedClients.push(match.client_id);
          
          // Save recognition info for UI
          recognizedClient = {
            client_id: match.client_id,
            recognition_method: match.matchType,
            confidence_score: match.score,
            recognized_from_text: freeTextMessage.trim()
          };
        }
      } else if (freeTextResult.matches.length > 1 && freeTextResult.matches[0].score >= 50) {
        // Multiple matches - need disambiguation
        console.log(`⚠️ Multiple clients matched from free text, needs disambiguation`);
        
        // Load full profiles for disambiguation
        const topMatches = freeTextResult.matches.slice(0, 3);
        const matchedProfiles = await Promise.all(
          topMatches.map(async (m) => {
            const { data } = await supabaseClient
              .from('profiles')
              .select('user_id, username, full_name, avatar_url')
              .eq('user_id', m.client_id)
              .single();
            return data;
          })
        );

        disambiguationNeeded.push({
          mentionedName: 'упомянутый клиент',
          candidates: matchedProfiles.filter(p => p !== null).map(p => ({
            user_id: p.user_id,
            username: p.username,
            full_name: p.full_name,
            avatar_url: p.avatar_url
          }))
        });
      } else {
        console.log('ℹ️ No client matched from free text');
      }
    }

    // Handle fuzzy matching for explicit @-mentioned names
    if (mentionedNames.length > 0) {
      console.log('🔎 Fuzzy matching for explicit mentions:', mentionedNames);
      
      for (const mentionedName of mentionedNames) {
        const normalized = normalizeText(mentionedName);
        
        // Check for partial alias match (updated with better pattern)
        const { data: aliasMatches } = await supabaseClient
          .from('client_aliases')
          .select('client_id, alias_name, profiles!client_aliases_client_id_fkey(user_id, username, full_name, avatar_url)')
          .eq('trainer_id', user.id);
        
        // Filter aliases that partially match
        const matchingAliases = aliasMatches?.filter(a => {
          const aliasNorm = normalizeText(a.alias_name);
          return aliasNorm.includes(normalized) || normalized.includes(aliasNorm);
        }) || [];
        
        if (matchingAliases.length === 1) {
          // Found single alias match
          console.log(`✅ Alias match found for "${mentionedName}":`, matchingAliases[0]);
          mentionedClients.push(matchingAliases[0].client_id);
          
          // Save recognition info for UI
          if (!recognizedClient) {
            recognizedClient = {
              client_id: matchingAliases[0].client_id,
              recognition_method: 'alias',
              confidence_score: 100,
              recognized_from_text: mentionedName
            };
          }
        } else if (matchingAliases.length > 1) {
          // Multiple alias matches - disambiguation needed
          disambiguationNeeded.push({
            mentionedName,
            candidates: matchingAliases.map(a => {
              const p = a.profiles as any;
              return {
                user_id: p.user_id,
                username: p.username,
                full_name: p.full_name,
                avatar_url: p.avatar_url
              };
            })
          });
        } else {
          // No alias match - perform fuzzy search on profiles
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
            const matches = candidates
              .filter(c => {
                const profile = c.profiles as any;
                if (!profile) return false;
                const fullName = normalizeText(profile.full_name || '');
                const username = normalizeText(profile.username || '');
                
                // Check for partial matches
                if (fullName.includes(normalized) || normalized.includes(fullName)) return true;
                if (username.includes(normalized) || normalized.includes(username)) return true;
                
                // Check name parts
                const fullNameParts = fullName.split(/\s+/);
                const matchesFirstPart = fullNameParts[0] && fullNameParts[0].includes(normalized);
                const mentionMatchesStart = fullName.startsWith(normalized);
                
                return matchesFirstPart || mentionMatchesStart;
              })
              .slice(0, 3);
            
            if (matches.length === 1) {
              const profile = matches[0].profiles as any;
              console.log(`✅ Auto-matched "${mentionedName}" to ${profile.full_name}`);
              mentionedClients.push(profile.user_id);
              
              // Save recognition info for UI
              if (!recognizedClient) {
                const fullName = normalizeText(profile.full_name || '');
                const username = normalizeText(profile.username || '');
                
                let method = 'name_part';
                let score = 70;
                
                if (fullName === normalized) {
                  method = 'full_name_exact';
                  score = 90;
                } else if (username === normalized || normalized === `@${username}`) {
                  method = 'username';
                  score = 80;
                }
                
                recognizedClient = {
                  client_id: profile.user_id,
                  recognition_method: method,
                  confidence_score: score,
                  recognized_from_text: mentionedName
                };
              }
            } else if (matches.length > 1) {
              console.log(`⚠️ Multiple matches for "${mentionedName}":`, matches.length);
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
              console.warn(`❌ No matches found for "${mentionedName}"`);
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

🚨 CRITICAL TOOL USAGE RULES (MUST FOLLOW):

When users ask you to:
- "создать план тренировок" / "разработать план" / "составить план"
- "поставить цели" / "установить задачи" / "создать цели"
- "добавить измерения" / "записать результаты"
- "update goal" / "change goal" / "изменить цель"

YOU MUST:
1. Generate a helpful text response explaining what you're doing
2. **ALWAYS call the appropriate tool functions** (create_training_plan, create_client_goals, add_measurements, update_goal)
3. DO NOT just describe the plan in text - you MUST call the tool to create structured data

The trainer needs structured data to approve and execute your plans. Text-only responses will be ignored!

IMPORTANT INSTRUCTIONS:
1. When the trainer wants to make changes (update goals, add measurements, create tasks), respond in PLAN MODE:
   - Clearly explain what you'll do
   - **CALL THE APPROPRIATE TOOL FUNCTION WITH STRUCTURED DATA**
   - DO NOT ask "Ready to implement?" - the UI shows confirmation buttons automatically
   
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
   - Simple, safe actions (create goal, add note, record measurement) → Execute immediately with tools
   - Potentially dangerous actions (delete, mass update, challenge management) → Create plan with tools and wait for UI confirmation
   - When in doubt → Create plan with tools (user will see confirmation card in UI)
   - NEVER ask "Ready to implement? (yes/no)" or "Готово к реализации? (да/нет)" in text
   - NEVER ask for text confirmation - the UI will show a card with Execute/Reject buttons
   - Structure response:
     * If auto-executable: Use tools immediately and report results
     * If needs confirmation: Explain plan, THEN call tools - the UI will show confirmation card automatically
   
8. PLAN CREATION:
   - When user requests changes, create a clear plan with numbered steps
   - ALWAYS use tools to execute the plan (don't just describe what to do)
   - If auto-executable, execute immediately and report results
   - If confirmation needed, call tools anyway - UI will show Execute/Reject card automatically
   - NEVER ask for text-based confirmation like "да/нет" or "yes/no"

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
   - After user says "да/yes/confirm" - your NEXT response MUST contain tool calls

13. GOAL SUGGESTIONS TOOL USAGE:
   - When trainer asks "какие рекомендации?", "что посоветуешь?", "как корректировать цели?", "покажи suggestions" - use get_goal_suggestions tool
   - After receiving suggestions data, analyze them and provide clear explanations
   - Prioritize suggestions by priority (1 = highest)
   - Explain WHY each suggestion was made based on progress_trend and confidence_score
   - If trainer wants to apply a suggestion, create appropriate action (create_goal, update_goal, add_measurement)
   - If no suggestions exist, inform trainer they can generate them via UI`;

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
      },
      {
        type: "function",
        function: {
          name: "get_goal_suggestions",
          description: "Get AI-generated suggestions for goal adjustments based on client progress analysis. Use this when trainer asks about recommendations, suggestions, or what to do with client goals.",
          parameters: {
            type: "object",
            properties: {
              client_id: {
                type: "string",
                description: "UUID of the client (use the CLIENT_ID value from context, NOT the client name)"
              },
              status: {
                type: "string",
                description: "Filter by status: 'pending' (default), 'accepted', 'rejected', 'dismissed', or 'all'",
                enum: ["pending", "accepted", "rejected", "dismissed", "all"]
              },
              limit: {
                type: "number",
                description: "Maximum number of suggestions to return (default: 5)"
              }
            },
            required: ["client_id"]
          }
        }
      }
    ];

    // Check if user is approving a plan
    const isApproval = message.toLowerCase().includes('да, выполнить') ||
                       message.toLowerCase().includes('yes, execute') ||
                       message.toLowerCase().includes('выполнить план') ||
                       message.toLowerCase().includes('да, реализовать');

    // NEW: Detect if user is requesting plan/goal creation
    const userMessage = message.toLowerCase();
    const needsStructuredOutput = 
      // План
      userMessage.includes('создай план') ||
      userMessage.includes('разработай план') ||
      userMessage.includes('составь план') ||
      userMessage.includes('создать план') ||
      userMessage.includes('create plan') ||
      // Цели
      userMessage.includes('поставь цел') ||
      userMessage.includes('установи цел') ||
      userMessage.includes('создай цел') ||
      userMessage.includes('добавь цел') ||
      userMessage.includes('добавь новую цел') ||
      userMessage.includes('обнови цел') ||
      userMessage.includes('измен цел') ||
      userMessage.includes('set goal') ||
      userMessage.includes('add goal') ||
      userMessage.includes('update goal') ||
      // Измерения
      userMessage.includes('добавь измерен') ||
      userMessage.includes('добавь результат') ||
      userMessage.includes('запиши результат') ||
      userMessage.includes('текущий результат') ||
      userMessage.includes('add measurement') ||
      userMessage.includes('record result');

    const requestBody: any = {
      model: 'google/gemini-2.5-flash',
      messages: aiMessages,
      stream: true, // ENABLE STREAMING
    };

    // Check if message contains action-related keywords
    const hasMentions = mentionedClients.length > 0 || mentionedNames.length > 0;
    const hasActionKeywords = 
      userMessage.includes('цель') || 
      userMessage.includes('goal') ||
      userMessage.includes('измерен') ||
      userMessage.includes('measurement') ||
      userMessage.includes('план') ||
      userMessage.includes('plan') ||
      userMessage.includes('результат') ||
      userMessage.includes('result');

    // Add tools if user is creating plan, approving, or mentions clients with action keywords
    if (isApproval || eagerMode || contextMode === 'goals' || hasMentions || needsStructuredOutput || hasActionKeywords) {
      requestBody.tools = tools;
      // Force tool usage in eager mode OR when user explicitly requests plan/goal creation OR mentions client with actions
      const shouldForceTools = eagerMode || needsStructuredOutput || (hasMentions && hasActionKeywords);
      if (shouldForceTools) {
        requestBody.tool_choice = "required";
        console.log('🔧 Forcing tool usage:', 
          eagerMode ? 'eager mode' : 
          needsStructuredOutput ? 'action detected' : 
          'client mention with action keywords'
        );
      } else {
        requestBody.tool_choice = "auto";
      }
    }

    const aiClient = createAIClient(AIProvider.LOVABLE);
    const aiData = await aiClient.complete({
      model: requestBody.model,
      messages: requestBody.messages,
      tools: requestBody.tools,
      tool_choice: requestBody.tool_choice
    });

    let assistantMessage = aiData.content;
    let toolCalls = null;
    let actionType = null;

    // Handle tool calls if present
    if (aiData.tool_calls && aiData.tool_calls.length > 0) {
      toolCalls = aiData.tool_calls;
      const firstTool = toolCalls[0];
      actionType = firstTool.function.name;
      console.log(`🔧 Tool called: ${actionType}`);
    }

      // NEW: Debug logging for tool call status
      console.log('🔍 DEBUG AI Response:', {
        hasToolCalls: !!toolCalls && toolCalls.length > 0,
        toolCallsCount: toolCalls?.length || 0,
        assistantMessageLength: assistantMessage.length,
        needsStructuredOutput,
        eagerMode
      });
      
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
        } else if (functionName === 'get_goal_suggestions') {
          // This is an informational tool - it returns data but doesn't create actions
          console.log('📊 Fetching goal suggestions for client:', args.client_id);
          
          // Query the ai_goal_suggestions table
          let query = supabaseClient
            .from('ai_goal_suggestions')
            .select(`
              id,
              goal_id,
              suggestion_type,
              current_progress,
              progress_trend,
              recommendation_text,
              suggested_action,
              confidence_score,
              priority,
              status,
              created_at,
              goals (
                goal_name,
                target_value,
                target_unit
              )
            `)
            .eq('client_id', args.client_id)
            .order('priority', { ascending: true })
            .order('created_at', { ascending: false });
          
          // Filter by status
          if (args.status && args.status !== 'all') {
            query = query.eq('status', args.status);
          } else if (!args.status) {
            // Default to pending only
            query = query.eq('status', 'pending');
          }
          
          // Limit results
          const limit = args.limit || 5;
          query = query.limit(limit);
          
          const { data: suggestions, error } = await query;
          
          if (error) {
            console.error('Error fetching suggestions:', error);
            assistantMessage += `\n\n⚠️ Не удалось загрузить рекомендации: ${error.message}`;
          } else if (suggestions && suggestions.length > 0) {
            console.log(`✅ Found ${suggestions.length} suggestions`);
            
            // Format suggestions for AI context
            const suggestionsContext = suggestions.map((s, idx) => {
              const goal = (s.goals as any) || {};
              return `
${idx + 1}. [${s.suggestion_type.toUpperCase()}] ${goal.goal_name || 'Unknown goal'}
   Priority: ${s.priority}/5 | Confidence: ${s.confidence_score}%
   Progress: ${s.current_progress}% (${s.progress_trend})
   
   💡 Recommendation:
   ${s.recommendation_text}
   
   🎯 Suggested Action:
   ${JSON.stringify(s.suggested_action, null, 2)}
   
   Status: ${s.status} | Created: ${new Date(s.created_at).toLocaleDateString('ru')}
   Suggestion ID: ${s.id}
              `.trim();
            }).join('\n\n---\n\n');
            
            // Add suggestions to assistant message context
            assistantMessage += `\n\n📊 **AI-рекомендации для клиента (${suggestions.length}):**\n\n${suggestionsContext}`;
            
            // Store suggestions in metadata for potential use
            suggestedActions = {
              type: 'goal_suggestions',
              data: suggestions
            };
          } else {
            console.log('ℹ️ No suggestions found');
            assistantMessage += `\n\nℹ️ У этого клиента пока нет AI-рекомендаций. Вы можете запустить анализ, нажав кнопку "🤖 Анализировать прогресс" в карточке клиента.`;
          }
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
    } else {
      // NEW: Fallback parsing for text-only responses that look like plans
      console.log('⚠️ AI did not use tools, checking for text-only plan...');
      
      const hasPlanStructure = /понедельник|вторник|среда|четверг|пятница|суббота|воскресенье|monday|tuesday|wednesday|thursday|friday|saturday|sunday/i.test(assistantMessage);
      const hasGoalStructure = /цель|goal|target|прогресс|progress/i.test(assistantMessage);
      
      if ((hasPlanStructure || hasGoalStructure) && (contextClientId || mentionedClients.length > 0)) {
        console.log('📋 Detected text-only plan/goal, creating fallback structured action');
        
        // Determine client ID
        const targetClientId = contextClientId || mentionedClients[0];
        
        if (hasPlanStructure && needsStructuredOutput && userMessage.includes('план')) {
          // Create a basic training plan structure
          structuredActions.push({
            type: 'create_training_plan',
            data: {
              client_id: targetClientId,
              plan_name: 'План тренировок',
              description: 'План создан AI - требуется ручное заполнение деталей',
              duration_weeks: 4,
              workouts: [] // Empty for now, trainer will need to fill manually
            }
          });
          console.log('✅ Created fallback training_plan structured action');
        } else if (hasGoalStructure && needsStructuredOutput && userMessage.includes('цел')) {
          // Create a placeholder goal
          structuredActions.push({
            type: 'create_goal',
            data: {
              client_id: targetClientId,
              goal_name: 'Новая цель',
              goal_type: 'general',
              target_value: 100,
              target_unit: 'units'
            }
          });
          console.log('✅ Created fallback goal structured action');
        }
      }
      
      // Log final status
      console.log('🔍 DEBUG Structured Actions:', {
        structuredActionsCount: structuredActions.length,
        willCreatePendingAction: structuredActions.length > 0,
        actions: structuredActions.map(a => ({ type: a.type, hasClientId: !!a.data?.client_id }))
      });
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
      
      // Try to find and update preparing assistant message first
      let preparingMessage = null;
      if (optimisticAssistantId) {
        const { data: preparingByOptimisticId } = await supabaseClient
          .from('ai_messages')
          .select('id')
          .eq('conversation_id', conversation.id)
          .eq('role', 'assistant')
          .eq('metadata->>isOptimistic', 'true')
          .eq('metadata->>status', 'preparing')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        preparingMessage = preparingByOptimisticId;
      }
      
      // Fallback: search by status only
      if (!preparingMessage) {
        const { data: preparingByStatus } = await supabaseClient
          .from('ai_messages')
          .select('id')
          .eq('conversation_id', conversation.id)
          .eq('role', 'assistant')
          .eq('metadata->>status', 'preparing')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        preparingMessage = preparingByStatus;
      }
      
      if (preparingMessage) {
        // Update the preparing message with real AI response
        const { error: updateError } = await supabaseClient
          .from('ai_messages')
          .update({
            content: assistantMessage,
            metadata: {
              isPlan: true,
              pendingActionId: optimisticPendingAction.id,
              suggestedActions,
              status: 'pending',
              isOptimistic: false // No longer optimistic
            }
          })
          .eq('id', preparingMessage.id);
        
        if (updateError) {
          console.error('❌ Failed to update preparing message:', updateError);
        } else {
          console.log(`✅ Updated preparing message ${preparingMessage.id} with AI response`);
        }
      } else {
        console.warn('⚠️ No preparing message found, creating new assistant message');
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

    // Save messages to database
    // Always save user message (if not already saved from optimistic)
    const { data: existingUserMsg } = await supabaseClient
      .from('ai_messages')
      .select('id')
      .eq('conversation_id', conversation.id)
      .eq('metadata->>optimisticId', optimisticUserId)
      .maybeSingle();
    
    if (!existingUserMsg) {
      await supabaseClient.from('ai_messages').insert({
        conversation_id: conversation.id,
        role: 'user',
        content: message,
        metadata: { 
          mentioned_clients: mentionedClients,
          optimisticId: optimisticUserId, // Store for deduplication
          recognizedClient: recognizedClient || (contextClientId ? {
            client_id: contextClientId,
            recognition_method: 'context',
            confidence_score: 100,
            recognized_from_text: ''
          } : null),
          contextClientId: contextClientId || null
        }
      });
      console.log('✅ Saved user message to database', recognizedClient ? 'with recognized client' : '');
    } else {
      console.log('⏭️ User message already exists, skipping insert');
    }
    
    // Save assistant message:
    // 1. If optimisticPendingAction exists AND structured actions created → already updated above
    // 2. If optimisticAssistantId exists → try to update it, fallback to insert if not found
    // 3. Otherwise → insert new message

    if (optimisticPendingAction && structuredActions.length > 0) {
      // Case 1: Already updated via optimistic pending action flow
      console.log('⏭️ Optimistic mode: assistant message already updated via pending action');
    } else if (optimisticAssistantId) {
      // Case 2: Try to update the preparing message sent from frontend
      console.log('📝 Trying to update optimistic assistant message:', optimisticAssistantId);
      
      // First, try to find and update the preparing message
      const { data: existingMessage } = await supabaseClient
        .from('ai_messages')
        .select('id')
        .eq('conversation_id', conversation.id)
        .eq('role', 'assistant')
        .eq('id', optimisticAssistantId)
        .single();
      
      if (existingMessage) {
        // Update existing preparing message
        await supabaseClient
          .from('ai_messages')
          .update({
            content: assistantMessage,
            metadata: {
              isPlan: !autoExecuted && structuredActions.length > 0,
              pendingActionId,
              suggestedActions,
              isOptimistic: false // No longer optimistic
            }
          })
          .eq('id', optimisticAssistantId);
        
        console.log('✅ Updated optimistic assistant message');
      } else {
        // Fallback: preparing message not found, create new one
        console.warn('⚠️ Optimistic assistant message not found, creating new one');
        
        await supabaseClient.from('ai_messages').insert({
          conversation_id: conversation.id,
          role: 'assistant',
          content: assistantMessage,
          metadata: {
            isPlan: !autoExecuted && structuredActions.length > 0,
            pendingActionId,
            suggestedActions,
            optimisticId: optimisticAssistantId // Store for deduplication
          }
        });
        
        console.log('✅ Created new assistant message (fallback)');
      }
    } else {
      // Case 3: No optimistic mode, create new message
      isPlan = !autoExecuted && structuredActions.length > 0;
      
      await supabaseClient.from('ai_messages').insert({
        conversation_id: conversation.id,
        role: 'assistant',
        content: assistantMessage,
        metadata: {
          isPlan,
          pendingActionId,
          suggestedActions
        }
      });
      
      console.log('✅ Saved assistant message to database');
    }

    // Update conversation title if it's the first message
    if (!conversationId && messages?.length === 0) {
      const titlePrompt = `Generate a short title (max 5 words) for this conversation: "${message}"`;
      
      const aiClient = createAIClient(AIProvider.LOVABLE);
      const titleData = await aiClient.complete({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: titlePrompt }]
      });

      const title = titleData.content.replace(/['"]/g, '').trim();
      
      await supabaseClient
        .from('ai_conversations')
        .update({ title })
        .eq('id', conversation.id);
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
