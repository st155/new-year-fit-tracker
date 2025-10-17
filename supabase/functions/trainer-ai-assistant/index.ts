import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const tools = [
  {
    type: "function",
    function: {
      name: "update_client_goal",
      description: "Обновить целевое значение цели клиента",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string", description: "ФИО клиента" },
          goal_name: { type: "string", description: "Название цели (например: Подтягивания, Вес, Жим лежа)" },
          new_target_value: { type: "number", description: "Новое целевое значение" },
          new_target_unit: { type: "string", description: "Единица измерения (кг, раз, см)" }
        },
        required: ["client_name", "goal_name", "new_target_value"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_measurement",
      description: "Добавить измерение для клиента по существующей цели",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string", description: "ФИО клиента" },
          goal_name: { type: "string", description: "Название цели" },
          value: { type: "number", description: "Значение измерения" },
          unit: { type: "string", description: "Единица измерения" },
          date: { type: "string", description: "Дата в формате YYYY-MM-DD или 'today'" },
          notes: { type: "string", description: "Дополнительные заметки" }
        },
        required: ["client_name", "goal_name", "value", "unit"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_training_plan",
      description: "Создать тренировочный план для клиента",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string", description: "ФИО клиента" },
          plan_name: { type: "string", description: "Название плана" },
          duration_weeks: { type: "number", description: "Длительность в неделях" },
          description: { type: "string", description: "Описание плана" }
        },
        required: ["client_name", "plan_name", "duration_weeks"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_client_progress",
      description: "Получить информацию о прогрессе клиента по целям",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string", description: "ФИО клиента" },
          period_days: { type: "number", description: "За сколько дней смотреть прогресс", default: 30 }
        },
        required: ["client_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_clients_needing_attention",
      description: "Получить список клиентов, которым нужно внимание тренера",
      parameters: {
        type: "object",
        properties: {
          criteria: { 
            type: "string", 
            enum: ["no_recent_updates", "low_progress", "all"],
            description: "Критерий отбора клиентов"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_client_task",
      description: "Добавить задачу для клиента",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string", description: "ФИО клиента" },
          title: { type: "string", description: "Название задачи" },
          description: { type: "string", description: "Описание задачи" },
          deadline: { type: "string", description: "Дедлайн в формате YYYY-MM-DD" },
          priority: { type: "string", enum: ["low", "normal", "high", "urgent"], description: "Приоритет" }
        },
        required: ["client_name", "title"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "parse_client_goals_and_progress",
      description: "Автоматически распознать и добавить цели и прогресс клиента из произвольного текста. Использовать когда тренер присылает неструктурированный текст с целями участника.",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string", description: "ФИО клиента (извлечь из текста)" },
          raw_text: { type: "string", description: "Полный текст с целями и результатами" }
        },
        required: ["client_name", "raw_text"]
      }
    }
  }
];

async function findClientByName(supabase: any, trainerId: string, clientName: string) {
  const { data: clients } = await supabase
    .from('trainer_clients')
    .select('client_id, profiles!trainer_clients_client_id_fkey(user_id, username, full_name)')
    .eq('trainer_id', trainerId)
    .eq('active', true);

  if (!clients || clients.length === 0) return null;

  const nameLower = clientName.toLowerCase();
  const found = clients.find((c: any) => {
    const profile = c.profiles;
    if (!profile) return false;
    const fullName = profile.full_name?.toLowerCase() || '';
    const username = profile.username?.toLowerCase() || '';
    return fullName.includes(nameLower) || username.includes(nameLower);
  });

  return found?.profiles?.user_id || null;
}

async function updateClientGoal(supabase: any, trainerId: string, params: any) {
  const clientId = await findClientByName(supabase, trainerId, params.client_name);
  if (!clientId) {
    return { success: false, error: `Клиент "${params.client_name}" не найден среди ваших подопечных` };
  }

  const { data: goals } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', clientId)
    .ilike('goal_name', `%${params.goal_name}%`);

  if (!goals || goals.length === 0) {
    return { success: false, error: `Цель "${params.goal_name}" не найдена у клиента` };
  }

  const goal = goals[0];
  const oldValue = goal.target_value;

  const { error } = await supabase
    .from('goals')
    .update({ 
      target_value: params.new_target_value,
      target_unit: params.new_target_unit || goal.target_unit
    })
    .eq('id', goal.id);

  if (error) {
    return { success: false, error: error.message };
  }

  await supabase.from('ai_action_logs').insert({
    trainer_id: trainerId,
    action_type: 'update_goal',
    action_details: params,
    client_id: clientId,
    success: true
  });

  return { 
    success: true, 
    message: `✅ Цель "${goal.goal_name}" для ${params.client_name} обновлена: ${params.new_target_value} ${params.new_target_unit || goal.target_unit} (было: ${oldValue} ${goal.target_unit})`
  };
}

async function addMeasurement(supabase: any, trainerId: string, params: any) {
  const clientId = await findClientByName(supabase, trainerId, params.client_name);
  if (!clientId) {
    return { success: false, error: `Клиент "${params.client_name}" не найден` };
  }

  const { data: goals } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', clientId)
    .ilike('goal_name', `%${params.goal_name}%`);

  if (!goals || goals.length === 0) {
    return { success: false, error: `Цель "${params.goal_name}" не найдена у клиента` };
  }

  const goal = goals[0];
  const measurementDate = params.date === 'today' ? new Date().toISOString().split('T')[0] : params.date || new Date().toISOString().split('T')[0];

  const { error } = await supabase
    .from('measurements')
    .insert({
      user_id: clientId,
      goal_id: goal.id,
      value: params.value,
      unit: params.unit,
      measurement_date: measurementDate,
      notes: params.notes,
      source: 'trainer'
    });

  if (error) {
    return { success: false, error: error.message };
  }

  await supabase.from('ai_action_logs').insert({
    trainer_id: trainerId,
    action_type: 'add_measurement',
    action_details: params,
    client_id: clientId,
    success: true
  });

  return { 
    success: true, 
    message: `✅ Добавлено измерение для ${params.client_name}: ${goal.goal_name} = ${params.value} ${params.unit}` 
  };
}

async function createTrainingPlan(supabase: any, trainerId: string, params: any) {
  const clientId = await findClientByName(supabase, trainerId, params.client_name);
  if (!clientId) {
    return { success: false, error: `Клиент "${params.client_name}" не найден` };
  }

  const { data: plan, error: planError } = await supabase
    .from('training_plans')
    .insert({
      trainer_id: trainerId,
      name: params.plan_name,
      description: params.description,
      duration_weeks: params.duration_weeks
    })
    .select()
    .single();

  if (planError) {
    return { success: false, error: planError.message };
  }

  const { error: assignError } = await supabase
    .from('assigned_training_plans')
    .insert({
      plan_id: plan.id,
      client_id: clientId,
      start_date: new Date().toISOString().split('T')[0],
      assigned_by: trainerId,
      status: 'active'
    });

  if (assignError) {
    return { success: false, error: assignError.message };
  }

  await supabase.from('ai_action_logs').insert({
    trainer_id: trainerId,
    action_type: 'create_training_plan',
    action_details: params,
    client_id: clientId,
    success: true
  });

  return { 
    success: true, 
    message: `✅ Создан план "${params.plan_name}" для ${params.client_name} (${params.duration_weeks} недель)` 
  };
}

async function getClientProgress(supabase: any, trainerId: string, params: any) {
  const clientId = await findClientByName(supabase, trainerId, params.client_name);
  if (!clientId) {
    return { success: false, error: `Клиент "${params.client_name}" не найден` };
  }

  const periodDays = params.period_days || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);

  const { data: goals } = await supabase
    .from('goals')
    .select('*, measurements(*)')
    .eq('user_id', clientId)
    .order('created_at', { ascending: false });

  if (!goals || goals.length === 0) {
    return { success: false, error: `У клиента нет целей` };
  }

  let progressReport = `📊 Прогресс ${params.client_name} за последние ${periodDays} дней:\n\n`;

  for (const goal of goals) {
    const recentMeasurements = goal.measurements
      .filter((m: any) => new Date(m.measurement_date) >= startDate)
      .sort((a: any, b: any) => new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime());

    if (recentMeasurements.length >= 2) {
      const first = recentMeasurements[0].value;
      const last = recentMeasurements[recentMeasurements.length - 1].value;
      const change = last - first;
      const changePercent = ((change / first) * 100).toFixed(1);
      const arrow = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
      
      progressReport += `${arrow} ${goal.goal_name}: ${first} → ${last} ${goal.target_unit} (${change > 0 ? '+' : ''}${changePercent}%)\n`;
    } else if (recentMeasurements.length === 1) {
      progressReport += `📝 ${goal.goal_name}: ${recentMeasurements[0].value} ${goal.target_unit} (одно измерение)\n`;
    } else {
      progressReport += `⚠️ ${goal.goal_name}: нет измерений за период\n`;
    }
  }

  return { success: true, message: progressReport };
}

