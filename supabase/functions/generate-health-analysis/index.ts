import { withAuth, jsonResponse, errorResponse } from '../_shared/handler.ts';

Deno.serve(withAuth(async ({ supabase, user }) => {
  console.log('[HEALTH-ANALYSIS] Generating health analysis for user:', user!.id);

  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - 12);

  // Get all processed documents from the last 12 months
  const { data: documents, error: docsError } = await supabase
    .from('medical_documents')
    .select('*')
    .eq('user_id', user!.id)
    .eq('processing_status', 'completed')
    .gte('document_date', cutoffDate.toISOString().split('T')[0])
    .order('document_date', { ascending: false });

  if (docsError) {
    console.error('[HEALTH-ANALYSIS] Error fetching documents:', docsError);
    throw docsError;
  }

  if (!documents || documents.length === 0) {
    throw new Error('No processed documents found for analysis');
  }

  console.log(`[HEALTH-ANALYSIS] Analyzing ${documents.length} documents`);

  // Get blood test results
  const { data: labResults, error: labError } = await supabase
    .from('lab_test_results')
    .select('*, biomarker_master(*)')
    .eq('user_id', user!.id)
    .gte('test_date', cutoffDate.toISOString().split('T')[0])
    .order('test_date', { ascending: false })
    .limit(200);

  if (labError) {
    console.error('[HEALTH-ANALYSIS] Error fetching lab results:', labError);
  }

  // Get InBody analyses
  const { data: inbodyData, error: inbodyError } = await supabase
    .from('inbody_analyses')
    .select('*')
    .eq('user_id', user!.id)
    .gte('test_date', cutoffDate.toISOString().split('T')[0])
    .order('test_date', { ascending: false })
    .limit(50);

  if (inbodyError) {
    console.error('[HEALTH-ANALYSIS] Error fetching InBody data:', inbodyError);
  }

  // Prepare data summary for AI
  const bloodTestSummary = labResults?.map(r => ({
    biomarker: r.biomarker_master?.display_name || r.raw_test_name,
    value: r.normalized_value,
    unit: r.normalized_unit,
    date: r.test_date,
    status: r.is_critical ? 'critical' : r.is_abnormal ? 'abnormal' : 'normal'
  })) || [];

  const inbodySummary = inbodyData?.map(i => ({
    date: i.test_date,
    weight: i.weight,
    bodyFat: i.body_fat_percentage,
    muscleMass: i.muscle_mass,
    bmi: i.bmi
  })) || [];

  const prompt = `Analyze the following health data and create a comprehensive health report:

**Blood Test Results (${bloodTestSummary.length} results):**
${JSON.stringify(bloodTestSummary.slice(0, 50), null, 2)}

**Body Composition Data (${inbodySummary.length} analyses):**
${JSON.stringify(inbodySummary, null, 2)}

**Document Summary:**
- Total documents: ${documents.length}
- Blood tests: ${documents.filter(d => d.document_type === 'blood_test').length}
- InBody analyses: ${documents.filter(d => d.document_type === 'inbody').length}
- Medical reports: ${documents.filter(d => d.document_type === 'fitness_report').length}
- Date range: ${documents[documents.length - 1]?.document_date} to ${documents[0]?.document_date}

Please provide:
1. Overall health score (0-10)
2. Category scores (cardiovascular, metabolic, body_composition, each 0-10)
3. Top 3 achievements (positive findings)
4. Top 3 concerns (areas needing attention)
5. 5-7 personalized recommendations with priority levels (high/medium/low)

Respond in JSON format with Russian text:
{
  "overall_score": 8.2,
  "health_categories": {
    "cardiovascular": 8.5,
    "metabolic": 7.8,
    "body_composition": 8.0,
    "recovery": 7.5
  },
  "summary": "краткое описание общего состояния здоровья",
  "achievements": ["достижение 1", "достижение 2", "достижение 3"],
  "concerns": ["проблема 1", "проблема 2"],
  "recommendations": [
    {
      "category": "nutrition",
      "priority": "high",
      "action": "конкретное действие",
      "reasoning": "обоснование"
    }
  ]
}`;

  console.log('[HEALTH-ANALYSIS] Calling Lovable AI Gateway...');

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-pro',
      messages: [
        {
          role: 'system',
          content: 'You are a medical data analyst. Analyze health data and provide structured insights in Russian. Always respond with valid JSON only, no markdown formatting.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000
    }),
  });

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    console.error('[HEALTH-ANALYSIS] AI Gateway error:', aiResponse.status, errorText);
    throw new Error(`AI Gateway error: ${aiResponse.status}`);
  }

  const aiData = await aiResponse.json();
  let analysisResult;

  try {
    const content = aiData.choices[0].message.content;
    const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    analysisResult = JSON.parse(jsonContent);
  } catch (parseError) {
    console.error('[HEALTH-ANALYSIS] Failed to parse AI response:', parseError);
    throw new Error('Failed to parse AI analysis result');
  }

  console.log('[HEALTH-ANALYSIS] AI analysis complete, saving to database...');

  // Save analysis to database
  const { data: savedAnalysis, error: saveError } = await supabase
    .from('health_analyses')
    .insert({
      user_id: user!.id,
      overall_score: analysisResult.overall_score,
      health_categories: analysisResult.health_categories,
      summary: analysisResult.summary,
      achievements: analysisResult.achievements,
      concerns: analysisResult.concerns,
      recommendations: analysisResult.recommendations,
      documents_analyzed: documents.length,
      date_range_start: documents[documents.length - 1]?.document_date,
      date_range_end: documents[0]?.document_date,
      ai_model: 'gemini-2.5-pro'
    })
    .select()
    .single();

  if (saveError) {
    console.error('[HEALTH-ANALYSIS] Error saving analysis:', saveError);
    throw saveError;
  }

  console.log('[HEALTH-ANALYSIS] ✓ Health analysis saved successfully');

  return jsonResponse({
    success: true,
    analysis: savedAnalysis
  });
}));
