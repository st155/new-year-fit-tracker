import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse request body for forceReprocess option
    const body = await req.json().catch(() => ({}));
    const forceReprocess = body?.forceReprocess === true;

    console.log('[REPROCESS_ALL] Starting reprocessing for user:', user.id, '| force:', forceReprocess);

    // Fetch ALL documents first
    const { data: allDocuments, error: fetchError } = await supabase
      .from('medical_documents')
      .select('id, storage_path, file_name, mime_type, category')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    console.log('[REPROCESS_ALL] Fetched all documents:', allDocuments?.length || 0);

    console.log('[REPROCESS_ALL] Fetched all documents:', allDocuments?.length || 0);

    if (fetchError) {
      console.error('[REPROCESS_ALL] Error fetching documents:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch documents' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!allDocuments || allDocuments.length === 0) {
      return new Response(JSON.stringify({ message: 'No documents to process', processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Filter documents in JavaScript
    const newFormatPattern = /^(Lab|MRI|CT|USG|InBody|VO2|Photo|Rx|Program|Doc)_[A-Z][a-z]{2}\d{2}/;
    
    let documentsToProcess = forceReprocess 
      ? allDocuments 
      : allDocuments.filter(doc => !newFormatPattern.test(doc.file_name));

    console.log('[REPROCESS_ALL] Filter mode:', forceReprocess ? 'FORCE (all documents)' : 'SMART (old format only)');
    console.log('[REPROCESS_ALL] Documents to process:', documentsToProcess.length);

    // Sort to prioritize old format names first
    if (!forceReprocess) {
      documentsToProcess.sort((a, b) => {
        const aIsNew = newFormatPattern.test(a.file_name);
        const bIsNew = newFormatPattern.test(b.file_name);
        if (aIsNew && !bIsNew) return 1;  // Old names first
        if (!aIsNew && bIsNew) return -1;
        return 0;
      });
    }

    if (documentsToProcess.length === 0) {
      return new Response(JSON.stringify({ message: 'All documents already processed', processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: any) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        sendEvent('start', { total: documentsToProcess.length });

        let processed = 0;
        let succeeded = 0;
        let failed = 0;

        for (const doc of documentsToProcess) {
          try {
            // Double-check: skip if already renamed (unless forcing)
            if (!forceReprocess && newFormatPattern.test(doc.file_name)) {
              console.log(`[REPROCESS_ALL] Skipping already renamed: ${doc.file_name}`);
              processed++;
              continue;
            }

            console.log(`[REPROCESS_ALL] Processing document ${doc.id}: ${doc.file_name}`);
            sendEvent('progress', { 
              documentId: doc.id, 
              fileName: doc.file_name,
              current: processed + 1,
              total: documentsToProcess.length 
            });

            // Download file from storage
            const { data: fileData, error: downloadError } = await supabase.storage
              .from('medical-documents')
              .download(doc.storage_path);

            if (downloadError || !fileData) {
              console.error(`[REPROCESS_ALL] Download error for ${doc.id}:`, downloadError);
              failed++;
              sendEvent('error', { 
                documentId: doc.id, 
                fileName: doc.file_name,
                error: 'Failed to download file' 
              });
              processed++;
              continue;
            }

            // Convert to base64 (first ~2MB for classification)
            const arrayBuffer = await fileData.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            const maxBytes = 2 * 1024 * 1024; // 2MB
            const truncatedArray = uint8Array.slice(0, Math.min(uint8Array.length, maxBytes));

            let base64Content = '';
            const chunkSize = 8192;
            for (let i = 0; i < truncatedArray.length; i += chunkSize) {
              const chunk = truncatedArray.slice(i, i + chunkSize);
              base64Content += String.fromCharCode(...chunk);
            }
            base64Content = btoa(base64Content);

            // Step 1: Classify document
            const classifyResponse = await supabase.functions.invoke('ai-classify-document', {
              body: {
                fileName: doc.file_name,
                fileContent: base64Content,
                mimeType: doc.mime_type
              }
            });

            if (classifyResponse.error) {
              console.error(`[REPROCESS_ALL] Classification error for ${doc.id}:`, classifyResponse.error);
              failed++;
              sendEvent('error', { 
                documentId: doc.id, 
                fileName: doc.file_name,
                error: 'Classification failed' 
              });
              processed++;
              continue;
            }

            const classification = classifyResponse.data;
            console.log(`[REPROCESS_ALL] Classified ${doc.id} as ${classification.document_type}`);

            // Step 2: Generate new filename
            const renameResponse = await supabase.functions.invoke('ai-rename-document', {
              body: {
                fileName: doc.file_name,
                documentType: classification.document_type,
                fileContent: base64Content
              }
            });

            const newFileName = renameResponse.data?.suggestedName || doc.file_name;
            console.log(`[REPROCESS_ALL] New filename for ${doc.id}: ${newFileName}`);

            // Step 3: Update document in database
        const updateData: any = {
          category: classification.document_type,
          file_name: newFileName,
          tags: classification.tags || []
        };

            if (classification.suggested_date) {
              updateData.document_date = classification.suggested_date;
            }

            const { error: updateError } = await supabase
              .from('medical_documents')
              .update(updateData)
              .eq('id', doc.id);

            if (updateError) {
              console.error(`[REPROCESS_ALL] Update error for ${doc.id}:`, updateError);
              failed++;
              sendEvent('error', { 
                documentId: doc.id, 
                fileName: doc.file_name,
                error: 'Database update failed' 
              });
            } else {
              succeeded++;
              sendEvent('success', { 
                documentId: doc.id, 
                oldFileName: doc.file_name,
                newFileName: newFileName,
                category: classification.document_type
              });
            }

            processed++;

            // Rate limiting: wait 2 seconds between documents
            if (processed < documentsToProcess.length) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }

          } catch (error) {
            console.error(`[REPROCESS_ALL] Error processing ${doc.id}:`, error);
            failed++;
            sendEvent('error', { 
              documentId: doc.id, 
              fileName: doc.file_name,
              error: error instanceof Error ? error.message : 'Unknown error' 
            });
            processed++;
          }
        }

        sendEvent('done', { 
          total: documentsToProcess.length, 
          succeeded, 
          failed 
        });

        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('[REPROCESS_ALL] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