async function listClientsNeedingAttention(supabase: any, trainerId: string, params: any) {
  const { data: clients } = await supabase
    .from('trainer_clients')
    .select('client_id, profiles!trainer_clients_client_id_fkey(user_id, username, full_name)')
    .eq('trainer_id', trainerId)
    .eq('active', true);

  if (!clients || clients.length === 0) {
    return { success: false, error: 'У вас нет активных клиентов' };
  }

  const needAttention = [];
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 7);

  for (const client of clients) {
    const clientId = client.profiles.user_id;
    const clientName = client.profiles.full_name || client.profiles.username;

    const { data: recentMeasurements } = await supabase
      .from('measurements')
      .select('measurement_date')
      .eq('user_id', clientId)
      .gte('measurement_date', cutoffDate.toISOString().split('T')[0]);

    if (!recentMeasurements || recentMeasurements.length === 0) {
      needAttention.push(`⚠️ ${clientName} - нет измерений 7+ дней`);
    }
  }

  if (needAttention.length === 0) {
    return { success: true, message: '✅ Все клиенты активны!' };
  }

  return { success: true, message: `Клиенты, требующие внимания:\n\n${needAttention.join('\n')}` };
}

async function addClientTask(supabase: any, trainerId: string, params: any) {
  const clientId = await findClientByName(supabase, trainerId, params.client_name);
  if (!clientId) {
    return { success: false, error: `Клиент "${params.client_name}" не найден` };
  }

  const { error } = await supabase
    .from('client_tasks')
    .insert({
      trainer_id: trainerId,
      client_id: clientId,
      title: params.title,
      description: params.description,
      deadline: params.deadline,
      priority: params.priority || 'normal',
      status: 'pending'
    });

  if (error) {
    return { success: false, error: error.message };
  }

  await supabase.from('ai_action_logs').insert({
    trainer_id: trainerId,
    action_type: 'add_task',
    action_details: params,
    client_id: clientId,
    success: true
  });

  return { 
    success: true, 
    message: `✅ Задача "${params.title}" добавлена для ${params.client_name}` 
  };
}

