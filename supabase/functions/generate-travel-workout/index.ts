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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { 
      durationMinutes = 45,
      equipment = 'bodyweight',
      focusMuscles = [],
      gapAnalysis = null
    } = await req.json();

    console.log(`Generating travel workout for user ${user.id}: ${durationMinutes}min, equipment: ${equipment}`);

    // Получаем историю тренировок за последние 60 дней для контекста
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 60);
    const startDateStr = startDate.toISOString().split('T')[0];

    const { data: workoutLogs, error: workoutError } = await supabaseClient
      .from('workout_logs')
      .select('id, workout_date, exercises, workout_type, duration_minutes, notes')
      .eq('user_id', user.id)
      .gte('workout_date', startDateStr)
      .order('workout_date', { ascending: false })
      .limit(20);

    if (workoutError) {
      console.error('Error fetching workout logs:', workoutError);
    }

    // Собираем уникальные упражнения с весами
    const exerciseHistory: Record<string, {
      name: string;
      maxWeight: number;
      maxReps: number;
      avgSets: number;
      lastUsed: string;
      frequency: number;
    }> = {};

    for (const workout of workoutLogs || []) {
      const exercises = workout.exercises as Array<{
        name: string;
        sets?: Array<{ weight?: number; reps?: number }>;
      }> | null;

      if (!exercises) continue;

      for (const exercise of exercises) {
        const name = exercise.name;
        if (!exerciseHistory[name]) {
          exerciseHistory[name] = {
            name,
            maxWeight: 0,
            maxReps: 0,
            avgSets: 0,
            lastUsed: workout.workout_date,
            frequency: 0
          };
        }

        exerciseHistory[name].frequency++;
        if (workout.workout_date > exerciseHistory[name].lastUsed) {
          exerciseHistory[name].lastUsed = workout.workout_date;
        }

        if (exercise.sets) {
          for (const set of exercise.sets) {
            if (set.weight && set.weight > exerciseHistory[name].maxWeight) {
              exerciseHistory[name].maxWeight = set.weight;
            }
            if (set.reps && set.reps > exerciseHistory[name].maxReps) {
              exerciseHistory[name].maxReps = set.reps;
            }
          }
          exerciseHistory[name].avgSets = Math.round(
            (exerciseHistory[name].avgSets * (exerciseHistory[name].frequency - 1) + exercise.sets.length) /
            exerciseHistory[name].frequency
          );
        }
      }
    }

    // Формируем историю упражнений для промпта
    const exerciseHistoryText = Object.values(exerciseHistory)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 30)
      .map(ex => {
        const weightInfo = ex.maxWeight > 0 ? `макс. ${ex.maxWeight}кг x ${ex.maxReps}` : 'без веса';
        return `- ${ex.name}: ${weightInfo}, ~${ex.avgSets} подходов (выполнялось ${ex.frequency} раз)`;
      })
      .join('\n');

    // Формируем информацию о пробелах
    let gapsText = '';
    if (gapAnalysis?.muscleAnalysis) {
      const neglected = Object.entries(gapAnalysis.muscleAnalysis)
        .filter(([_, a]: [string, any]) => a.status === 'neglected' || a.status === 'never')
        .map(([group, a]: [string, any]) => `${a.name} (${a.daysSince ? a.daysSince + ' дней' : 'нет данных'})`);
      
      if (neglected.length > 0) {
        gapsText = `\n\nПРОБЕЛЫ В ТРЕНИРОВКАХ (давно не тренировались):\n${neglected.join(', ')}`;
      }
    }

    // Формируем информацию о фокусе
    const focusText = focusMuscles.length > 0
      ? `\n\nПОЛЬЗОВАТЕЛЬ ХОЧЕТ СФОКУСИРОВАТЬСЯ НА: ${focusMuscles.join(', ')}`
      : '';

    // Маппинг оборудования
    const equipmentMap: Record<string, string> = {
      'bodyweight': 'только собственный вес (без оборудования)',
      'dumbbells': 'гантели',
      'resistance_bands': 'резиновые ленты',
      'full_gym': 'полный зал (любое оборудование)',
      'hotel_gym': 'базовый зал в отеле (беговая дорожка, гантели до 20кг, базовые тренажеры)'
    };

    const equipmentText = equipmentMap[equipment] || equipment;

    const systemPrompt = `Ты опытный персональный тренер. Твоя задача — составить эффективную тренировку для клиента, который находится в поездке.

Правила:
1. Используй упражнения из истории клиента когда это возможно — это упражнения, которые он уже освоил с тренером
2. Адаптируй упражнения под доступное оборудование
3. Приоритет отдавай группам мышц, которые давно не тренировались
4. Включи разминку и заминку
5. Указывай конкретные веса/повторения на основе истории клиента

Ответ ОБЯЗАТЕЛЬНО в формате JSON:
{
  "workout_name": "Название тренировки",
  "duration_minutes": число,
  "target_muscles": ["группа1", "группа2"],
  "warmup": [
    { "name": "название", "duration": "время", "notes": "комментарий" }
  ],
  "exercises": [
    {
      "name": "название упражнения",
      "sets": число,
      "reps": "12-15" или "30 сек",
      "weight": "20кг" или "собственный вес",
      "rest": "60 сек",
      "notes": "комментарий или замена",
      "based_on": "на основе какого упражнения из истории (если есть)"
    }
  ],
  "cooldown": [
    { "name": "название", "duration": "время" }
  ],
  "rationale": "Почему выбраны именно эти упражнения (2-3 предложения)"
}`;

    const userPrompt = `ИСТОРИЯ УПРАЖНЕНИЙ КЛИЕНТА (тренировки с персональным тренером):
${exerciseHistoryText || 'Нет данных об упражнениях'}
${gapsText}
${focusText}

ПАРАМЕТРЫ ТРЕНИРОВКИ:
- Длительность: ${durationMinutes} минут
- Доступное оборудование: ${equipmentText}

Составь сбалансированную тренировку, учитывая историю клиента и его пробелы.`;

    console.log('Sending request to AI...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Слишком много запросов. Попробуйте позже.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Требуется пополнение баланса AI.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from AI');
    }

    console.log('AI response received, parsing...');

    // Парсим JSON из ответа
    let workout;
    try {
      // Ищем JSON в ответе
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        workout = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse workout from AI response');
    }

    // Добавляем метаданные
    workout.generated_at = new Date().toISOString();
    workout.equipment = equipment;
    workout.requested_duration = durationMinutes;

    console.log(`Workout generated: ${workout.workout_name}, ${workout.exercises?.length || 0} exercises`);

    return new Response(JSON.stringify(workout), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in generate-travel-workout:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
