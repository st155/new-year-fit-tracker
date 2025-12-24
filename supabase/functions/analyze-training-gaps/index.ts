import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Группы мышц с ключевыми словами для маппинга
const MUSCLE_GROUPS = {
  chest: {
    name: 'Грудь',
    icon: '💪',
    keywords: ['chest', 'грудь', 'pec', 'bench', 'жим лежа', 'push-up', 'отжимания', 'fly', 'разводка']
  },
  back: {
    name: 'Спина',
    icon: '🔙',
    keywords: ['back', 'спина', 'lat', 'row', 'тяга', 'pull-up', 'подтягивания', 'deadlift', 'становая']
  },
  legs: {
    name: 'Ноги',
    icon: '🦵',
    keywords: ['leg', 'ноги', 'squat', 'присед', 'lunge', 'выпад', 'quad', 'hamstring', 'glute', 'ягодиц', 'бедр', 'икр', 'calf', 'hip thrust']
  },
  shoulders: {
    name: 'Плечи',
    icon: '🎯',
    keywords: ['shoulder', 'плеч', 'delt', 'overhead', 'жим стоя', 'lateral', 'raise', 'махи', 'шраги', 'shrug']
  },
  arms: {
    name: 'Руки',
    icon: '💪',
    keywords: ['arm', 'рук', 'bicep', 'бицепс', 'tricep', 'трицепс', 'curl', 'extension', 'французский']
  },
  core: {
    name: 'Кор',
    icon: '🔥',
    keywords: ['core', 'кор', 'abs', 'пресс', 'plank', 'планка', 'crunch', 'скручивания', 'oblique']
  }
};

// Wellness активности для отслеживания
const WELLNESS_ACTIVITIES = {
  stretching: { name: 'Растяжка', icon: '🧘', recommendedDays: 3 },
  massage: { name: 'Массаж', icon: '💆', recommendedDays: 7 },
  sauna: { name: 'Сауна', icon: '🧖', recommendedDays: 7 },
  swimming: { name: 'Плавание', icon: '🏊', recommendedDays: 7 },
  yoga: { name: 'Йога', icon: '🧘‍♂️', recommendedDays: 4 },
  meditation: { name: 'Медитация', icon: '🧠', recommendedDays: 2 },
  cold_plunge: { name: 'Холодные процедуры', icon: '🧊', recommendedDays: 3 },
  walking: { name: 'Прогулка', icon: '🚶', recommendedDays: 1 }
};

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-zа-яё0-9\s]/g, '').trim();
}

