import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting fitness data analysis...');
    
    const { imageUrl, userId, goalId, measurementDate } = await req.json();
    
    if (!imageUrl || !userId) {
      return new Response(JSON.stringify({ error: 'Missing imageUrl or userId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Analyzing image:', imageUrl);
    console.log('For user:', userId);

    // Создаем Supabase клиент
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Анализируем изображение с помощью ChatGPT Vision
    const analysisPrompt = `
Проанализируй это изображение скриншота фитнес-трекера или приложения здоровья. 
Извлеки следующие данные, если они есть на изображении:

1. Вес тела (в кг)
2. Процент жира в организме (%)
3. Мышечная масса (кг или %)
4. Количество шагов
5. Пульс/ЧСС
6. Калории (сожженные)
7. Время тренировки (минуты)
8. Расстояние (км)
9. Подтягивания (количество)
10. Отжимания (количество)
11. Приседания (количество)
12. Любые другие спортивные показатели

Верни ответ ТОЛЬКО в JSON формате без дополнительного текста:
{
  "extractedData": [
    {
      "metric": "название показателя",
      "value": числовое_значение,
      "unit": "единица_измерения",
      "confidence": уверенность_от_0_до_1
    }
  ],
  "analysis": "краткий анализ изображения",
  "dataQuality": "high/medium/low"
}

Если на изображении нет данных фитнес-трекера, верни:
{
  "extractedData": [],
  "analysis": "Изображение не содержит данных фитнес-трекера",
  "dataQuality": "low"
}
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: analysisPrompt },
              { 
                type: 'image_url', 
                image_url: { 
                  url: imageUrl,
                  detail: 'high'
                } 
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const aiResponse = await response.json();
    console.log('AI Response:', aiResponse);
    
    const analysisText = aiResponse.choices[0].message.content;
    console.log('Analysis text:', analysisText);
    
    // Парсим JSON ответ от ChatGPT
    let analysisData;
    try {
      // Очищаем ответ от markdown если есть
      const cleanedResponse = analysisText.replace(/```json\n?|\n?```/g, '').trim();
      analysisData = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to parse analysis result');
    }

    console.log('Parsed analysis data:', analysisData);

    // Если данные низкого качества или пусты, возвращаем результат без сохранения
    if (analysisData.dataQuality === 'low' || !analysisData.extractedData || analysisData.extractedData.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        analysis: analysisData,
        saved: false,
        message: 'Данные не найдены или качество изображения низкое'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Получаем цели пользователя для сопоставления
    const { data: userGoals, error: goalsError } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId);

    if (goalsError) {
      console.error('Error fetching user goals:', goalsError);
    }

    console.log('User goals:', userGoals);

    // Сохраняем извлеченные данные как измерения
    const savedMeasurements = [];
    
    for (const dataPoint of analysisData.extractedData) {
      if (dataPoint.confidence < 0.6) {
        console.log(`Skipping low confidence data: ${dataPoint.metric} (${dataPoint.confidence})`);
        continue;
      }

      // Ищем подходящую цель по названию метрики
      let matchingGoal = null;
      
      if (userGoals) {
        const metricLower = dataPoint.metric.toLowerCase();
        matchingGoal = userGoals.find(goal => {
          const goalNameLower = goal.goal_name.toLowerCase();
          return goalNameLower.includes(metricLower) || 
                 metricLower.includes(goalNameLower) ||
                 (metricLower.includes('вес') && goalNameLower.includes('вес')) ||
                 (metricLower.includes('жир') && goalNameLower.includes('жир')) ||
                 (metricLower.includes('подтягивания') && goalNameLower.includes('подтягивания')) ||
                 (metricLower.includes('отжимания') && goalNameLower.includes('отжимания'));
        });
      }

      try {
        // Сохраняем измерение
        const { data: measurement, error: measurementError } = await supabase
          .from('measurements')
          .insert({
            user_id: userId,
            goal_id: matchingGoal?.id || goalId,
            value: dataPoint.value,
            unit: dataPoint.unit,
            measurement_date: measurementDate || new Date().toISOString().split('T')[0],
            notes: `Автоматически извлечено из изображения. Уверенность: ${(dataPoint.confidence * 100).toFixed(1)}%`,
            photo_url: imageUrl
          })
          .select()
          .single();

        if (measurementError) {
          console.error('Error saving measurement:', measurementError);
        } else {
          console.log('Saved measurement:', measurement);
          savedMeasurements.push({
            ...dataPoint,
            measurementId: measurement?.id,
            goalMatched: !!matchingGoal
          });
        }
      } catch (saveError) {
        console.error('Error saving measurement:', saveError);
      }
    }

    // Обновляем композицию тела если есть соответствующие данные
    const bodyCompositionData = analysisData.extractedData.filter(d => 
      ['вес', 'процент жира', 'мышечная масса'].some(metric => 
        d.metric.toLowerCase().includes(metric)
      )
    );

    if (bodyCompositionData.length > 0) {
      const bodyData: any = {
        user_id: userId,
        measurement_date: measurementDate || new Date().toISOString().split('T')[0],
        photo_after_url: imageUrl
      };

      bodyCompositionData.forEach(data => {
        const metric = data.metric.toLowerCase();
        if (metric.includes('вес')) {
          bodyData.weight = data.value;
        } else if (metric.includes('жир')) {
          bodyData.body_fat_percentage = data.value;
        } else if (metric.includes('мышечная')) {
          bodyData.muscle_mass = data.value;
        }
      });

      try {
        const { error: bodyError } = await supabase
          .from('body_composition')
          .insert(bodyData);

        if (bodyError) {
          console.error('Error saving body composition:', bodyError);
        } else {
          console.log('Saved body composition data');
        }
      } catch (bodyError) {
        console.error('Error saving body composition:', bodyError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      analysis: analysisData,
      savedMeasurements,
      saved: savedMeasurements.length > 0,
      message: `Сохранено ${savedMeasurements.length} измерений из ${analysisData.extractedData.length} найденных показателей`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in analyze-fitness-data function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});