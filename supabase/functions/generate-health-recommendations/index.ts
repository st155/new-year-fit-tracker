import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { corsHeaders } from '../_shared/cors.ts';
import { createAIClient, AIProvider } from '../_shared/ai-client.ts';
import { Logger } from '../_shared/monitoring.ts';
import { EdgeFunctionError, ErrorCode } from '../_shared/error-handling.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const logger = new Logger('generate-health-recommendations');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`Generating health recommendations for user ${user.id}`);

    // Date ranges
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch all data in parallel
    const [
      { data: documents },
      { data: goals },
      { data: measurements },
      { data: profile },
      { data: fitnessMetrics },
      { data: labResults },
      { data: findings },
      { data: supplements },
      { data: intakeLogs },
      { data: bodyComp }
    ] = await Promise.all([
      // Medical documents
      supabase
        .from('medical_documents')
        .select('*')
        .eq('user_id', user.id)
        .eq('ai_processed', true)
        .gte('document_date', twelveMonthsAgo.toISOString().split('T')[0])
        .order('document_date', { ascending: false }),
      
      // Goals
      supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_personal', true),
      
      // Measurements
      supabase
        .from('measurements')
        .select('*, goals(goal_name, target_value, target_unit)')
        .eq('user_id', user.id)
        .order('measurement_date', { ascending: false })
        .limit(20),
      
      // Profile
      supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single(),
      
      // Fitness metrics (last 30 days)
      supabase
        .from('unified_metrics')
        .select('metric_name, value, measurement_date')
        .eq('user_id', user.id)
        .gte('measurement_date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('measurement_date', { ascending: false }),
      
      // Lab results with biomarker data
      supabase
        .from('lab_test_results')
        .select(`
          *,
          biomarker:biomarker_master(canonical_name, display_name, reference_ranges, standard_unit)
        `)
        .eq('user_id', user.id)
        .order('test_date', { ascending: false })
        .limit(500),
      
      // Medical findings (MRI/USG)
      supabase
        .from('medical_findings')
        .select('body_part, finding_text, severity, tags')
        .eq('user_id', user.id),
      
      // Supplements
      supabase
        .from('user_stack')
        .select(`
          stack_name, is_active, effectiveness_score, ai_rationale, daily_dosage, dosage_unit,
          product:supplement_products(brand, form)
        `)
        .eq('user_id', user.id),
      
      // Intake logs (last 30 days)
      supabase
        .from('intake_logs')
        .select('taken_at, stack_item_id')
        .eq('user_id', user.id)
        .gte('taken_at', thirtyDaysAgo.toISOString()),
      
      // Body composition
      supabase
        .from('body_composition')
        .select('*')
        .eq('user_id', user.id)
        .order('measurement_date', { ascending: false })
        .limit(5)
    ]);

    // Helper functions
    function formatBiomarkerTrends(labResults: any[]) {
      if (!labResults || labResults.length === 0) return 'Нет данных по биомаркерам';
      
      const grouped = new Map();
      labResults.forEach(result => {
        const key = result.biomarker_id;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(result);
      });
      
      const trends: string[] = [];
      grouped.forEach((results, biomarkerId) => {
        if (results.length < 2 || !results[0].biomarker) return;
        
        const latest = results[0];
        const oldest = results[results.length - 1];
        const biomarker = latest.biomarker;
        
        if (latest.normalized_value && oldest.normalized_value) {
          const change = latest.normalized_value - oldest.normalized_value;
          const percentChange = ((change / oldest.normalized_value) * 100).toFixed(1);
          const absPercentChange = Math.abs(parseFloat(percentChange));
          
          // ⚠️ Warning for suspicious changes (>500%) - likely unit conversion issue
          if (absPercentChange > 500) {
            console.warn(`[SUSPICIOUS CHANGE] ${biomarker.display_name}: ${oldest.normalized_value} → ${latest.normalized_value} (${percentChange}%) - possible unit conversion error`);
          }
          
          const trend = change > 0 ? '↗️' : change < 0 ? '↘️' : '→';
          
          const refRanges = biomarker.reference_ranges as any;
          const normalMin = refRanges?.male?.min || refRanges?.general?.min;
          const normalMax = refRanges?.male?.max || refRanges?.general?.max;
          
          let status = '✅';
          if (normalMin && normalMax) {
            if (latest.normalized_value < normalMin) status = '⬇️ НИЗКО';
            else if (latest.normalized_value > normalMax) status = '⬆️ ВЫСОКО';
          }
          
          trends.push(`${biomarker.display_name}: ${latest.normalized_value} ${biomarker.standard_unit} ${trend} (${percentChange > 0 ? '+' : ''}${percentChange}%) [${status}]`);
        }
      });
      
      return trends.slice(0, 20).join('\n') || 'Недостаточно данных для трендов';
    }

    function formatAbnormalBiomarkers(labResults: any[]) {
      if (!labResults || labResults.length === 0) return 'Нет отклонений';
      
      const abnormal: string[] = [];
      const latest = new Map();
      
      labResults.forEach(result => {
        if (!latest.has(result.biomarker_id)) {
          latest.set(result.biomarker_id, result);
        }
      });
      
      latest.forEach((result) => {
        if (!result.biomarker || !result.normalized_value) return;
        
        const refRanges = result.biomarker.reference_ranges as any;
        const normalMin = refRanges?.male?.min || refRanges?.general?.min;
        const normalMax = refRanges?.male?.max || refRanges?.general?.max;
        
        if (normalMin && normalMax) {
          if (result.normalized_value < normalMin) {
            abnormal.push(`🔴 ${result.biomarker.display_name}: ${result.normalized_value} ${result.biomarker.standard_unit} (норма: ${normalMin}-${normalMax})`);
          } else if (result.normalized_value > normalMax) {
            abnormal.push(`🔴 ${result.biomarker.display_name}: ${result.normalized_value} ${result.biomarker.standard_unit} (норма: ${normalMin}-${normalMax})`);
          }
        }
      });
      
      return abnormal.slice(0, 15).join('\n') || 'Все показатели в норме ✅';
    }

    function formatFitnessAverages(metrics: any[]) {
      if (!metrics || metrics.length === 0) return 'Нет данных с фитнес-трекера';
      
      const grouped = new Map();
      metrics.forEach(m => {
        if (!grouped.has(m.metric_name)) grouped.set(m.metric_name, []);
        grouped.get(m.metric_name).push(m.value);
      });
      
      const averages: string[] = [];
      grouped.forEach((values, name) => {
        const avg = values.reduce((sum: number, v: number) => sum + v, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        averages.push(`${name}: среднее ${avg.toFixed(1)}, мин ${min.toFixed(1)}, макс ${max.toFixed(1)}`);
      });
      
      return averages.join('\n') || 'Нет данных';
    }

    function formatSleepMetrics(metrics: any[]) {
      const sleepMetrics = metrics?.filter(m => 
        m.metric_name === 'Sleep Duration' || 
        m.metric_name === 'Sleep Efficiency' ||
        m.metric_name === 'Deep Sleep Duration' ||
        m.metric_name === 'REM Sleep Duration'
      ) || [];
      
      if (sleepMetrics.length === 0) return 'Нет данных о сне';
      
      return formatFitnessAverages(sleepMetrics);
    }

    function formatBodyComposition(bodyComp: any[]) {
      if (!bodyComp || bodyComp.length === 0) return 'Нет данных о составе тела';
      
      const latest = bodyComp[0];
      const oldest = bodyComp[bodyComp.length - 1];
      
      const result: string[] = [];
      result.push(`Последнее измерение (${latest.measurement_date}):`);
      if (latest.weight) result.push(`  Вес: ${latest.weight} кг`);
      if (latest.body_fat_percentage) result.push(`  % жира: ${latest.body_fat_percentage}%`);
      if (latest.muscle_mass) result.push(`  Мышечная масса: ${latest.muscle_mass} кг`);
      
      if (bodyComp.length > 1 && oldest.weight && latest.weight) {
        const weightChange = latest.weight - oldest.weight;
        result.push(`\nИзменения с ${oldest.measurement_date}:`);
        result.push(`  Вес: ${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} кг`);
        if (oldest.body_fat_percentage && latest.body_fat_percentage) {
          const fatChange = latest.body_fat_percentage - oldest.body_fat_percentage;
          result.push(`  % жира: ${fatChange > 0 ? '+' : ''}${fatChange.toFixed(1)}%`);
        }
      }
      
      return result.join('\n');
    }

    function formatMedicalFindings(findings: any[]) {
      if (!findings || findings.length === 0) return 'Нет данных МРТ/УЗИ';
      
      return findings.map(f => 
        `[${f.severity?.toUpperCase() || 'UNKNOWN'}] ${f.body_part}: ${f.finding_text}`
      ).join('\n');
    }

    function formatSupplements(supplements: any[]) {
      if (!supplements || supplements.length === 0) return 'Нет активных добавок';
      
      const active = supplements.filter(s => s.is_active);
      return active.map(s => {
        const product = s.product || {};
        const effectiveness = s.effectiveness_score ? ` (эффективность: ${s.effectiveness_score}/10)` : '';
        return `- ${s.stack_name}: ${s.daily_dosage} ${s.dosage_unit} ${product.form || ''}${effectiveness}`;
      }).join('\n') || 'Нет активных добавок';
    }

    function calculateAdherence(intakeLogs: any[]) {
      if (!intakeLogs || intakeLogs.length === 0) return 0;
      
      const uniqueDays = new Set(intakeLogs.map(l => l.taken_at.split('T')[0])).size;
      return Math.round((uniqueDays / 30) * 100);
    }

    // Build comprehensive context
    const adherence = calculateAdherence(intakeLogs || []);
    const abnormalCount = labResults?.filter(r => {
      if (!r.biomarker || !r.normalized_value) return false;
      const refRanges = r.biomarker.reference_ranges as any;
      const normalMin = refRanges?.male?.min || refRanges?.general?.min;
      const normalMax = refRanges?.male?.max || refRanges?.general?.max;
      return normalMin && normalMax && (r.normalized_value < normalMin || r.normalized_value > normalMax);
    }).length || 0;

    const prompt = `Ты — персональный биохакинг-консультант мирового класса. Тебя зовут "HealthGPT Elite".
Твоя задача — провести ГЛУБОКИЙ анализ всех данных пользователя и дать МОЩНЫЕ, КОНКРЕТНЫЕ рекомендации на русском языке.

## 👤 ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ
Имя: ${profile?.full_name || 'Пользователь'}
Username: ${profile?.username || 'N/A'}

## 🩸 АНАЛИЗЫ КРОВИ (${labResults?.length || 0} результатов)

### Биомаркеры с трендами:
${formatBiomarkerTrends(labResults || [])}

### ⚠️ Отклонения от нормы:
${formatAbnormalBiomarkers(labResults || [])}

## 💪 ФИТНЕС-МЕТРИКИ (последние 30 дней)
${formatFitnessAverages(fitnessMetrics || [])}

## 🛏️ СОН (средние показатели)
${formatSleepMetrics(fitnessMetrics || [])}

## 🧬 СОСТАВ ТЕЛА (InBody)
${formatBodyComposition(bodyComp || [])}

## 🔬 РЕЗУЛЬТАТЫ МРТ/УЗИ
${formatMedicalFindings(findings || [])}

## 💊 ТЕКУЩИЕ ДОБАВКИ
${formatSupplements(supplements || [])}
Adherence за 30 дней: ${adherence}%

## 🎯 АКТИВНЫЕ ЦЕЛИ
${goals?.map(g => `- ${g.goal_name}: ${g.target_value} ${g.target_unit}`).join('\n') || 'Нет активных целей'}

## 📄 МЕДИЦИНСКИЕ ДОКУМЕНТЫ
Всего документов: ${documents?.length || 0}
Типы: ${documents?.map(d => d.category).filter((v, i, a) => a.indexOf(v) === i).join(', ') || 'N/A'}

---

## ТРЕБОВАНИЯ К АНАЛИЗУ:

### 1. 🩺 ОБЩАЯ ОЦЕНКА ЗДОРОВЬЯ (3-5 предложений)
- Оцени текущее состояние на основе ВСЕХ данных
- Выдели главные сильные стороны
- Назови критические зоны внимания

### 2. 🎯 ТОП-5 ПРИОРИТЕТНЫХ РЕКОМЕНДАЦИЙ
Для каждой рекомендации укажи:
- **📌 Что делать** (конкретное действие)
- **🎯 Почему** (какие данные это показали)
- **📊 Ожидаемый эффект** (на какие биомаркеры/метрики повлияет)
- **⏱️ Срок проверки** (когда пересдать анализ или проверить эффект)

### 3. 💊 ДОБАВКИ
- **✅ Оставить/продолжить**: какие добавки работают (на основе корреляций с анализами)
- **➕ Добавить**: что добавить к стеку и почему
- **❌ Убрать/заменить**: что неэффективно или избыточно

### 4. 🏋️ ТРЕНИРОВКИ
На основе состава тела, Recovery Score, и целей:
- Тип тренировок
- Интенсивность и частота
- Конкретные упражнения для слабых зон

### 5. 🍽️ ПИТАНИЕ И РЕЖИМ
На основе анализов крови и метаболизма:
- Макронутриенты (белки/жиры/углеводы)
- Продукты для включения/исключения
- Время приёма пищи

### 6. 😴 СОН И ВОССТАНОВЛЕНИЕ
На основе данных трекера:
- Оптимизация качества сна
- Рекомендации по Recovery

### 7. 🏠 БЫТОВЫЕ ПРИВЫЧКИ
- Конкретные ежедневные практики
- Утренние/вечерние ритуалы
- Stress management

### 8. 🏥 МЕДИЦИНСКИЕ РЕКОМЕНДАЦИИ
На основе МРТ/УЗИ находок:
- Какие специалисты нужны
- Что контролировать
- Профилактические меры

### 9. 📅 СЛЕДУЮЩИЕ ШАГИ
- Какие анализы пересдать и когда
- Что измерить/отследить
- Дата следующего анализа рекомендаций

---

**ВАЖНО:**
- Пиши ТОЛЬКО на русском языке
- Используй конкретные ЦИФРЫ из данных
- Давай СПЕЦИФИЧНЫЕ рекомендации, не общие фразы
- Учитывай взаимосвязи между показателями
- Формат ответа: структурированный текст с эмодзи и разделами
- Будь мотивирующим и конкретным`;

    await logger.info('Generating health recommendations', { userId: user.id });
    
    const aiClient = createAIClient(AIProvider.LOVABLE);
    const aiResponse = await aiClient.complete({
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const recommendations = aiResponse.content;

    if (!recommendations) {
      throw new EdgeFunctionError(
        ErrorCode.EXTERNAL_API_ERROR,
        'No recommendations generated'
      );
    }

    // Calculate improved health score (0-100)
    let healthScore = 50; // Base score

    // Biomarkers contribution (max +20)
    const totalBiomarkers = labResults?.length || 0;
    if (totalBiomarkers > 0) {
      const normalRatio = 1 - (abnormalCount / totalBiomarkers);
      healthScore += normalRatio * 20;
    }

    // Recovery score contribution (max +10)
    const recoveryMetrics = fitnessMetrics?.filter(m => m.metric_name === 'Recovery Score') || [];
    if (recoveryMetrics.length > 0) {
      const avgRecovery = recoveryMetrics.reduce((sum, m) => sum + m.value, 0) / recoveryMetrics.length;
      if (avgRecovery > 70) healthScore += 10;
      else if (avgRecovery < 50) healthScore -= 10;
    }

    // Sleep efficiency contribution (max +10)
    const sleepMetrics = fitnessMetrics?.filter(m => m.metric_name === 'Sleep Efficiency') || [];
    if (sleepMetrics.length > 0) {
      const avgSleep = sleepMetrics.reduce((sum, m) => sum + m.value, 0) / sleepMetrics.length;
      if (avgSleep > 85) healthScore += 10;
      else if (avgSleep < 70) healthScore -= 10;
    }

    // Medical findings impact (max -30)
    const severeFindings = findings?.filter(f => f.severity === 'severe').length || 0;
    const moderateFindings = findings?.filter(f => f.severity === 'moderate').length || 0;
    healthScore -= severeFindings * 15;
    healthScore -= moderateFindings * 7;

    // Supplement adherence bonus (max +5)
    if (adherence > 80) healthScore += 5;

    // Body composition bonus (max +5)
    if (bodyComp && bodyComp.length > 0) {
      const latest = bodyComp[0];
      if (latest.body_fat_percentage && latest.body_fat_percentage < 20) healthScore += 5;
    }

    // Cap between 1-100
    healthScore = Math.max(1, Math.min(100, Math.round(healthScore)));

    // Determine date range
    const dateRange = documents && documents.length > 0 ? {
      from: documents[documents.length - 1].document_date,
      to: documents[0].document_date
    } : undefined;

    // Save to recommendations_history
    const { error: saveError } = await supabase
      .from('recommendations_history')
      .insert({
        user_id: user.id,
        recommendations_text: recommendations,
        context_snapshot: {
          documents_analyzed: documents?.length || 0,
          biomarkers_count: labResults?.length || 0,
          abnormal_biomarkers: abnormalCount,
          fitness_metrics_count: fitnessMetrics?.length || 0,
          medical_findings_count: findings?.length || 0,
          active_supplements_count: supplements?.filter(s => s.is_active).length || 0,
          supplement_adherence: adherence,
          date_range: dateRange
        },
        health_score: healthScore
      } as any);

    if (saveError) {
      console.error('Error saving to recommendations_history:', saveError);
      // Don't fail the request if save fails, just log it
    }

    await logger.info('Recommendations generated successfully', { 
      provider: aiResponse.provider,
      documentsAnalyzed: documents?.length || 0,
      biomarkersAnalyzed: labResults?.length || 0,
      healthScore 
    });

    return new Response(
      JSON.stringify({
        success: true,
        recommendations,
        health_score: healthScore,
        context: {
          documentsAnalyzed: documents?.length || 0,
          biomarkersAnalyzed: labResults?.length || 0,
          abnormalBiomarkers: abnormalCount,
          fitnessMetricsCount: fitnessMetrics?.length || 0,
          medicalFindingsCount: findings?.length || 0,
          activeSupplements: supplements?.filter(s => s.is_active).length || 0,
          adherence
        },
        generatedAt: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error in generate-health-recommendations:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});