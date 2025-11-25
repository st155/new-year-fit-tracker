import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_RETRIES = 2;
const RETRY_DELAY = 5000; // 5 seconds

function isRetryableError(error: any): boolean {
  const retryableMessages = [
    'timeout',
    'network error',
    'connection reset',
    'ECONNRESET',
    'ECONNREFUSED',
    'rate limit',
    'too many requests'
  ];
  const errorMsg = error.message?.toLowerCase() || error.toString().toLowerCase();
  return retryableMessages.some(msg => errorMsg.includes(msg));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('[BATCH-PROCESS] Starting batch processing for user:', user.id);

    // Get all pending documents
    const { data: documents, error: docsError } = await supabase
      .from('medical_documents')
      .select('*')
      .eq('user_id', user.id)
      .eq('processing_status', 'pending')
      .order('created_at', { ascending: true });

    if (docsError) {
      console.error('[BATCH-PROCESS] Error fetching documents:', docsError);
      throw docsError;
    }

    if (!documents || documents.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending documents to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[BATCH-PROCESS] Found ${documents.length} pending documents`);

    // Create a readable stream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let processed = 0;
        let succeeded = 0;
        let failed = 0;

        // Send initial progress
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            type: 'start',
            total: documents.length,
            message: `Processing ${documents.length} documents...`
          })}\n\n`)
        );

        // Helper to process document with retry logic
        async function processDocumentWithRetry(doc: any, attempt = 1): Promise<any> {
          // FIXED: Always use parse-lab-report except for InBody
          // parse-lab-report handles all document types with specialized parsers
          const functionName = doc.document_type === 'inbody' ? 'analyze-inbody' : 'parse-lab-report';
          const functionPayload = { documentId: doc.id };

          try {
            console.log(`[BATCH-PROCESS] Calling ${functionName} for ${doc.file_name} (attempt ${attempt}/${MAX_RETRIES})`);
            
            const { data: result, error: processError } = await supabase.functions.invoke(
              functionName,
              { body: functionPayload }
            );

            if (processError) {
              // Log detailed error information
              console.error(`[BATCH-PROCESS] Edge function ${functionName} failed:`, {
                error: processError,
                message: processError.message,
                context: (processError as any).context,
                documentId: doc.id,
                documentType: doc.document_type,
                fileSize: doc.file_size,
                attempt
              });
              
              throw new Error(`${functionName} failed: ${processError.message || processError.toString()}`);
            }

            return result;
          } catch (error: any) {
            // Retry logic for transient errors
            if (attempt < MAX_RETRIES && isRetryableError(error)) {
              console.log(`[BATCH-PROCESS] Retrying ${doc.file_name} in ${RETRY_DELAY * attempt}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
              return processDocumentWithRetry(doc, attempt + 1);
            }
            throw error;
          }
        }

        for (const doc of documents) {
          let functionName = '';
          try {
            console.log(`[BATCH-PROCESS] Processing document ${processed + 1}/${documents.length}: ${doc.file_name}`);

            // Check if controller is still open before enqueuing
            if (controller.desiredSize === null) {
              console.warn('[BATCH-PROCESS] Stream closed by client, stopping batch processing');
              break;
            }

            // Send progress update
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'progress',
                current: processed + 1,
                total: documents.length,
                documentId: doc.id,
                documentName: doc.file_name,
                status: 'processing'
              })}\n\n`)
            );

            // Update document status to processing
            await supabase
              .from('medical_documents')
              .update({ 
                processing_status: 'processing',
                processing_started_at: new Date().toISOString()
              })
              .eq('id', doc.id);

            // Determine function name for logging
            functionName = doc.document_type === 'inbody' ? 'analyze-inbody' : 'parse-lab-report';

            // Process document with retry logic
            const result = await processDocumentWithRetry(doc);

            // Update document status to completed
            await supabase
              .from('medical_documents')
              .update({ 
                processing_status: 'completed',
                processing_completed_at: new Date().toISOString()
              })
              .eq('id', doc.id);

            succeeded++;

            // Check if controller is still open before enqueuing
            if (controller.desiredSize !== null) {
              // Send success update
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: 'completed',
                  current: processed + 1,
                  total: documents.length,
                  documentId: doc.id,
                  documentName: doc.file_name,
                  status: 'completed',
                  result: result
                })}\n\n`)
              );
            }

            console.log(`[BATCH-PROCESS] ✓ Successfully processed: ${doc.file_name}`);

          } catch (error: any) {
            console.error(`[BATCH-PROCESS] ✗ Error processing ${doc.file_name}:`, {
              error: error.message,
              stack: error.stack,
              documentId: doc.id,
              documentType: doc.document_type,
              fileSize: doc.file_size,
              functionName: functionName
            });
            failed++;

            // Update document status to error
            await supabase
              .from('medical_documents')
              .update({ 
                processing_status: 'error',
                processing_error: error.message || error.toString(),
                processing_completed_at: new Date().toISOString()
              })
              .eq('id', doc.id);

            // Check if controller is still open before enqueuing
            if (controller.desiredSize !== null) {
              // Send error update
              try {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({
                    type: 'error',
                    current: processed + 1,
                    total: documents.length,
                    documentId: doc.id,
                    documentName: doc.file_name,
                    status: 'error',
                    error: error.message || error.toString()
                  })}\n\n`)
                );
              } catch (enqueueError) {
                console.warn('[BATCH-PROCESS] Failed to enqueue error update:', enqueueError);
              }
            }
          }

          processed++;

          // Add a delay between documents to avoid rate limiting (2 seconds)
          if (processed < documents.length) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

        // Send completion message if controller still open
        if (controller.desiredSize !== null) {
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'done',
                total: documents.length,
                succeeded,
                failed,
                message: `Processing complete: ${succeeded} succeeded, ${failed} failed`
              })}\n\n`)
            );
          } catch (enqueueError) {
            console.warn('[BATCH-PROCESS] Failed to enqueue completion message:', enqueueError);
          }
        }

        try {
          controller.close();
        } catch (closeError) {
          console.warn('[BATCH-PROCESS] Controller already closed:', closeError);
        }
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
    console.error('[BATCH-PROCESS] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
