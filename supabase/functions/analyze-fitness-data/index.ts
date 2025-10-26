import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from '../_shared/cors.ts';
import { createAIClient, AIProvider } from '../_shared/ai-client.ts';
import { Logger } from '../_shared/monitoring.ts';
import { withRateLimit } from '../_shared/rate-limiting.ts';
import { EdgeFunctionError, ErrorCode } from '../_shared/error-handling.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const logger = new Logger('analyze-fitness-data');

  try {
    const { imageUrl, userId, goalId, measurementDate, specializedAnalysis } = await req.json();
    
    if (!imageUrl || !userId) {
      throw new EdgeFunctionError(
        ErrorCode.VALIDATION_ERROR,
        'Missing imageUrl or userId',
        400
      );
    }

    // Validate image URL
    if (imageUrl === 'test-url' || !imageUrl.startsWith('http')) {
      throw new EdgeFunctionError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid image URL. Please provide a valid URL starting with http or https',
        400
      );
    }

    // Rate limiting: 100 requests/minute per user
    await withRateLimit(userId, 100, 60);

    await logger.info('Starting fitness data analysis', { 
      imageUrl, 
      userId, 
      specializedAnalysis 
    });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build specialized prompt
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

    // Use Lovable AI with Gemini 2.5 Pro for vision
    const aiClient = createAIClient(AIProvider.LOVABLE);
    
    const aiResponse = await aiClient.complete({
      messages: [
        {
          role: 'user',
          content: analysisPrompt + `\n\nImage URL: ${imageUrl}`
        }
      ],
      temperature: 0.1,
      maxTokens: 1000
    });

    const analysisText = aiResponse.content;
    await logger.info('AI analysis completed', { provider: aiResponse.provider });

    // Parse JSON response
    let analysisData;
    try {
      const cleanedResponse = analysisText.replace(/```json\n?|\n?```/g, '').trim();
      analysisData = JSON.parse(cleanedResponse);
    } catch (parseError) {
      await logger.error('Failed to parse AI response', { error: parseError });
      throw new EdgeFunctionError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to parse analysis result'
      );
    }

    // Return early if low quality or no data
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

    // Get user goals for matching
    const { data: userGoals, error: goalsError } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId);

    if (goalsError) {
      await logger.error('Error fetching user goals', { error: goalsError });
    }

    // Save extracted data as measurements
    const savedMeasurements = [];
    const savedMetrics = [];
    
    for (const dataPoint of analysisData.extractedData) {
      if (dataPoint.confidence < 0.6) {
        await logger.info(`Skipping low confidence data: ${dataPoint.metric} (${dataPoint.confidence})`);
        continue;
      }

      const metricCategory = categorizeMetric(dataPoint.metric);
      
      // Create or get metric
      const { data: metricData, error: metricError } = await supabase
        .rpc('create_or_get_metric', {
          p_user_id: userId,
          p_metric_name: dataPoint.metric,
          p_metric_category: metricCategory,
          p_unit: dataPoint.unit,
          p_source: 'ai_analysis'
        });

      if (metricError) {
        await logger.error('Error creating/getting metric', { error: metricError });
        continue;
      }

      const metricId = metricData;

      // Save metric value
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
        await logger.error('Error saving metric value', { error: metricValueError });
      } else {
        savedMetrics.push({
          ...dataPoint,
          metricId,
          valueId: metricValue?.id,
          category: metricCategory
        });
      }

      // Match to goal and save in measurements table
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

          if (!measurementError) {
            savedMeasurements.push({
              ...dataPoint,
              measurementId: measurement?.id,
              goalMatched: true
            });
          }
        } catch (saveError) {
          await logger.error('Error saving measurement', { error: saveError });
        }
      }
    }

    // Update body composition if relevant data exists
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
        if (metric.includes('вес')) bodyData.weight = data.value;
        else if (metric.includes('жир')) bodyData.body_fat_percentage = data.value;
        else if (metric.includes('мышечная')) bodyData.muscle_mass = data.value;
      });

      try {
        await supabase.from('body_composition').insert(bodyData);
      } catch (bodyError) {
        await logger.error('Error saving body composition', { error: bodyError });
      }
    }

    await logger.info('Analysis completed successfully', {
      savedMeasurements: savedMeasurements.length,
      savedMetrics: savedMetrics.length
    });

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

  } catch (error: any) {
    await logger.error('Error in analyze-fitness-data', { error });
    
    // Handle known errors
    if (error instanceof EdgeFunctionError) {
      return new Response(JSON.stringify({ 
        error: error.message,
        code: error.code,
        success: false
      }), {
        status: error.statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Handle generic errors
    let errorMessage = 'Internal server error';
    if (error?.message?.includes('quota')) {
      errorMessage = 'AI quota exceeded. Please contact support.';
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