const exerciseTypeMapping: Record<string, string> = {
  'подтягивания': 'strength',
  'отжимания': 'strength',
  'жим': 'strength',
  'выпады': 'strength',
  'присед': 'strength',
  'становая': 'strength',
  'тяга': 'strength',
  'планка': 'endurance',
  'бег': 'cardio',
  'гребля': 'cardio',
  'плавание': 'cardio',
  'велосипед': 'cardio',
  'vo2max': 'cardio',
  'vo₂max': 'cardio',
  'жир': 'body',
  'вес': 'body',
  'масса': 'body'
};

function detectExerciseType(exerciseName: string): string {
  const nameLower = exerciseName.toLowerCase();
  for (const [keyword, type] of Object.entries(exerciseTypeMapping)) {
    if (nameLower.includes(keyword)) {
      return type;
    }
  }
  return 'custom';
}

function parseTimeToSeconds(timeStr: string): number | null {
  const timeMatch = timeStr.match(/(\d+):(\d+)/);
  if (timeMatch) {
    const minutes = parseInt(timeMatch[1]);
    const seconds = parseInt(timeMatch[2]);
    return minutes * 60 + seconds;
  }
  return null;
}

function formatSecondsToTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

async function parseClientGoalsAndProgress(supabase: any, trainerId: string, params: any) {
  const clientId = await findClientByName(supabase, trainerId, params.client_name);
  if (!clientId) {
    return { success: false, error: `Клиент "${params.client_name}" не найден` };
  }

  const structuringPrompt = `Проанализируй текст с целями и прогрессом клиента. Извлеки структурированную информацию.

Текст:
${params.raw_text}

Для каждого упражнения/показателя определи:
1. Название (как написано в тексте)
2. Целевое значение (target)
3. Текущее значение (current)
4. Единицу измерения (кг, раз, секунды, минуты, %, ml/kg/min и т.д.)

Верни JSON массив объектов в формате:
[
  {
    "name": "название упражнения",
    "target": числовое_значение_цели,
    "current": числовое_значение_текущего,
    "unit": "единица измерения"
  }
]

Правила:
- Время в формате MM:SS конвертируй в секунды (например, "7:30" = 450)
- Проценты оставляй как число (например, "12.5%" = 12.5)
- Вес в кг без изменений
- Если единица не указана, подразумевай "раз"
- Если указаны повторения (например, "×8 раз"), игнорируй их при определении единицы

Верни только JSON массив, без дополнительного текста.`;

  const structuringResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'Ты помощник для извлечения структурированных данных. Отвечай только валидным JSON.' },
        { role: 'user', content: structuringPrompt }
      ],
      temperature: 0.1
    }),
  });

  if (!structuringResponse.ok) {
    return { success: false, error: 'Не удалось распознать структуру данных' };
  }

  const structuringData = await structuringResponse.json();
  const responseText = structuringData.choices[0].message.content;
  
  let parsedGoals;
  try {
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    parsedGoals = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
  } catch (e) {
    console.error('Failed to parse AI response:', responseText);
    return { success: false, error: 'Не удалось распознать данные из текста' };
  }

  const results = {
    created: [] as string[],
    updated: [] as string[],
    measurements: [] as string[]
  };

  const today = new Date().toISOString().split('T')[0];

  for (const item of parsedGoals) {
    const { data: existingGoals } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', clientId)
      .ilike('goal_name', `%${item.name}%`);

    const goalType = detectExerciseType(item.name);

    if (!existingGoals || existingGoals.length === 0) {
      const { error: createError } = await supabase
        .from('goals')
        .insert({
          user_id: clientId,
          goal_name: item.name,
          goal_type: goalType,
          target_value: item.target,
          target_unit: item.unit,
          is_personal: true
        });

      if (!createError) {
        results.created.push(`${item.name}: цель ${item.target} ${item.unit}`);
      }
    } else {
      const goal = existingGoals[0];
      if (goal.target_value !== item.target) {
        await supabase
          .from('goals')
          .update({ target_value: item.target, target_unit: item.unit })
          .eq('id', goal.id);
        
        results.updated.push(`${item.name}: цель обновлена до ${item.target} ${item.unit}`);
      }
    }

    const { data: goalForMeasurement } = await supabase
      .from('goals')
      .select('id')
      .eq('user_id', clientId)
      .ilike('goal_name', `%${item.name}%`)
      .single();

    if (goalForMeasurement && item.current) {
      await supabase
        .from('measurements')
        .insert({
          user_id: clientId,
          goal_id: goalForMeasurement.id,
          value: item.current,
          unit: item.unit,
          measurement_date: today,
          source: 'trainer'
        });

      const diff = item.target - item.current;
      const diffText = diff > 0 ? `осталось ${diff.toFixed(1)}` : `превышено на ${Math.abs(diff).toFixed(1)}`;
      results.measurements.push(`${item.name}: ${item.current} ${item.unit} (${diffText})`);
    }
  }

  await supabase.from('ai_action_logs').insert({
    trainer_id: trainerId,
    action_type: 'parse_goals',
    action_details: { ...params, parsed_count: parsedGoals.length },
    client_id: clientId,
    success: true
  });

  let message = `✅ Обработано для ${params.client_name}:\n\n`;
  
  if (results.created.length > 0) {
    message += `📋 Создано целей (${results.created.length}):\n${results.created.map(r => `• ${r}`).join('\n')}\n\n`;
  }
  
  if (results.updated.length > 0) {
    message += `🔄 Обновлено целей (${results.updated.length}):\n${results.updated.map(r => `• ${r}`).join('\n')}\n\n`;
  }
  
  if (results.measurements.length > 0) {
    message += `📊 Добавлено измерений на ${today} (${results.measurements.length}):\n${results.measurements.map(r => `• ${r}`).join('\n')}`;
  }

  return { success: true, message };
}

