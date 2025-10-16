import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

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

    console.log('Calling Lovable AI for question...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Данные InBody:\n${JSON.stringify(contextData, null, 2)}\n\nВопрос: ${question}` 
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Превышен лимит запросов к AI. Попробуйте позже.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Требуется пополнение баланса AI. Обратитесь к администратору.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const answer = aiData.choices?.[0]?.message?.content;

    if (!answer) {
      throw new Error('No answer returned from AI');
    }

    console.log('AI answer completed successfully');

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
