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
    
    const { imageUrl, userId, goalId, measurementDate, specializedAnalysis } = await req.json();
    
    if (!imageUrl || !userId) {
      return new Response(JSON.stringify({ error: 'Missing imageUrl or userId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Проверяем валидность URL изображения
    if (imageUrl === 'test-url' || !imageUrl.startsWith('http')) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid image URL provided',
          message: 'Please provide a valid image URL starting with http or https'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing image:', imageUrl);
    console.log('For user:', userId);

    // Создаем Supabase клиент
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Создаем специализированный промпт в зависимости от типа анализа
    let analysisPrompt;
    
    if (specializedAnalysis === 'vo2max') {
      analysisPrompt = `
Проанализируй этот скриншот из приложения Whoop на предмет данных VO2Max и других кардиометрик.
Сосредоточься особенно на поиске следующих показателей:

1. VO2Max (мл/кг/мин) - ГЛАВНЫЙ ПРИОРИТЕТ
2. Кардиофитнес/Cardiovascular Fitness
3. Средний пульс (bpm)
4. Максимальный пульс (bpm) 
5. Пульс покоя (bpm)
6. HRV (вариабельность сердечного ритма)
7. Recovery Score (показатель восстановления)
8. Strain (нагрузка)
9. Sleep Performance (качество сна)
10. Любые другие кардиометрики

ОЧЕНЬ ВАЖНО: Ищи VO2Max в разных форматах:
- "VO2 Max: 45.2 ml/kg/min"
- "VO₂ Max 45.2"
- "Cardiovascular Fitness: 45.2"
- Числовые значения рядом с иконками сердца
- Графики с трендами VO2Max

Верни ответ ТОЛЬКО в JSON формате:
{
  "extractedData": [
    {
      "metric": "VO2Max",
      "value": числовое_значение,
      "unit": "мл/кг/мин",
      "confidence": уверенность_от_0_до_1
    }
  ],
  "analysis": "детальный анализ найденных кардиометрик",
  "dataQuality": "high/medium/low"
}

Если VO2Max не найден, но есть другие кардиометрики, всё равно верни их.
Если скриншот не из Whoop или нет кардиометрик, верни пустой extractedData.
`;
    } else {
      // Стандартный промпт для общего анализа фитнес-данных
      analysisPrompt = `
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
9. VO2Max (мл/кг/мин)
10. Подтягивания (количество)
11. Отжимания (количество)
12. Приседания (количество)
13. Любые другие спортивные показатели

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
    }

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
      
      // Более детальная обработка ошибок OpenAI
      if (errorText.includes('insufficient_quota')) {
        throw new Error('OpenAI API quota exceeded. Please check your billing details.');
      } else if (errorText.includes('invalid_api_key')) {
        throw new Error('Invalid OpenAI API key. Please check your configuration.');
      } else {
        throw new Error(`OpenAI API error: ${errorText}`);
      }
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
    const savedMetrics = [];
    
    for (const dataPoint of analysisData.extractedData) {
      if (dataPoint.confidence < 0.6) {
        console.log(`Skipping low confidence data: ${dataPoint.metric} (${dataPoint.confidence})`);
        continue;
      }

      // Определяем категорию метрики
      const metricCategory = categorizeMetric(dataPoint.metric);
      
      // Автоматически создаем или получаем метрику в системе
      const { data: metricData, error: metricError } = await supabase
        .rpc('create_or_get_metric', {
          p_user_id: userId,
          p_metric_name: dataPoint.metric,
          p_metric_category: metricCategory,
          p_unit: dataPoint.unit,
          p_source: 'ai_analysis'
        });

      if (metricError) {
        console.error('Error creating/getting metric:', metricError);
        continue;
      }

      const metricId = metricData;

      // Сохраняем значение метрики в metric_values
      const { data: metricValue, error: metricValueError } = await supabase
        .from('metric_values')
        .insert({
          user_id: userId,
          metric_id: metricId,
          value: dataPoint.value,
          measurement_date: measurementDate || new Date().toISOString().split('T')[0],
          notes: `ИИ-анализ скриншота. Уверенность: ${(dataPoint.confidence * 100).toFixed(1)}%`,
          photo_url: imageUrl,
          external_id: `ai_${imageUrl.split('/').pop()}_${dataPoint.metric}_${measurementDate}`,
          source_data: {
            confidence: dataPoint.confidence,
            analysis_type: 'ai_screenshot',
            original_metric: dataPoint.metric
          }
        })
        .select()
        .single();

      if (metricValueError) {
        console.error('Error saving metric value:', metricValueError);
      } else {
        console.log('Saved metric value:', metricValue);
        savedMetrics.push({
          ...dataPoint,
          metricId,
          valueId: metricValue?.id,
          category: metricCategory
        });
      }

      // Ищем подходящую цель по названию метрики для measurements таблицы
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
                 (metricLower.includes('отжимания') && goalNameLower.includes('отжимания')) ||
                 (metricLower.includes('vo2') && goalNameLower.includes('vo')) ||
                 (metricLower.includes('vo2max') && goalNameLower.includes('vo₂max'));
        });
      }

      // Если есть подходящая цель, сохраняем также в measurements
      if (matchingGoal) {
        try {
          const { data: measurement, error: measurementError } = await supabase
            .from('measurements')
            .insert({
              user_id: userId,
              goal_id: matchingGoal.id,
              value: dataPoint.value,
              unit: dataPoint.unit,
              measurement_date: measurementDate || new Date().toISOString().split('T')[0],
              notes: `Автоматически извлечено из изображения. Уверенность: ${(dataPoint.confidence * 100).toFixed(1)}%`,
              photo_url: imageUrl,
              source: 'ai_analysis'
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
              goalMatched: true
            });
          }
        } catch (saveError) {
          console.error('Error saving measurement:', saveError);
        }
      }
    }

    // Обновляем композицию тела если есть соответствующие данные
    const bodyCompositionData = analysisData.extractedData.filter((d: any) => 
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

      bodyCompositionData.forEach((data: any) => {
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
      savedMetrics,
      saved: savedMeasurements.length > 0 || savedMetrics.length > 0,
      message: `Сохранено ${savedMeasurements.length} измерений для целей и ${savedMetrics.length} общих метрик из ${analysisData.extractedData.length} найденных показателей`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});

function categorizeMetric(metricName: string): string {
  const nameLower = metricName.toLowerCase();
  
  if (nameLower.includes('vo2') || nameLower.includes('кардио') || nameLower.includes('cardiovascular')) {
    return 'cardio';
  }
  if (nameLower.includes('recovery') || nameLower.includes('восстановление') || nameLower.includes('hrv')) {
    return 'recovery';
  }
  if (nameLower.includes('sleep') || nameLower.includes('сон') || nameLower.includes('rem')) {
    return 'sleep';
  }
  if (nameLower.includes('workout') || nameLower.includes('тренировка') || nameLower.includes('strain') || 
      nameLower.includes('exercise') || nameLower.includes('activity')) {
    return 'workout';
  }
  if (nameLower.includes('heart') || nameLower.includes('пульс') || nameLower.includes('bpm') ||
      nameLower.includes('кровяное') || nameLower.includes('давление')) {
    return 'health';
  }
  if (nameLower.includes('weight') || nameLower.includes('вес') || nameLower.includes('жир') ||
      nameLower.includes('мышечная') || nameLower.includes('калории') || nameLower.includes('шаги')) {
    return 'fitness';
  }
  
  return 'fitness'; // default category
}

  } catch (error: any) {
    console.error('Error in analyze-fitness-data function:', error);
    
    // Более понятные сообщения об ошибках для пользователя
    let errorMessage = 'Internal server error';
    if (error?.message?.includes('quota')) {
      errorMessage = 'OpenAI API quota exceeded. Please contact support.';
    } else if (error?.message?.includes('api_key')) {
      errorMessage = 'API configuration error. Please contact support.';
    } else if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
      errorMessage = 'Network error. Please try again later.';
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: error?.message || 'Unknown error',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});