function mapExerciseToMuscleGroups(exerciseName: string): string[] {
  const normalized = normalizeText(exerciseName);
  const matched: string[] = [];
  
  for (const [group, data] of Object.entries(MUSCLE_GROUPS)) {
    const hasMatch = data.keywords.some(keyword => 
      normalized.includes(keyword.toLowerCase()) ||
      keyword.toLowerCase().includes(normalized)
    );
    if (hasMatch) {
      matched.push(group);
    }
  }
  
  return matched;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
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

    const { lookbackDays = 21 } = await req.json().catch(() => ({}));

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - lookbackDays);
    const startDateStr = startDate.toISOString().split('T')[0];

    console.log(`Analyzing training gaps for user ${user.id} from ${startDateStr}`);

    // Получаем историю тренировок
    const { data: workoutLogs, error: workoutError } = await supabaseClient
      .from('workout_logs')
      .select('id, workout_date, exercises, workout_type, duration_minutes')
      .eq('user_id', user.id)
      .gte('workout_date', startDateStr)
      .order('workout_date', { ascending: false });

    if (workoutError) {
      console.error('Error fetching workout logs:', workoutError);
      throw workoutError;
    }

    // Получаем wellness активности
    const { data: wellnessActivities, error: wellnessError } = await supabaseClient
      .from('wellness_activities')
      .select('id, activity_type, scheduled_date, is_completed, duration_minutes')
      .eq('user_id', user.id)
      .eq('is_completed', true)
      .gte('scheduled_date', startDateStr)
      .order('scheduled_date', { ascending: false });

    if (wellnessError) {
      console.error('Error fetching wellness activities:', wellnessError);
    }

    const today = new Date();
    const muscleAnalysis: Record<string, {
      name: string;
      icon: string;
      lastTrained: string | null;
      daysSince: number | null;
      status: 'recent' | 'due_soon' | 'neglected' | 'never';
      trainedCount: number;
      exercises: string[];
    }> = {};

    // Инициализируем анализ групп мышц
    for (const [group, data] of Object.entries(MUSCLE_GROUPS)) {
      muscleAnalysis[group] = {
        name: data.name,
        icon: data.icon,
        lastTrained: null,
        daysSince: null,
        status: 'never',
        trainedCount: 0,
        exercises: []
      };
    }

    // Анализируем тренировки
    for (const workout of workoutLogs || []) {
      const exercises = workout.exercises as Array<{ name: string }> | null;
      if (!exercises) continue;

      const workoutDate = workout.workout_date;

      for (const exercise of exercises) {
        const muscleGroups = mapExerciseToMuscleGroups(exercise.name);
        
        for (const group of muscleGroups) {
          if (muscleAnalysis[group]) {
            muscleAnalysis[group].trainedCount++;
            if (!muscleAnalysis[group].exercises.includes(exercise.name)) {
              muscleAnalysis[group].exercises.push(exercise.name);
            }
            
            if (!muscleAnalysis[group].lastTrained || workoutDate > muscleAnalysis[group].lastTrained) {
              muscleAnalysis[group].lastTrained = workoutDate;
            }
          }
        }
      }
    }

    // Вычисляем статус для каждой группы мышц
    for (const group of Object.keys(muscleAnalysis)) {
      const analysis = muscleAnalysis[group];
      
      if (analysis.lastTrained) {
        const lastDate = new Date(analysis.lastTrained);
        const diffTime = Math.abs(today.getTime() - lastDate.getTime());
        analysis.daysSince = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (analysis.daysSince <= 3) {
          analysis.status = 'recent';
        } else if (analysis.daysSince <= 7) {
          analysis.status = 'due_soon';
        } else {
          analysis.status = 'neglected';
        }
      }
    }

    // Анализируем wellness активности
    const wellnessAnalysis: Record<string, {
      name: string;
      icon: string;
      lastDone: string | null;
      daysSince: number | null;
      status: 'recent' | 'due_soon' | 'overdue' | 'never';
      recommendedFrequency: number;
      completedCount: number;
    }> = {};

    for (const [activity, data] of Object.entries(WELLNESS_ACTIVITIES)) {
      wellnessAnalysis[activity] = {
        name: data.name,
        icon: data.icon,
        lastDone: null,
        daysSince: null,
        status: 'never',
        recommendedFrequency: data.recommendedDays,
        completedCount: 0
      };
    }

    for (const activity of wellnessActivities || []) {
      const type = activity.activity_type?.toLowerCase();
      if (wellnessAnalysis[type]) {
        wellnessAnalysis[type].completedCount++;
        
        if (!wellnessAnalysis[type].lastDone || activity.scheduled_date > wellnessAnalysis[type].lastDone) {
          wellnessAnalysis[type].lastDone = activity.scheduled_date;
        }
      }
    }

    // Вычисляем статус для wellness
    for (const activity of Object.keys(wellnessAnalysis)) {
      const analysis = wellnessAnalysis[activity];
      
      if (analysis.lastDone) {
        const lastDate = new Date(analysis.lastDone);
        const diffTime = Math.abs(today.getTime() - lastDate.getTime());
        analysis.daysSince = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (analysis.daysSince <= analysis.recommendedFrequency) {
          analysis.status = 'recent';
        } else if (analysis.daysSince <= analysis.recommendedFrequency * 2) {
          analysis.status = 'due_soon';
        } else {
          analysis.status = 'overdue';
        }
      }
    }

    // Генерируем рекомендации
    const recommendations: Array<{
      type: 'warning' | 'info' | 'success';
      category: 'muscle' | 'wellness';
      target: string;
      message: string;
      priority: number;
    }> = [];

    // Рекомендации по группам мышц
    for (const [group, analysis] of Object.entries(muscleAnalysis)) {
      if (analysis.status === 'neglected') {
        recommendations.push({
          type: 'warning',
          category: 'muscle',
          target: group,
          message: `${analysis.icon} ${analysis.name} не тренировалась ${analysis.daysSince} дней — добавь упражнения на эту группу`,
          priority: 1
        });
      } else if (analysis.status === 'never') {
        recommendations.push({
          type: 'info',
          category: 'muscle',
          target: group,
          message: `${analysis.icon} ${analysis.name} — нет данных о тренировках за последние ${lookbackDays} дней`,
          priority: 2
        });
      }
    }

    // Рекомендации по wellness
    for (const [activity, analysis] of Object.entries(wellnessAnalysis)) {
      if (analysis.status === 'overdue' && analysis.completedCount > 0) {
        recommendations.push({
          type: 'warning',
          category: 'wellness',
          target: activity,
          message: `${analysis.icon} ${analysis.name} давно пропущена (${analysis.daysSince} дней) — запланируй на эту неделю`,
          priority: 1
        });
      }
    }

    // Сортируем рекомендации по приоритету
    recommendations.sort((a, b) => a.priority - b.priority);

    // Определяем фокус на неделю
    const suggestedWeekFocus = [
      ...Object.entries(muscleAnalysis)
        .filter(([_, a]) => a.status === 'neglected' || a.status === 'never')
        .map(([group]) => group),
      ...Object.entries(wellnessAnalysis)
        .filter(([_, a]) => a.status === 'overdue')
        .map(([activity]) => activity)
    ].slice(0, 5);

    // Статистика за период
    const stats = {
      totalWorkouts: workoutLogs?.length || 0,
      totalWellnessActivities: wellnessActivities?.length || 0,
      periodDays: lookbackDays,
      avgWorkoutsPerWeek: Math.round(((workoutLogs?.length || 0) / lookbackDays) * 7 * 10) / 10
    };

    const result = {
      muscleAnalysis,
      wellnessAnalysis,
      recommendations: recommendations.slice(0, 6),
      suggestedWeekFocus,
      stats,
      analyzedAt: new Date().toISOString()
    };

    console.log(`Analysis complete: ${Object.keys(muscleAnalysis).length} muscle groups, ${recommendations.length} recommendations`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in analyze-training-gaps:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
