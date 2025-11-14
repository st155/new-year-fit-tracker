import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { createAIClient, AIProvider } from '../_shared/ai-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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

    console.log('Fetching InBody analyses for user:', user.id);

    // Получаем все InBody анализы пользователя
    const { data: analyses, error: analysesError } = await supabase
      .from('inbody_analyses')
      .select('*')
      .eq('user_id', user.id)
      .order('test_date', { ascending: true });

    if (analysesError) {
      console.error('Error fetching analyses:', analysesError);
      throw analysesError;
    }

    if (!analyses || analyses.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Нет данных InBody для анализа. Загрузите хотя бы один файл.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Found ${analyses.length} InBody analysis/analyses`);

    // Формируем данные для AI
    const analysisData = analyses.map(a => ({
      date: a.test_date,
      weight: a.weight,
      bodyFat: a.percent_body_fat,
      bodyFatMass: a.body_fat_mass,
      skeletalMuscleMass: a.skeletal_muscle_mass,
      protein: a.protein,
      minerals: a.minerals,
      totalBodyWater: a.total_body_water,
      bmi: a.bmi,
      bmr: a.bmr,
      visceralFat: a.visceral_fat_area,
      // Сегментарный анализ
      rightArm: { mass: a.right_arm_mass, percent: a.right_arm_percent },
      leftArm: { mass: a.left_arm_mass, percent: a.left_arm_percent },
      trunk: { mass: a.trunk_mass, percent: a.trunk_percent },
      rightLeg: { mass: a.right_leg_mass, percent: a.right_leg_percent },
      leftLeg: { mass: a.left_leg_mass, percent: a.left_leg_percent },
    }));

    const systemPrompt = analyses.length > 1
      ? `Ты эксперт по фитнесу и анализу состава тела. Проанализируй прогрессию результатов InBody измерений пользователя.

Дай подробный анализ:
1. **Общая динамика**: как изменились ключевые показатели (вес, % жира, мышечная масса)
2. **Положительные изменения**: что улучшилось и насколько
3. **Проблемные зоны**: что требует внимания
4. **Сегментарный анализ**: как изменился состав тела по сегментам (руки, туловище, ноги)
5. **Рекомендации**: конкретные советы по тренировкам и питанию на основе прогрессии

Отвечай на русском языке, структурировано и понятно. Используй эмодзи для наглядности.`
      : `Ты эксперт по фитнесу и анализу состава тела. Проанализируй результат InBody измерения пользователя.

Дай подробный анализ:
1. **Текущее состояние**: оценка основных показателей (вес, % жира, мышечная масса, висцеральный жир)
2. **Сильные стороны**: что хорошо
3. **Зоны для улучшения**: на что обратить внимание
4. **Сегментарный анализ**: оценка баланса развития мышц по сегментам
5. **Рекомендации**: конкретные советы по тренировкам и питанию

Отвечай на русском языке, структурировано и понятно. Используй эмодзи для наглядности.`;

    console.log('Calling Lovable AI for analysis...');

    const aiClient = createAIClient(AIProvider.LOVABLE);
    const aiData = await aiClient.complete({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Данные InBody измерений:\n\n${JSON.stringify(analysisData, null, 2)}` },
      ],
    });

    const analysis = aiData.content;

    if (!analysis) {
      throw new Error('No analysis returned from AI');
    }

    console.log('AI analysis completed successfully');

    return new Response(
      JSON.stringify({ 
        analysis,
        measurementsCount: analyses.length,
        latestDate: analyses[analyses.length - 1].test_date,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('analyze-inbody error:', error);
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
