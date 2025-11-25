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

    // ============================================================
    // STAGE 1: DOWNLOAD PDF
    // ============================================================
    console.log('[PARSE-LAB-REPORT] 📄 Stage 1/4: Downloading PDF from storage');

    let fileData: Blob;
    let pdfBuffer: ArrayBuffer;
    let uint8Array: Uint8Array;
    
    try {
      // Download file from storage (works with private buckets)
      const { data: downloadedFile, error: downloadError } = await supabase.storage
        .from('medical-documents')
        .download(document.storage_path);

      if (downloadError) {
        console.error('[PARSE-LAB-REPORT] ❌ Download error:', downloadError);
        throw new Error(`Failed to download PDF: ${downloadError.message}`);
      }
      
      if (!downloadedFile) {
        throw new Error('Empty file data received from storage');
      }
      
      fileData = downloadedFile;
      console.log(`[PARSE-LAB-REPORT] ✓ Downloaded file: ${fileData.size} bytes, type: ${fileData.type}`);

      // Validate PDF file
      if (fileData.type !== 'application/pdf') {
        console.warn(`[PARSE-LAB-REPORT] ⚠️ Warning: Expected PDF but got ${fileData.type}`);
      }

      pdfBuffer = await fileData.arrayBuffer();
      console.log(`[PARSE-LAB-REPORT] ✓ ArrayBuffer size: ${pdfBuffer.byteLength} bytes`);
      
      // Verify PDF header
      uint8Array = new Uint8Array(pdfBuffer);
      const header = String.fromCharCode(...uint8Array.slice(0, 4));
      
      if (header !== '%PDF') {
        const errorDetails = {
          error_type: 'pdf_parse',
          error_message: `Invalid PDF file: header is "${header}" instead of "%PDF"`,
          timestamp: new Date().toISOString(),
          pdf_info: {
            file_size: fileData.size,
            mime_type: fileData.type,
            has_valid_header: false,
          }
        };
        
        await supabase
          .from('medical_documents')
          .update({ 
            processing_status: 'error',
            processing_error: 'Invalid PDF file format',
            processing_error_details: errorDetails,
            processing_completed_at: new Date().toISOString()
          })
          .eq('id', documentId);
        
        throw new Error(`Invalid PDF file: header is "${header}" instead of "%PDF"`);
      }
      
      console.log('[PARSE-LAB-REPORT] ✓ PDF header validated');
      
    } catch (downloadError: any) {
      console.error('[PARSE-LAB-REPORT] ❌ PDF Download/Validation failed:', downloadError);
      
      const errorDetails = {
        error_type: downloadError.message?.includes('Invalid PDF') ? 'pdf_parse' : 'pdf_download',
        error_message: downloadError.message,
        stack_trace: downloadError.stack?.substring(0, 1000),
        timestamp: new Date().toISOString(),
        storage_path: document.storage_path,
      };
      
      await supabase
        .from('medical_documents')
        .update({ 
          processing_status: 'error',
          processing_error: downloadError.message || 'Failed to download PDF from storage',
          processing_error_details: errorDetails,
          processing_completed_at: new Date().toISOString()
        })
        .eq('id', documentId);
      
      throw downloadError;
    }
    
    // Check LOVABLE_API_KEY
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // ============================================================
    // STAGE 2: CONVERT PDF TO BASE64
    // ============================================================
    console.log('[PARSE-LAB-REPORT] 🔄 Stage 2/5: Converting PDF to base64');
    
    let base64Pdf: string;
    try {
      // Convert PDF to base64 for Gemini (in chunks to avoid stack overflow)
      const chunkSize = 8192;
      let binaryString = '';
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        binaryString += String.fromCharCode(...chunk);
      }
      base64Pdf = btoa(binaryString);
      console.log(`[PARSE-LAB-REPORT] ✓ Converted PDF to base64: ${base64Pdf.length} characters`);
    } catch (conversionError: any) {
      console.error('[PARSE-LAB-REPORT] ❌ Base64 conversion failed:', conversionError);
      
      const errorDetails = {
        error_type: 'pdf_parse',
        error_message: `Failed to convert PDF to base64: ${conversionError.message}`,
        timestamp: new Date().toISOString(),
        pdf_info: {
          file_size: pdfBuffer.byteLength,
          mime_type: fileData.type,
          has_valid_header: true,
        }
      };
      
      await supabase
        .from('medical_documents')
        .update({ 
          processing_status: 'error',
          processing_error: 'Failed to convert PDF for AI processing',
          processing_error_details: errorDetails,
          processing_completed_at: new Date().toISOString()
        })
        .eq('id', documentId);
      
      throw conversionError;
    }

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

