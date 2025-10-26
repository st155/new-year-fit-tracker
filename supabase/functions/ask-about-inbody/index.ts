import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { corsHeaders } from '../_shared/cors.ts';
import { createAIClient, AIProvider } from '../_shared/ai-client.ts';
import { Logger } from '../_shared/monitoring.ts';
import { EdgeFunctionError, ErrorCode } from '../_shared/error-handling.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const logger = new Logger('ask-about-inbody');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user ID from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { analysisId, question } = await req.json();

    if (!analysisId || !question) {
      throw new Error('Missing analysisId or question');
    }

    console.log('Fetching InBody analysis:', analysisId);

    // Получаем конкретный анализ
    const { data: analysis, error: analysisError } = await supabase
      .from('inbody_analyses')
      .select('*')
      .eq('id', analysisId)
      .eq('user_id', user.id)
      .single();

    if (analysisError || !analysis) {
      throw new Error('Analysis not found');
    }

    // Получаем все анализы для контекста
    const { data: allAnalyses } = await supabase
      .from('inbody_analyses')
      .select('*')
      .eq('user_id', user.id)
      .order('test_date', { ascending: true });

    const contextData = {
      current: {
        date: analysis.test_date,
        weight: analysis.weight,
        bodyFat: analysis.percent_body_fat,
        bodyFatMass: analysis.body_fat_mass,
        skeletalMuscleMass: analysis.skeletal_muscle_mass,
        protein: analysis.protein,
        minerals: analysis.minerals,
        totalBodyWater: analysis.total_body_water,
        bmi: analysis.bmi,
        bmr: analysis.bmr,
        visceralFat: analysis.visceral_fat_area,
        rightArm: { mass: analysis.right_arm_mass, percent: analysis.right_arm_percent },
        leftArm: { mass: analysis.left_arm_mass, percent: analysis.left_arm_percent },
        trunk: { mass: analysis.trunk_mass, percent: analysis.trunk_percent },
        rightLeg: { mass: analysis.right_leg_mass, percent: analysis.right_leg_percent },
        leftLeg: { mass: analysis.left_leg_mass, percent: analysis.left_leg_percent },
      },
      history: allAnalyses?.map(a => ({
        date: a.test_date,
        weight: a.weight,
        bodyFat: a.percent_body_fat,
        skeletalMuscleMass: a.skeletal_muscle_mass,
      })) || [],
    };

    const systemPrompt = `Ты эксперт по фитнесу и анализу состава тела. Отвечай на вопросы пользователя о его InBody измерениях.

Дай конкретный, понятный и полезный ответ на основе его данных. Используй научный подход, но объясняй простым языком.
Если можешь, дай конкретные рекомендации и цифры.

Отвечай на русском языке, структурировано. Используй эмодзи для наглядности.`;

    await logger.info('Processing InBody question', { analysisId, userId: user.id });

    const aiClient = createAIClient(AIProvider.LOVABLE);
    const aiResponse = await aiClient.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `Данные InBody:\n${JSON.stringify(contextData, null, 2)}\n\nВопрос: ${question}` 
        },
      ]
    });

    const answer = aiResponse.content;

    if (!answer) {
      throw new EdgeFunctionError(
        ErrorCode.EXTERNAL_API_ERROR,
        'No answer returned from AI'
      );
    }

    await logger.info('AI answer completed successfully', { 
      provider: aiResponse.provider 
    });

    return new Response(
      JSON.stringify({ answer }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('ask-about-inbody error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