async function executeTool(supabase: any, trainerId: string, toolName: string, params: any) {
  switch (toolName) {
    case 'update_client_goal':
      return await updateClientGoal(supabase, trainerId, params);
    case 'add_measurement':
      return await addMeasurement(supabase, trainerId, params);
    case 'create_training_plan':
      return await createTrainingPlan(supabase, trainerId, params);
    case 'get_client_progress':
      return await getClientProgress(supabase, trainerId, params);
    case 'list_clients_needing_attention':
      return await listClientsNeedingAttention(supabase, trainerId, params);
    case 'add_client_task':
      return await addClientTask(supabase, trainerId, params);
    case 'parse_client_goals_and_progress':
      return await parseClientGoalsAndProgress(supabase, trainerId, params);
    default:
      return { success: false, error: `Unknown tool: ${toolName}` };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { message, conversationHistory } = await req.json();

    const { data: clients } = await supabase
      .from('trainer_clients')
      .select('client_id, profiles!trainer_clients_client_id_fkey(username, full_name)')
      .eq('trainer_id', user.id)
      .eq('active', true);

    const clientsList = clients?.map((c: any) => 
      `${c.profiles.full_name || c.profiles.username}`
    ).join(', ') || 'нет клиентов';

    const systemPrompt = `Ты AI-ассистент для фитнес-тренера. Твоя задача помогать управлять клиентами через естественный язык.

Клиенты тренера: ${clientsList}

Ты можешь:
- Обновлять цели клиентов
- Добавлять измерения
- Создавать тренировочные планы
- Анализировать прогресс
- Показывать клиентов, требующих внимания
- Добавлять задачи
- **АВТОМАТИЧЕСКИ ПАРСИТЬ цели и прогресс из произвольного текста** (когда тренер присылает текст типа "Паша Радаев. Гребля 2 км — 7:30 сейчас 7:55...")

Когда тренер присылает неструктурированный текст с целями участника:
1. Автоматически используй инструмент parse_client_goals_and_progress
2. Извлеки имя участника из текста
3. Распознай все упражнения/показатели, целевые и текущие значения
4. Создай/обнови цели и добавь текущие измерения

Отвечай кратко и по делу. Используй эмодзи для наглядности. Если нужно выполнить действие - используй доступные инструменты.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversationHistory || []),
      { role: 'user', content: message }
    ];

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        tools,
        tool_choice: 'auto'
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const choice = aiData.choices[0];
    const toolCalls = choice.message.tool_calls;

    let responseText = choice.message.content || '';

    if (toolCalls && toolCalls.length > 0) {
      const results = [];
      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;
        const toolParams = JSON.parse(toolCall.function.arguments);
        
        console.log('Executing tool:', toolName, toolParams);
        const result = await executeTool(supabase, user.id, toolName, toolParams);
        results.push(result);
      }

      const allSuccess = results.every(r => r.success);
      if (allSuccess) {
        responseText = results.map(r => r.message).join('\n');
      } else {
        const errors = results.filter(r => !r.success).map(r => r.error);
        responseText = `❌ Ошибки при выполнении:\n${errors.join('\n')}`;
      }
    }

    return new Response(
      JSON.stringify({ 
        response: responseText,
        toolsUsed: toolCalls?.map((tc: any) => tc.function.name) || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in trainer-ai-assistant:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