IMPORTANT: If the document contains ANY of these keywords, classify as lab_urine:
- Общий анализ мочи, ОАМ, OAM, Urinalysis
- Анализ мочи, исследование мочи, моча, urine, analyse d'urine
- pH мочи, удельный вес мочи, specific gravity, плотность мочи
- Белок в моче, protein urine, протеинурия, proteinuria
- Глюкоза в моче, glucose urine, глюкозурия, glucosuria
- Кетоновые тела, ketones, кетоны, ацетон
- Лейкоциты в моче, эритроциты в моче, leukocytes, erythrocytes
- Нитриты, уробилиноген, билирубин мочи, nitrites, urobilinogen
- Осадок мочи, микроскопия мочи, sediment, microscopy
- Бактерии в моче, цилиндры, кристаллы, bacteria, casts, crystals

IMPORTANT: If the document contains ANY of these keywords, classify as imaging_report:
- УЗИ, ультразвуковое, ultrasound, echography, эхография
- МРТ, MRI, магнитно-резонансная, magnetic resonance
- КТ, CT scan, компьютерная томография, computed tomography
- Рентген, X-ray, рентгенография, radiography
- Гастроскопия, колоноскопия, эндоскопия, gastroscopy, colonoscopy, endoscopy
- Эхокардиография, ЭхоКГ, echocardiography, cardiac ultrasound
- Органов, малого таза, брюшной полости, pelvis, abdomen, abdominal
- Молочных желез, щитовидной железы, breast, thyroid

IMPORTANT: If the document contains ANY of these keywords, classify as fitness_report:
- VO2max, VO2 max, МПК, maximal oxygen uptake
- Lactate threshold, лактатный порог, lactate curve
- Anaerobic threshold, анаэробный порог, AT, АнП
- Heart rate zones, пульсовые зоны, HR zones
- Exercise test, нагрузочный тест, эргометрия, ergometry
- Blood lactate, лактат крови, lactate concentration
- Training zones, тренировочные зоны

