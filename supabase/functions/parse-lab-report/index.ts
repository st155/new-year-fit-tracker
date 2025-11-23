import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { corsHeaders } from '../_shared/cors.ts';

const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Helper function to normalize biomarker names for fuzzy matching
function normalizeBiomarkerName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[PARSE-LAB-REPORT] Starting lab report parsing');

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
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

    const { documentId } = await req.json();

    if (!documentId) {
      throw new Error('Document ID is required');
    }

    console.log(`[PARSE-LAB-REPORT] Processing document ${documentId} for user ${user.id}`);

    // Fetch document
    const { data: document, error: docError } = await supabase
      .from('medical_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();

    if (docError || !document) {
      throw new Error('Document not found');
    }

    // Update processing status to "processing"
    await supabase
      .from('medical_documents')
      .update({ 
        processing_status: 'processing',
        processing_started_at: new Date().toISOString()
      })
      .eq('id', documentId);

    console.log('[PARSE-LAB-REPORT] 📄 Stage 1/4: Downloading PDF from storage');

    // Download file from storage (works with private buckets)
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('medical-documents')
      .download(document.storage_path);

    if (downloadError || !fileData) {
      console.error('[PARSE-LAB-REPORT] Download failed:', downloadError);
      throw new Error('Failed to download document from storage');
    }

    console.log(`[PARSE-LAB-REPORT] Downloaded file: ${fileData.size} bytes, type: ${fileData.type}`);

    // Validate PDF file
    if (fileData.type !== 'application/pdf') {
      console.warn(`[PARSE-LAB-REPORT] Warning: Expected PDF but got ${fileData.type}`);
    }

    const pdfBuffer = await fileData.arrayBuffer();
    console.log(`[PARSE-LAB-REPORT] ArrayBuffer size: ${pdfBuffer.byteLength} bytes`);
    
    // Verify PDF header
    const uint8Array = new Uint8Array(pdfBuffer);
    const header = String.fromCharCode(...uint8Array.slice(0, 4));
    if (header !== '%PDF') {
      throw new Error(`Invalid PDF file: header is "${header}" instead of "%PDF"`);
    }
    
    // Check LOVABLE_API_KEY
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Convert PDF to base64 for Gemini (in chunks to avoid stack overflow)
    console.log('[PARSE-LAB-REPORT] 🔄 Stage 2/5: Converting PDF to base64');
    const chunkSize = 8192;
    let binaryString = '';
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      binaryString += String.fromCharCode(...chunk);
    }
    const base64Pdf = btoa(binaryString);
    console.log(`[PARSE-LAB-REPORT] Converted PDF to base64: ${base64Pdf.length} characters`);

    // ============================================================
    // STEP 1: AI DOCUMENT CLASSIFIER
    // ============================================================
    console.log('[PARSE-LAB-REPORT] 🔍 Stage 3/5: Classifying document type...');

    const classificationResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a medical document classifier. Analyze the first page of the PDF and determine its category.

Categories:
- lab_blood: Blood test results (CBC, lipid panel, chemistry panel, etc.)
- lab_urine: Urinalysis or urine test results
- lab_microbiome: Gut microbiome, stool analysis
- imaging_report: MRI, CT scan, ultrasound, X-ray reports
- clinical_note: Doctor's notes, consultation summary

