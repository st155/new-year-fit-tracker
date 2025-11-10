import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, jsonResponse, handleCorsPreFlight } from "../_shared/cors.ts";
import { createAuthClient, getAuthenticatedUser } from "../_shared/supabase-client.ts";
import { createAIClient, AIProvider } from "../_shared/ai-client.ts";
import { withErrorHandling, EdgeFunctionError, ErrorCode } from "../_shared/error-handling.ts";

interface ExerciseLog {
  exercise_name: string;
  last_weight?: number;
  last_reps?: number;
  last_rir?: number;
  last_date?: string;
}

interface ReadinessData {
  recovery_score: number;
  sleep_score: number;
  activity_score: number;
  total_health_score: number;
}

interface PlannedExercise {
  name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes?: string;
}

interface AdjustedExercise extends PlannedExercise {
  adjustment_reason?: string;
}

interface AIAdjustmentResponse {
  adjusted_exercises: AdjustedExercise[];
  ai_rationale: string;
}

serve(
  withErrorHandling(async (req: Request) => {
    if (req.method === "OPTIONS") {
      return handleCorsPreFlight();
    }

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new EdgeFunctionError(
        "Authorization header required",
        ErrorCode.UNAUTHORIZED,
        401
      );
    }

    const user = await getAuthenticatedUser(authHeader);
    const supabase = createAuthClient(authHeader);

    // Parse request body
    const { user_id, date } = await req.json();
    const targetUserId = user_id || user.id;

    // Verify user can access this data
    if (targetUserId !== user.id) {
      // Check if user is a trainer for this client
      const { data: trainerCheck } = await supabase
        .from("trainer_clients")
        .select("id")
        .eq("trainer_id", user.id)
        .eq("client_id", targetUserId)
        .eq("active", true)
        .single();

      if (!trainerCheck) {
        throw new EdgeFunctionError(
          "Unauthorized to access this user's data",
          ErrorCode.UNAUTHORIZED,
          403
        );
      }
    }

    const targetDate = date ? new Date(date) : new Date();
    const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

    console.log(`[get-daily-ai-workout] Fetching workout for user ${targetUserId}, day ${dayOfWeek}`);

    // Step 1: Fetch today's planned workout
    const { data: plannedWorkout, error: workoutError } = await supabase
      .from("training_plan_workouts")
      .select(`
        id,
        day_of_week,
        workout_name,
        exercises,
        training_plans!inner(
          id,
          name,
          assigned_training_plans!inner(
            client_id,
            status
          )
        )
      `)
      .eq("training_plans.assigned_training_plans.client_id", targetUserId)
      .eq("training_plans.assigned_training_plans.status", "active")
      .eq("day_of_week", dayOfWeek)
      .maybeSingle();

    if (workoutError) {
      console.error("[get-daily-ai-workout] Error fetching workout:", workoutError);
      throw new EdgeFunctionError(
        "Failed to fetch workout plan",
        ErrorCode.DATABASE_ERROR,
        500
      );
    }

    // No workout today = rest day
    if (!plannedWorkout) {
      return jsonResponse({
        success: true,
        is_rest_day: true,
        day_of_week: dayOfWeek,
        message: "No workout scheduled for today",
        readiness: readiness,
      });
    }

    // Step 2: Fetch user readiness data
    const { data: readinessData, error: readinessError } = await supabase
      .from("client_health_scores")
      .select("recovery_score, sleep_score, activity_score, total_health_score")
      .eq("client_id", targetUserId)
      .maybeSingle();

    const readiness: ReadinessData = readinessData || {
      recovery_score: 70,
      sleep_score: 75,
      activity_score: 50,
      total_health_score: 70,
    };

    console.log("[get-daily-ai-workout] Readiness:", readiness);

    // Step 3: Fetch last performance logs
    const exercises = plannedWorkout.exercises as PlannedExercise[];
    const exerciseNames = exercises.map((e) => e.name);

    const { data: performanceLogs, error: logsError } = await supabase
      .from("workout_logs")
      .select("exercise_name, weight, reps, actual_rir, performed_at")
      .eq("user_id", targetUserId)
      .in("exercise_name", exerciseNames)
      .order("performed_at", { ascending: false })
      .limit(30);

    // Group logs by exercise
    const exerciseHistory: Record<string, ExerciseLog> = {};
    if (performanceLogs) {
      performanceLogs.forEach((log) => {
        if (!exerciseHistory[log.exercise_name]) {
          exerciseHistory[log.exercise_name] = {
            exercise_name: log.exercise_name,
            last_weight: log.weight,
            last_reps: log.reps,
            last_rir: log.actual_rir,
            last_date: log.performed_at,
          };
        }
      });
    }

    console.log("[get-daily-ai-workout] Performance history:", exerciseHistory);

    // Step 4: Build AI adjustment prompt
    const aiPrompt = `Ты опытный тренер по силовой подготовке. Проанализируй запланированную тренировку и адаптируй её под текущее состояние спортсмена.

**ЗАПЛАНИРОВАННАЯ ТРЕНИРОВКА:**
${JSON.stringify(plannedWorkout, null, 2)}

**ТЕКУЩЕЕ СОСТОЯНИЕ СПОРТСМЕНА:**
- Восстановление (Recovery Score): ${readiness.recovery_score}/100
- Качество сна (Sleep Score): ${readiness.sleep_score}/100
- Активность (Activity Score): ${readiness.activity_score}/100
- Общий показатель здоровья: ${readiness.total_health_score}/100

**ПОСЛЕДНИЕ РЕЗУЛЬТАТЫ:**
${JSON.stringify(exerciseHistory, null, 2)}

**ПРАВИЛА АДАПТАЦИИ:**

1. **Если Recovery Score < 50 (плохое восстановление):**
   - Снизить количество подходов на 20-30%
   - Увеличить RIR (запас повторений) на 2-3
   - Рассмотреть замену тяжёлых упражнений на более лёгкие варианты

2. **Если Sleep Score < 60 (плохой сон):**
   - Снизить интенсивность (больше повторений, меньше вес)
   - Увеличить время отдыха между подходами на 30 секунд

3. **Если Total Health Score > 80 (отличное состояние):**
   - Можно увеличить нагрузку на 5-10%
   - Уменьшить RIR на 1, если последняя тренировка прошла успешно

4. **На основе последних результатов:**
   - Если спортсмен превысил запланированные показатели - предложить прогрессию
   - Если не достиг целей - снизить нагрузку или упростить упражнение

**ЗАДАЧА:**
Отрегулируй тренировку, изменив количество подходов, повторений, время отдыха или упражнения. Объясни свои решения на русском языке.`;

    // Step 5: Call Lovable AI with tool calling
    let adjustedWorkout: AIAdjustmentResponse;
    
    try {
      const aiClient = createAIClient(AIProvider.LOVABLE);
      
      const aiResponse = await aiClient.complete({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Ты профессиональный тренер. Адаптируй тренировки под состояние спортсмена." },
          { role: "user", content: aiPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "adjust_workout",
              description: "Адаптировать тренировку под состояние спортсмена",
              parameters: {
                type: "object",
                properties: {
                  adjusted_exercises: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        sets: { type: "number" },
                        reps: { type: "string" },
                        rest_seconds: { type: "number" },
                        notes: { type: "string" },
                        adjustment_reason: { type: "string" }
                      },
                      required: ["name", "sets", "reps", "rest_seconds"]
                    }
                  },
                  ai_rationale: {
                    type: "string",
                    description: "Подробное объяснение всех изменений на русском языке"
                  }
                },
                required: ["adjusted_exercises", "ai_rationale"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "adjust_workout" } },
        temperature: 0.3,
        max_tokens: 2000
      });

      // Parse AI response
      if (aiResponse.tool_calls && aiResponse.tool_calls.length > 0) {
        const toolCall = aiResponse.tool_calls[0];
        adjustedWorkout = JSON.parse(toolCall.function.arguments);
      } else {
        throw new Error("No tool call in AI response");
      }

      console.log("[get-daily-ai-workout] AI adjustment successful");
      
    } catch (aiError) {
      console.error("[get-daily-ai-workout] AI error:", aiError);
      
      // Fallback: return original workout
      adjustedWorkout = {
        adjusted_exercises: exercises,
        ai_rationale: "Не удалось получить AI-рекомендации. Используется оригинальный план тренировки."
      };
    }

    // Step 6: Build final response
    const response = {
      success: true,
      is_rest_day: false,
      day_of_week: dayOfWeek,
      workout_id: plannedWorkout.id,
      workout_name: plannedWorkout.workout_name,
      original_exercises: exercises,
      adjusted_exercises: adjustedWorkout.adjusted_exercises,
      ai_rationale: adjustedWorkout.ai_rationale,
      readiness: readiness,
      readiness_snapshot: readiness,
      performance_history: exerciseHistory,
      adjustment_summary: {
        total_exercises: exercises.length,
        exercises_modified: adjustedWorkout.adjusted_exercises.filter((adj, idx) => 
          JSON.stringify(adj) !== JSON.stringify(exercises[idx])
        ).length,
        readiness_status: readiness.total_health_score >= 80 ? "excellent" :
                         readiness.total_health_score >= 60 ? "good" :
                         readiness.total_health_score >= 40 ? "fair" : "poor"
      },
      generated_at: new Date().toISOString()
    };

    console.log(`[get-daily-ai-workout] Success! Returning ${adjustedWorkout.adjusted_exercises.length} exercises`);
    return jsonResponse(response);
  })
);