Return ONLY valid JSON (no markdown):
{
  "category": "lab_blood" | "lab_urine" | "lab_microbiome" | "imaging_report" | "fitness_report" | "clinical_note",
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

BIOMARKER NAME STANDARDIZATION - CRITICAL FOR MATCHING:
Match these EXACT canonical names when you recognize the biomarker (case-insensitive):

COMPLETE BLOOD COUNT (CBC):
- WBC, White Blood Cells, Leucocytes, Leukocytes, Globules blancs → "White Blood Cell Count"
- RBC, Red Blood Cells, Erythrocytes, Globules rouges → "Red Blood Cell Count"
- Hemoglobin, HGB, Hb, Hémoglobine → "Hemoglobin"
- Hematocrit, HCT, Hématocrite → "Hematocrit"
- Platelets, PLT, Thrombocytes, Plaquettes → "Platelet Count"
- Neutrophils, Neutrophiles, Neutros → "Neutrophils"
- Lymphocytes, Lymphs, Lympho → "Lymphocytes"
- Monocytes, Mono → "Monocytes"
- Eosinophils, Eos, Éosinophiles → "Eosinophils"
- Basophils, Baso, Basophiles → "Basophils"

METABOLIC PANEL:
- Glucose, Blood Glucose, Blood Sugar, Glycémie → "Glucose"
- HbA1c, Hemoglobin A1c, A1C, Hémoglobine glyquée → "HbA1c"
- Creatinine, CREAT, Créatinine → "Creatinine"
- BUN, Blood Urea Nitrogen, Urea, Urée → "Blood Urea Nitrogen"
- Sodium, Na, Natrémie → "Sodium"
- Potassium, K, Kaliémie → "Potassium"

LIPID PANEL:
- Cholesterol Total, Total Cholesterol, Cholestérol total, Cholestérol → "Cholesterol - Total"
- HDL, HDL-C, HDL Cholesterol, Cholestérol HDL → "HDL Cholesterol"
- LDL, LDL-C, LDL Cholesterol, Cholestérol LDL → "LDL Cholesterol"
- Triglycerides, TG, TRIG, Triglycérides → "Triglycerides"

LIVER FUNCTION:
- ALT, SGPT, Alanine Aminotransferase, GPT, TGP, ALAT → "ALT"
- AST, SGOT, Aspartate Aminotransferase, GOT, TGO, ASAT → "AST"
- ALP, Alkaline Phosphatase, Phosphatase Alcaline → "Alkaline Phosphatase"
- Bilirubin Total, Total Bilirubin, Bilirubine totale → "Bilirubin - Total"
- GGT, Gamma-Glutamyl Transferase, Gamma GT → "GGT"

THYROID FUNCTION:
- TSH, Thyroid Stimulating Hormone, Thyréostimuline → "TSH"
- Free T4, FT4, T4 Free, T4 Libre → "Free T4"
- Free T3, FT3, T3 Free, T3 Libre → "Free T3"

HORMONES:
- Testosterone, Total Testosterone, Testostérone → "Testosterone"
- Free Testosterone, Testosterone Free, Testostérone libre → "Testosterone - Free"
- Estradiol, E2, Oestradiol, Œstradiol → "Estradiol"
- Cortisol, CORTISOL → "Cortisol"
- Prolactin, PROLACTIN, Prolactine → "Prolactin"
- FSH, Follicle Stimulating Hormone, FOLLICLE STIM. HORMONE → "FSH"
- LH, Luteinizing Hormone, LUTEINISING HORMONE → "LH"
- SHBG, Sex Hormone Binding Globulin, SEX HORMONE BINDING GLOB → "SHBG"

INFLAMMATION & CARDIAC:
- CRP, C-Reactive Protein, CRP - High sensitivity, hs-CRP → "CRP"
- Lp-PLA2, LP-PLA2, Lp PLA2 - Cardiac Marker → "Lipoprotein-associated phospholipase A2"

VITAMINS & MINERALS:
- Vitamin D, 25-OH Vitamin D, 25(OH)D, Vitamine D → "Vitamin D"
- Vitamin B12, B12, Cobalamin, Vitamine B12 → "Vitamin B12"
- Ferritin, FERRITIN, Ferritine → "Ferritin"
- Iron, Fe, Fer sérique → "Iron"

PSA (PROSTATE):
- PSA, Prostate Specific Antigen, Prostate Specific Ag (Total), PSA (Total) → "PSA"
- Free PSA, PSA Free, Prostate Specific Ag (Free), PSA (Free) → "PSA - Free"

URINALYSIS BIOMARKER MAPPINGS (for lab_urine documents):
Always map these urine test names to canonical IDs:
- pH, pH мочи, Кислотность, Acidité urinaire, Urine pH, Reaction → "urine_ph"
- Удельный вес, Плотность, Specific gravity, SG, Densité → "urine_specific_gravity"
- Белок, Протеин, Protein, PRO, Protéines, Proteinuria → "urine_protein"
- Глюкоза, GLU, Glucose, Sugar, Glucosuria → "urine_glucose"
- Кетоны, Кетоновые тела, KET, Ketones, Acetone → "urine_ketones"
- Кровь, BLD, Blood, Скрытая кровь, Occult blood, Hematuria → "urine_blood"
- Лейкоциты, LEU, WBC, Leukocytes, White blood cells → "urine_leukocytes"
- Эритроциты, RBC, Erythrocytes, Red blood cells → "urine_erythrocytes"
- Нитриты, NIT, Nitrites, Nitrite → "urine_nitrites"
- Уробилиноген, URO, Urobilinogen, UBG → "urine_urobilinogen"
- Билирубин, BIL, Bilirubin → "urine_bilirubin"
- Цвет, Color, Colour, Окраска → "urine_color"
- Прозрачность, Clarity, Appearance, Turbidity → "urine_clarity"
- Эпителий, Эпителиальные клетки, Epithelial cells, EPI → "urine_epithelial_cells"
- Бактерии, Bacteria, Microbes → "urine_bacteria"
- Цилиндры, Casts, Hyaline casts → "urine_casts"
- Кристаллы, Crystals, Соли, Salts → "urine_crystals"

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
    } 
    // ============================================================
    // PARSER C: FITNESS REPORT (VO2max, Lactate, Heart Rate Zones)
    // ============================================================
    else if (documentCategory === 'fitness_report') {
      console.log('[PARSE-LAB-REPORT] Processing fitness_report document...');
      
      const fitnessPrompt = `You are a fitness performance test analyzer. Extract metrics from VO2max, lactate threshold, and exercise tests.

IMPORTANT: Return ONLY valid JSON (no markdown, no code blocks):
{
  "test_type": "VO2max" | "Lactate Threshold" | "Exercise Test",
  "test_date": "YYYY-MM-DD",
  "metrics": [
    {
      "name": "VO2max",
      "value": 52.5,
      "unit": "ml/kg/min",
      "category": "cardiorespiratory"
    },
    {
      "name": "Lactate Threshold HR",
      "value": 165,
      "unit": "bpm",
      "category": "metabolic"
    },
    {
      "name": "Anaerobic Threshold Power",
      "value": 280,
      "unit": "W",
      "category": "power"
    },
    {
      "name": "Max Heart Rate",
      "value": 185,
      "unit": "bpm",
      "category": "cardiorespiratory"
    }
  ],
  "ai_summary": "Brief performance assessment with key findings"
}

Extract all available metrics. Common metric names:
- VO2max, VO2 Max, Maximal Oxygen Uptake
- Lactate Threshold HR, LT Heart Rate
- Anaerobic Threshold Power, AT Power
- Max Heart Rate, HRmax, Maximum HR
- Power at Lactate Threshold
- Ventilatory Threshold`;

      const fitnessResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-pro',
          messages: [
            { role: 'system', content: fitnessPrompt },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Extract fitness metrics from this performance test report:' },
                { type: 'image_url', image_url: { url: `data:application/pdf;base64,${base64Pdf}` } }
              ]
            }
          ],
          max_tokens: 8000
        })
      });

      if (!fitnessResponse.ok) {
        throw new Error(`Gemini API error: ${fitnessResponse.status} ${fitnessResponse.statusText}`);
      }

      const fitnessData = await fitnessResponse.json();
      let fitnessText = fitnessData.choices[0].message.content;
      
      // Clean markdown wrapper
      fitnessText = fitnessText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
      
      // Fallback: extract JSON from text
      if (!fitnessText.startsWith('{')) {
        const firstBrace = fitnessText.indexOf('{');
        const lastBrace = fitnessText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          fitnessText = fitnessText.substring(firstBrace, lastBrace + 1);
        }
      }
      
      const fitnessExtracted = JSON.parse(fitnessText);
      aiSummary = fitnessExtracted.ai_summary;
      
      console.log(`[PARSE-LAB-REPORT] Extracted ${fitnessExtracted.metrics?.length || 0} fitness metrics`);

      // Save metrics to lab_test_results
      for (const metric of fitnessExtracted.metrics || []) {
        try {
          // Try to match with biomarker_master
          const { data: biomarkerMaster } = await supabase
            .from('biomarker_master')
            .select('*')
            .ilike('canonical_name', metric.name.replace(/\s+/g, '_').toLowerCase())
            .maybeSingle();

          const { data: insertedResult, error: insertError } = await supabase
            .from('lab_test_results')
            .insert({
              user_id: user.id,
              document_id: documentId,
              biomarker_id: biomarkerMaster?.id || null,
              raw_test_name: metric.name,
              value: metric.value,
              text_value: null,
              unit: metric.unit || '-',
              normalized_value: metric.value,
              normalized_unit: metric.unit || '-',
              laboratory_name: 'Performance Test',
              test_date: fitnessExtracted.test_date || document.uploaded_at?.split('T')[0]
            })
            .select()
            .single();

          if (insertError) {
            console.error(`[PARSE-LAB-REPORT] Error inserting fitness metric ${metric.name}:`, insertError);
          } else {
            results.push(insertedResult);
            console.log(`[PARSE-LAB-REPORT] ✓ Saved fitness metric: ${metric.name} = ${metric.value} ${metric.unit}`);
          }
        } catch (metricError) {
          console.error(`[PARSE-LAB-REPORT] Error processing fitness metric ${metric.name}:`, metricError);
        }
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
    
    // Update medical document - only mark as processed if we actually saved results
    const shouldMarkProcessed = results && results.length > 0;
    
    await supabase
      .from('medical_documents')
      .update({
        document_date: testDate,
        ai_processed: shouldMarkProcessed,
        processing_status: shouldMarkProcessed ? 'completed' : 'error',
        processing_completed_at: shouldMarkProcessed ? new Date().toISOString() : null,
        processing_error: shouldMarkProcessed ? null : 'No data extracted from document',
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
    console.error('[PARSE-LAB-REPORT] ❌ Fatal Error:', error);
    console.error('[PARSE-LAB-REPORT] 📊 Error type:', error.name);
    console.error('[PARSE-LAB-REPORT] 📝 Error message:', error.message);
    console.error('[PARSE-LAB-REPORT] 🔍 Stack trace:', error.stack);
    
    // Determine error type
    let errorType: string = 'unknown';
    if (error.message?.includes('Failed to download') || error.message?.includes('download')) {
      errorType = 'pdf_download';
    } else if (error.message?.includes('Invalid PDF') || error.message?.includes('PDF')) {
      errorType = 'pdf_parse';
    } else if (error.message?.includes('Gemini') || error.message?.includes('AI') || error.message?.includes('gateway')) {
      errorType = 'gemini_api';
    } else if (error.message?.includes('JSON') || error.message?.includes('parse')) {
      errorType = 'json_parse';
    } else if (error.message?.includes('database') || error.message?.includes('Supabase')) {
      errorType = 'database_save';
    }
    
    // Build detailed error object
    const errorDetails: any = {
      error_type: errorType,
      error_message: error.message || error.toString(),
      stack_trace: error.stack?.substring(0, 1000), // Limit stack trace
      timestamp: new Date().toISOString(),
    };
    
    // Try to get documentId from request
    let documentId: string | undefined;
    try {
      const body = await req.json();
      documentId = body.documentId;
    } catch {
      console.error('[PARSE-LAB-REPORT] Could not parse request body for documentId');
    }
    
    // Update document with detailed error
    if (documentId) {
      console.log(`[PARSE-LAB-REPORT] 💾 Saving error details for document ${documentId}`);
      
      await supabase
        .from('medical_documents')
        .update({ 
          processing_status: 'error',
          processing_error: error.message || 'Unknown error occurred',
          processing_error_details: errorDetails,
          processing_completed_at: new Date().toISOString()
        })
        .eq('id', documentId);
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        error_type: errorType,
        details: errorDetails
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