Return ONLY valid JSON (no markdown):
{
  "category": "lab_blood" | "lab_urine" | "lab_microbiome" | "imaging_report" | "clinical_note",
  "confidence_score": 0-100,
  "reasoning": "Brief explanation of classification"
}`
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Classify this medical document:' },
              {
                type: 'image_url',
                image_url: { url: `data:application/pdf;base64,${base64Pdf}` }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.1,
      }),
    });

    const classificationData = await classificationResponse.json();
    const classificationContent = classificationData.choices?.[0]?.message?.content || '{}';
    
    let classification;
    try {
      let jsonString = classificationContent.trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      classification = JSON.parse(jsonString);
      console.log(`[PARSE-LAB-REPORT] ✓ Classified as: ${classification.category} (confidence: ${classification.confidence_score}%)`);
      console.log(`[PARSE-LAB-REPORT] Reasoning: ${classification.reasoning}`);
    } catch (e) {
      console.warn('[PARSE-LAB-REPORT] Failed to parse classification, defaulting to lab_blood');
      classification = { category: 'lab_blood', confidence_score: 50, reasoning: 'Failed to classify' };
    }

    const documentCategory = classification.category;

    // Save category to medical_documents
    await supabase
      .from('medical_documents')
      .update({ category: documentCategory })
      .eq('id', documentId);

    // ============================================================
    // AUTO-INVOKE DOCTOR RECOMMENDATIONS PARSER
    // ============================================================
    if (documentCategory === 'clinical_note' || documentCategory === 'prescription') {
      console.log('[PARSE-LAB-REPORT] 💊 Document is clinical note/prescription - invoking parse-doctor-recommendations...');
      try {
        const rxResponse = await supabase.functions.invoke('parse-doctor-recommendations', {
          body: { documentId }
        });
        
        if (rxResponse.error) {
          console.error('[PARSE-LAB-REPORT] ⚠️ Rx parsing failed:', rxResponse.error);
        } else {
          const rxData = rxResponse.data as { count?: number };
          console.log(`[PARSE-LAB-REPORT] ✓ Rx parsing complete: ${rxData?.count || 0} recommendations extracted`);
        }
      } catch (rxError) {
        console.error('[PARSE-LAB-REPORT] ⚠️ Rx parser invocation error:', rxError);
        // Non-blocking: continue with main document processing
      }
    }

    // ============================================================
    // STEP 2: ROUTE TO SPECIALIZED PARSERS
    // ============================================================
    console.log(`[PARSE-LAB-REPORT] 🤖 Stage 4/5: Parsing ${documentCategory} document with specialized parser...`);

    let extractedData;
    let aiSummary = '';
    
    // ============================================================
    // PARSER A: LAB BLOOD/URINE (ENHANCED)
    // ============================================================
    if (documentCategory === 'lab_blood' || documentCategory === 'lab_urine') {
      const geminiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'system',
            content: `You are a medical lab report parser. Extract ALL biomarkers from ${documentCategory === 'lab_urine' ? 'urinalysis' : 'blood test'} report PDF in JSON format.

QUALITATIVE RESULTS HANDLING:
- For qualitative results like "Negative", "Positive", "Trace", "Present", "Absent":
  - Set value to null
  - Include the text result in "text_value" field
- Examples: Glucose: "Negative", Protein: "Trace", Blood: "Positive"

CRITICAL INSTRUCTIONS FOR DATE EXTRACTION:
- Find the test/sample collection date in the document
- Look for: "Date du prélèvement", "Test Date", "Collection Date", "Datum", "Date de l'examen"
- Format as YYYY-MM-DD (e.g., if you see "14.11.2025", convert to "2025-11-14")
- NEVER use today's date - only the date from the document!
- This date is CRITICAL for tracking trends over time

BIOMARKER NAME STANDARDIZATION - Return "canonical_name" field:
Use these canonical names when you recognize them (lowercase, no special chars):
- WBC, White Blood Cells → "wbc"
- RBC, Red Blood Cells → "rbc"
- Hemoglobin, HGB, Hgb → "hemoglobin"
- Hematocrit, HCT → "hematocrit"
- Platelets, PLT → "platelets"
- Neutrophils → "neutrophils"
- Lymphocytes → "lymphocytes"
- Monocytes → "monocytes"
- Eosinophils → "eosinophils"
- Basophils → "basophils"
- Glucose, Blood Sugar → "glucose"
- Cholesterol Total, Total Cholesterol → "cholesterol_total"
- HDL, HDL-C → "hdl"
- LDL, LDL-C → "ldl"
- Triglycerides → "triglycerides"
- ALT, SGPT → "alt"
- AST, SGOT → "ast"
- Creatinine → "creatinine"
- TSH → "tsh"
- Vitamin D, 25-OH Vitamin D → "vitamin_d"

Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "laboratory": "Lab name",
  "test_date": "YYYY-MM-DD",
  "patient_info": {
    "name": "Patient name if available",
    "date_of_birth": "DOB if available"
  },
  "biomarkers": [
    {
      "name": "Biomarker name as written in the report",
      "canonical_name": "standardized_lowercase_name",
      "value": numeric_value_or_null,
      "text_value": "text result if qualitative (e.g., 'Negative', 'Trace')",
      "unit": "unit as string",
      "reference_range_min": numeric_value_or_null,
      "reference_range_max": numeric_value_or_null,
      "reference_range_text": "original text like '<6.2' or '4.0-10.0'",
      "category": "category if visible (Lipides, Hormones, etc)"
    }
  ]
}

