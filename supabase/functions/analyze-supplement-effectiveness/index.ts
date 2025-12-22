import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BiomarkerComparison {
  biomarker: string;
  biomarkerId: string;
  expectedChangePercent: number;
  actualChangePercent: number | null;
  matchPercent: number | null;
  status: 'on_track' | 'partial' | 'no_effect' | 'opposite' | 'no_data';
  beforeValue: number | null;
  afterValue: number | null;
  unit: string;
}

interface AnalysisResult {
  verdict: 'effective' | 'needs_more_time' | 'not_working' | 'no_data';
  overallScore: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  comparisons: BiomarkerComparison[];
  aiAnalysis: {
    summary: string;
    keyFindings: string[];
    recommendations: string[];
    nextSteps: string;
  };
  weeksOnSupplement: number;
  expectedTimeframeWeeks: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { stackItemId, userId } = await req.json();
    
    if (!stackItemId || !userId) {
      return new Response(
        JSON.stringify({ error: 'stackItemId and userId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Get stack item details
    const { data: stackItem, error: stackError } = await supabase
      .from('user_stack')
      .select('*')
      .eq('id', stackItemId)
      .eq('user_id', userId)
      .single();

    if (stackError || !stackItem) {
      console.error('Stack item not found:', stackError);
      return new Response(
        JSON.stringify({ error: 'Stack item not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supplementName = stackItem.stack_name;
    const startDate = new Date(stackItem.created_at);
    const weeksOnSupplement = Math.floor((Date.now() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));

    // 2. Find canonical supplement name
    const { data: synonymMatch } = await supabase
      .from('supplement_synonyms')
      .select('canonical_name')
      .or(`synonym.ilike.%${supplementName}%,canonical_name.ilike.%${supplementName}%`)
      .limit(1)
      .single();

    const canonicalName = synonymMatch?.canonical_name || supplementName.toLowerCase().replace(/\s+/g, '_');

    // 3. Get expected correlations
    const { data: correlations } = await supabase
      .from('biomarker_correlations')
      .select(`
        *,
        biomarker:biomarker_master(id, display_name, standard_unit, canonical_name)
      `)
      .eq('supplement_name', canonicalName);

    if (!correlations || correlations.length === 0) {
      return new Response(
        JSON.stringify({
          verdict: 'no_data',
          overallScore: 0,
          confidenceLevel: 'low',
          comparisons: [],
          aiAnalysis: {
            summary: `Для добавки "${supplementName}" не найдены данные о корреляциях с биомаркерами в научной базе.`,
            keyFindings: ['Нет данных о связи с биомаркерами'],
            recommendations: ['Добавьте информацию о корреляциях вручную или обратитесь к врачу'],
            nextSteps: 'Рассмотрите возможность консультации со специалистом для определения целевых биомаркеров.'
          },
          weeksOnSupplement,
          expectedTimeframeWeeks: 0
        } as AnalysisResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const expectedTimeframeWeeks = Math.max(...correlations.map(c => c.timeframe_weeks || 8));

    // 4. Get lab results before and after supplement start
    const biomarkerIds = correlations
      .filter(c => c.biomarker?.id)
      .map(c => c.biomarker.id);

    // Get latest result BEFORE supplement start
    const { data: beforeResults } = await supabase
      .from('lab_test_results')
      .select('*')
      .eq('user_id', userId)
      .in('biomarker_id', biomarkerIds)
      .lt('test_date', startDate.toISOString().split('T')[0])
      .order('test_date', { ascending: false });

    // Get latest result AFTER supplement start
    const { data: afterResults } = await supabase
      .from('lab_test_results')
      .select('*')
      .eq('user_id', userId)
      .in('biomarker_id', biomarkerIds)
      .gte('test_date', startDate.toISOString().split('T')[0])
      .order('test_date', { ascending: false });

    // 5. Build comparisons
    const comparisons: BiomarkerComparison[] = [];
    
    for (const correlation of correlations) {
      if (!correlation.biomarker) continue;

      const biomarkerId = correlation.biomarker.id;
      const beforeResult = beforeResults?.find(r => r.biomarker_id === biomarkerId);
      const afterResult = afterResults?.find(r => r.biomarker_id === biomarkerId);

      let actualChangePercent: number | null = null;
      let matchPercent: number | null = null;
      let status: BiomarkerComparison['status'] = 'no_data';

      if (beforeResult && afterResult) {
        const beforeValue = beforeResult.result_value;
        const afterValue = afterResult.result_value;
        
        if (beforeValue !== 0) {
          actualChangePercent = Math.round(((afterValue - beforeValue) / Math.abs(beforeValue)) * 100);
          
          const expectedChange = correlation.expected_change_percent || 0;
          
          // Calculate match percentage
          if (expectedChange !== 0) {
            // If both changes are in the same direction
            if ((expectedChange > 0 && actualChangePercent > 0) || (expectedChange < 0 && actualChangePercent < 0)) {
              matchPercent = Math.min(100, Math.round((actualChangePercent / expectedChange) * 100));
              status = matchPercent >= 70 ? 'on_track' : matchPercent >= 40 ? 'partial' : 'no_effect';
            } else if (actualChangePercent === 0) {
              matchPercent = 0;
              status = 'no_effect';
            } else {
              matchPercent = 0;
              status = 'opposite';
            }
          }
        }

        comparisons.push({
          biomarker: correlation.biomarker.display_name,
          biomarkerId,
          expectedChangePercent: correlation.expected_change_percent || 0,
          actualChangePercent,
          matchPercent,
          status,
          beforeValue: beforeResult.result_value,
          afterValue: afterResult.result_value,
          unit: correlation.biomarker.standard_unit
        });
      } else {
        comparisons.push({
          biomarker: correlation.biomarker.display_name,
          biomarkerId,
          expectedChangePercent: correlation.expected_change_percent || 0,
          actualChangePercent: null,
          matchPercent: null,
          status: 'no_data',
          beforeValue: beforeResult?.result_value || null,
          afterValue: afterResult?.result_value || null,
          unit: correlation.biomarker.standard_unit
        });
      }
    }

    // 6. Calculate overall score and verdict
    const comparisonsWithData = comparisons.filter(c => c.status !== 'no_data');
    let overallScore = 0;
    let verdict: AnalysisResult['verdict'] = 'no_data';

    if (comparisonsWithData.length > 0) {
      const avgMatch = comparisonsWithData.reduce((sum, c) => sum + (c.matchPercent || 0), 0) / comparisonsWithData.length;
      overallScore = Math.round(avgMatch);

      if (weeksOnSupplement < expectedTimeframeWeeks * 0.5) {
        verdict = 'needs_more_time';
      } else if (overallScore >= 60) {
        verdict = 'effective';
      } else if (overallScore >= 30 || weeksOnSupplement < expectedTimeframeWeeks) {
        verdict = 'needs_more_time';
      } else {
        verdict = 'not_working';
      }
    } else if (comparisons.length > 0) {
      // Have expected correlations but no lab data
      verdict = weeksOnSupplement < 4 ? 'needs_more_time' : 'no_data';
    }

    // 7. Generate AI analysis using Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    let aiAnalysis = {
      summary: '',
      keyFindings: [] as string[],
      recommendations: [] as string[],
      nextSteps: ''
    };

    if (LOVABLE_API_KEY) {
      try {
        const prompt = `Ты эксперт по нутрициологии и анализу эффективности добавок. Проанализируй данные и дай развёрнутый вердикт на русском языке.

Добавка: ${supplementName}
Период приёма: ${weeksOnSupplement} недель
Ожидаемый срок эффекта: ${expectedTimeframeWeeks} недель
Текущий вердикт: ${verdict}
Общий score: ${overallScore}%

Сравнение биомаркеров:
${comparisons.map(c => `- ${c.biomarker}: ожидалось ${c.expectedChangePercent > 0 ? '+' : ''}${c.expectedChangePercent}%, ${
  c.status === 'no_data' 
    ? 'нет данных' 
    : `факт ${c.actualChangePercent! > 0 ? '+' : ''}${c.actualChangePercent}% (${c.beforeValue} → ${c.afterValue} ${c.unit}), совпадение ${c.matchPercent}%`
}`).join('\n')}

Дай ответ в JSON формате:
{
  "summary": "Краткий вывод об эффективности (2-3 предложения)",
  "keyFindings": ["Ключевой вывод 1", "Ключевой вывод 2"],
  "recommendations": ["Рекомендация 1", "Рекомендация 2", "Рекомендация 3"],
  "nextSteps": "Что делать дальше (1 предложение)"
}`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'Ты эксперт по нутрициологии. Отвечай только валидным JSON без markdown.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 1000
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || '';
          
          // Parse JSON from response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              aiAnalysis = JSON.parse(jsonMatch[0]);
            } catch (e) {
              console.error('Failed to parse AI JSON:', e);
            }
          }
        }
      } catch (e) {
        console.error('AI analysis failed:', e);
      }
    }

    // Fallback if AI didn't generate content
    if (!aiAnalysis.summary) {
      aiAnalysis = generateFallbackAnalysis(supplementName, verdict, overallScore, weeksOnSupplement, expectedTimeframeWeeks, comparisons);
    }

    const result: AnalysisResult = {
      verdict,
      overallScore,
      confidenceLevel: comparisonsWithData.length >= 3 ? 'high' : comparisonsWithData.length >= 1 ? 'medium' : 'low',
      comparisons,
      aiAnalysis,
      weeksOnSupplement,
      expectedTimeframeWeeks
    };

    console.log('Analysis result:', JSON.stringify(result, null, 2));

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-supplement-effectiveness:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateFallbackAnalysis(
  supplementName: string,
  verdict: string,
  overallScore: number,
  weeksOnSupplement: number,
  expectedTimeframeWeeks: number,
  comparisons: BiomarkerComparison[]
) {
  const onTrack = comparisons.filter(c => c.status === 'on_track');
  const noData = comparisons.filter(c => c.status === 'no_data');

  let summary = '';
  const keyFindings: string[] = [];
  const recommendations: string[] = [];
  let nextSteps = '';

  switch (verdict) {
    case 'effective':
      summary = `${supplementName} демонстрирует положительный эффект. ${onTrack.length} из ${comparisons.length} целевых биомаркеров изменились в ожидаемом направлении.`;
      keyFindings.push(`Общая эффективность: ${overallScore}%`);
      if (onTrack.length > 0) {
        keyFindings.push(`Улучшение: ${onTrack.map(c => c.biomarker).join(', ')}`);
      }
      recommendations.push('Продолжайте приём в текущей дозировке');
      recommendations.push('Сохраняйте регулярность приёма');
      nextSteps = `Повторите анализ через ${Math.max(4, expectedTimeframeWeeks - weeksOnSupplement)} недель для подтверждения результата.`;
      break;
      
    case 'needs_more_time':
      summary = `${supplementName} принимается ${weeksOnSupplement} недель. Для полной оценки эффективности рекомендуется подождать ещё ${Math.max(1, expectedTimeframeWeeks - weeksOnSupplement)} недель.`;
      keyFindings.push(`Ожидаемый срок эффекта: ${expectedTimeframeWeeks} недель`);
      keyFindings.push(`Текущий прогресс: ${weeksOnSupplement} недель`);
      recommendations.push('Продолжайте приём добавки');
      recommendations.push(`Сдайте анализы через ${Math.max(2, expectedTimeframeWeeks - weeksOnSupplement)} недели`);
      nextSteps = 'Дождитесь завершения рекомендуемого периода приёма перед оценкой.';
      break;
      
    case 'not_working':
      summary = `${supplementName} не показывает ожидаемого эффекта после ${weeksOnSupplement} недель приёма. Рассмотрите альтернативные варианты.`;
      keyFindings.push(`Эффективность: ${overallScore}% (ниже ожиданий)`);
      recommendations.push('Проконсультируйтесь с врачом');
      recommendations.push('Рассмотрите альтернативные формы или дозировки');
      recommendations.push('Проверьте качество добавки и условия хранения');
      nextSteps = 'Обсудите результаты с врачом для корректировки протокола.';
      break;
      
    default:
      summary = `Для ${supplementName} недостаточно данных для анализа эффективности.`;
      if (noData.length > 0) {
        keyFindings.push(`Нет лабораторных данных для: ${noData.map(c => c.biomarker).join(', ')}`);
      }
      recommendations.push('Сдайте базовые анализы на целевые биомаркеры');
      recommendations.push('Повторите анализы через 4-8 недель приёма');
      nextSteps = 'Получите исходные значения биомаркеров для отслеживания изменений.';
  }

  return { summary, keyFindings, recommendations, nextSteps };
}