Extract every single biomarker value you can find, even if small or in footnotes.`
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Parse this lab report PDF and extract all biomarker data:'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:application/pdf;base64,${base64Pdf}`
                  }
                }
              ]
            }
          ],
          max_tokens: 16000,
          temperature: 0.1,
        }),
      });

      const geminiData = await geminiResponse.json();

      if (!geminiData.choices?.[0]?.message?.content) {
        console.error('[PARSE-LAB-REPORT] Gemini response error:', geminiData);
        throw new Error('Failed to parse PDF with Gemini');
      }

      const content = geminiData.choices[0].message.content;
      const finishReason = geminiData.choices[0].finish_reason;

      if (finishReason === 'length') {
        console.warn('[PARSE-LAB-REPORT] ⚠️ Gemini response was truncated due to max_tokens limit');
      }

      console.log(`[PARSE-LAB-REPORT] Gemini response: ${content.length} chars, finish_reason: ${finishReason}`);

      try {
        let jsonString = content.trim()
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();
        
        if (!jsonString.startsWith('{')) {
          const firstBrace = jsonString.indexOf('{');
          const lastBrace = jsonString.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            jsonString = jsonString.substring(firstBrace, lastBrace + 1);
          }
        }
        
        extractedData = JSON.parse(jsonString);
        console.log(`[PARSE-LAB-REPORT] ✓ Extracted ${extractedData.biomarkers?.length || 0} biomarkers`);
      } catch (parseError) {
        console.error('[PARSE-LAB-REPORT] Parse error:', parseError.message);
        throw new Error(`Failed to parse structured data: ${parseError.message}`);
      }

      aiSummary = `Извлечено ${extractedData.biomarkers?.length || 0} биомаркеров из ${extractedData.laboratory || 'лаборатории'}`;
    }
    
    // ============================================================
    // PARSER B: IMAGING REPORT (NEW)
    // ============================================================
    else if (documentCategory === 'imaging_report') {
      const imagingResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-pro',
          messages: [
            {
              role: 'system',
              content: `You are a medical imaging report analyzer. Extract summary and key findings from MRI, CT, ultrasound, or X-ray reports.

Return ONLY valid JSON (no markdown):
{
  "report_type": "MRI" | "CT" | "Ultrasound" | "X-ray",
  "study_date": "YYYY-MM-DD",
  "body_regions": ["Liver", "Kidney", etc.],
  "ai_summary": "Brief 50-100 word summary of the entire report",
  "findings": [
    {
      "body_part": "Liver",
      "finding_text": "Mild hepatic steatosis detected",
      "severity": "normal" | "mild" | "moderate" | "severe",
      "tags": ["liver", "fatty_liver"]
    }
  ]
}`
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Analyze this imaging report:' },
                {
                  type: 'image_url',
                  image_url: { url: `data:application/pdf;base64,${base64Pdf}` }
                }
              ]
            }
          ],
          max_tokens: 8000,
          temperature: 0.1,
        }),
      });

      const imagingData = await imagingResponse.json();
      const imagingContent = imagingData.choices?.[0]?.message?.content || '{}';

      try {
        let jsonString = imagingContent.trim()
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();
        
        if (!jsonString.startsWith('{')) {
          const firstBrace = jsonString.indexOf('{');
          const lastBrace = jsonString.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1) {
            jsonString = jsonString.substring(firstBrace, lastBrace + 1);
          }
        }
        
        extractedData = JSON.parse(jsonString);
        aiSummary = extractedData.ai_summary || 'Imaging report processed';
        console.log(`[PARSE-LAB-REPORT] ✓ Extracted ${extractedData.findings?.length || 0} findings`);
      } catch (e) {
        console.error('[PARSE-LAB-REPORT] Failed to parse imaging data:', e);
        extractedData = { findings: [] };
        aiSummary = 'Failed to parse imaging report';
      }
    } else {
      // Unsupported category
      throw new Error(`Unsupported document category: ${documentCategory}`);
    }

    // Fetch all biomarker aliases for fuzzy matching
    const { data: aliases, error: aliasesError } = await supabase
      .from('biomarker_aliases')
      .select('*, biomarker_master(*)');

    if (aliasesError) {
      console.error('[PARSE-LAB-REPORT] Error fetching aliases:', aliasesError);
    }

    // ============================================================
    // SAVE RESULTS TO DATABASE
    // ============================================================
    console.log('[PARSE-LAB-REPORT] 💾 Stage 5/5: Saving results to database...');

    const results = [];
    let matchedCount = 0;
    let unmatchedCount = 0;

    // Process LAB results (blood/urine)
    if (documentCategory === 'lab_blood' || documentCategory === 'lab_urine') {
      // Fetch all biomarker aliases for fuzzy matching
      const { data: aliases, error: aliasesError } = await supabase
        .from('biomarker_aliases')
        .select('*, biomarker_master(*)');

      if (aliasesError) {
        console.error('[PARSE-LAB-REPORT] Error fetching aliases:', aliasesError);
      }

      // Process each biomarker
      for (const biomarker of extractedData.biomarkers || []) {
        try {
          console.log(`[PARSE-LAB-REPORT] Processing biomarker: ${biomarker.name}`);

          let biomarkerMaster = null;
          let matchedStatus = 'unmatched';
          let confidenceScore = 0;

          // Try matching by canonical_name from Gemini
          if (biomarker.canonical_name) {
            const normalizedCanonical = normalizeBiomarkerName(biomarker.canonical_name);
            const canonicalMatch = aliases?.find(a => 
              a.alias_normalized === normalizedCanonical
            );
            if (canonicalMatch) {
              biomarkerMaster = canonicalMatch.biomarker_master;
              matchedStatus = 'verified';
              confidenceScore = 95;
              console.log(`[PARSE-LAB-REPORT] ✓ Matched via canonical_name: ${biomarker.name} → ${biomarker.canonical_name}`);
            }
          }

          // Fuzzy matching through normalized aliases
          if (!biomarkerMaster) {
            const normalizedInput = normalizeBiomarkerName(biomarker.name);
            const fuzzyMatch = aliases?.find(a => 
              a.alias_normalized === normalizedInput
            );
            if (fuzzyMatch) {
              biomarkerMaster = fuzzyMatch.biomarker_master;
              matchedStatus = 'fuzzy_match';
              confidenceScore = 75;
              console.log(`[PARSE-LAB-REPORT] ✓ Matched via fuzzy alias: ${biomarker.name}`);
            }
          }

          if (biomarkerMaster) {
            matchedCount++;
          } else {
            unmatchedCount++;
            confidenceScore = 30;
            console.log(`[PARSE-LAB-REPORT] ⚠️ No match found for: ${biomarker.name}`);
          }

          // Handle qualitative vs quantitative results
          const isQualitative = biomarker.text_value !== undefined && biomarker.text_value !== null;
          let normalizedValue = isQualitative ? null : biomarker.value;
          let normalizedUnit = biomarker.unit;

          if (biomarkerMaster && !isQualitative && biomarker.value !== null) {
            normalizedUnit = biomarkerMaster.standard_unit;
            
            const conversionFactors = biomarkerMaster.conversion_factors || {};
            if (biomarker.unit !== biomarkerMaster.standard_unit && conversionFactors[biomarker.unit]) {
              normalizedValue = biomarker.value * conversionFactors[biomarker.unit];
              console.log(`[PARSE-LAB-REPORT] Converted ${biomarker.value} ${biomarker.unit} to ${normalizedValue} ${normalizedUnit}`);
            }
          }

          // Insert into lab_test_results
          const { data: insertedResult, error: insertError } = await supabase
            .from('lab_test_results')
            .insert({
              user_id: user.id,
              document_id: documentId,
              biomarker_id: biomarkerMaster?.id || null,
              raw_test_name: biomarker.name,
              value: isQualitative ? null : biomarker.value,
              text_value: biomarker.text_value || null,
              unit: biomarker.unit || '-',
              normalized_value: normalizedValue,
              normalized_unit: normalizedUnit,
              laboratory_name: extractedData.laboratory,
              ref_range_min: biomarker.reference_range_min,
              ref_range_max: biomarker.reference_range_max,
              ref_range_unit: biomarker.unit,
              ref_range_source: 'lab_provided',
              test_date: extractedData.test_date,
            })
            .select()
            .single();

          if (insertError) {
            console.error(`[PARSE-LAB-REPORT] Error inserting biomarker ${biomarker.name}:`, insertError);
          } else {
            results.push({
              ...insertedResult,
              matched_status: matchedStatus,
              confidence_score: confidenceScore,
              is_qualitative: isQualitative
            });
            console.log(`[PARSE-LAB-REPORT] ✓ Saved biomarker: ${biomarker.name}`);
          }
        } catch (biomarkerError) {
          console.error(`[PARSE-LAB-REPORT] Error processing biomarker ${biomarker.name}:`, biomarkerError);
        }
      }
    }
    
    // Process IMAGING results
    else if (documentCategory === 'imaging_report') {
      for (const finding of extractedData.findings || []) {
        try {
          const { data: insertedFinding, error: insertError } = await supabase
            .from('medical_findings')
            .insert({
              user_id: user.id,
              document_id: documentId,
              body_part: finding.body_part,
              finding_text: finding.finding_text,
              severity: finding.severity,
              tags: finding.tags || []
            })
            .select()
            .single();

          if (insertError) {
            console.error(`[PARSE-LAB-REPORT] Error inserting finding:`, insertError);
          } else {
            results.push(insertedFinding);
            console.log(`[PARSE-LAB-REPORT] ✓ Saved finding: ${finding.body_part} - ${finding.severity}`);
          }
        } catch (findingError) {
          console.error(`[PARSE-LAB-REPORT] Error processing finding:`, findingError);
        }
      }
    }

    // Update medical document
    const testDate = extractedData.test_date || extractedData.study_date || document.uploaded_at?.split('T')[0];
    
    if (!extractedData.test_date && !extractedData.study_date) {
      console.warn('[PARSE-LAB-REPORT] ⚠️ Test date not found in document, using upload date as fallback');
    } else {
      console.log(`[PARSE-LAB-REPORT] ✓ Using test date from document: ${testDate}`);
    }
    
    await supabase
      .from('medical_documents')
      .update({
        document_date: testDate,
        ai_processed: true,
        processing_status: 'completed',
        processing_completed_at: new Date().toISOString(),
        ai_summary: aiSummary,
        ai_extracted_data: {
          category: documentCategory,
          laboratory: extractedData.laboratory,
          report_type: extractedData.report_type,
          test_date: testDate,
          result_count: results.length,
          ai_provider: 'gemini-2.5-pro'
        }
      })
      .eq('id', documentId);

    // Invalidate AI analysis cache for lab results
    if (documentCategory === 'lab_blood' || documentCategory === 'lab_urine') {
      const biomarkerIds = results.map(r => r.biomarker_id).filter(Boolean);
      if (biomarkerIds.length > 0) {
        await supabase
          .from('biomarker_ai_analysis')
          .delete()
          .eq('user_id', user.id)
          .in('biomarker_id', biomarkerIds);
        console.log(`[PARSE-LAB-REPORT] Invalidated AI cache for ${biomarkerIds.length} biomarkers`);
      }
    }

    console.log(`[PARSE-LAB-REPORT] ✓ Completed! Saved ${results.length} results`);
    if (documentCategory === 'lab_blood' || documentCategory === 'lab_urine') {
      console.log(`[PARSE-LAB-REPORT] 📊 Match statistics: ${matchedCount} matched (${Math.round(matchedCount/results.length*100)}%), ${unmatchedCount} unmatched (${Math.round(unmatchedCount/results.length*100)}%)`);
    }

    // Enhanced response format
    return new Response(
      JSON.stringify({
        success: true,
        category: documentCategory,
        ai_summary: aiSummary,
        results: documentCategory === 'imaging_report' ? {
          findings: results
        } : {
          biomarkers: results.map(r => ({
            ...r,
            matched_status: r.matched_status,
            confidence_score: r.confidence_score,
            is_qualitative: r.is_qualitative
          }))
        },
        laboratory: extractedData.laboratory,
        test_date: testDate,
        statistics: {
          total: results.length,
          matched: matchedCount,
          unmatched: unmatchedCount
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('[PARSE-LAB-REPORT] Error:', error);
    
    // Update document with error status if we have documentId
    const { documentId } = await req.json().catch(() => ({}));
    if (documentId) {
      await supabase
        .from('medical_documents')
        .update({ 
          processing_status: 'error',
          processing_error: error.message,
          processing_completed_at: new Date().toISOString()
        })
        .eq('id', documentId);
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
