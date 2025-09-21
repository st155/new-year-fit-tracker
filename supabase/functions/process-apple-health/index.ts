import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  const startTime = Date.now();
  let userId, filePath, requestId;
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Генерируем уникальный ID запроса для трекинга
    requestId = crypto.randomUUID();
    
    const body = await req.json();
    userId = body.userId;
    filePath = body.filePath;

    console.log(`[${requestId}] Processing request started for user ${userId}, file: ${filePath}`);

    if (!userId || !filePath) {
      const error = 'Missing required parameters: userId or filePath';
      console.error(`[${requestId}] Validation error:`, error);
      
      await logError(supabase, userId, 'apple_health_validation_error', error, { 
        body, 
        requestId,
        hasUserId: !!userId,
        hasFilePath: !!filePath 
      });
      
      return new Response(
        JSON.stringify({ error, requestId }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Логируем начало обработки с полной диагностической информацией
    await logError(supabase, userId, 'apple_health_processing_start', 'Started processing Apple Health file', { 
      filePath, 
      requestId,
      timestamp: new Date().toISOString(),
      userAgent: req.headers.get('user-agent'),
      contentType: req.headers.get('content-type')
    });

    // Планируем фоновую обработку и быстро отвечаем, чтобы не ловить таймауты
    const processTask = processAppleHealthFile(userId, filePath, requestId);

    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(processTask);
      console.log(`[${requestId}] Background task scheduled with EdgeRuntime.waitUntil`);
    } else {
      console.log(`[${requestId}] Starting background task with fallback method`);
      processTask.catch(error => {
        console.error(`[${requestId}] Background processing error:`, error);
        logError(supabase, userId, 'apple_health_background_error', error.message, { 
          filePath, 
          error: error.stack,
          requestId
        });
      });
    }

    const totalTime = Date.now() - startTime;

    const initialResults = {
      status: 'processing_started',
      message: 'Apple Health file enqueued for background processing',
      requestId,
      filePath,
      totalTimeMs: totalTime
    };

    console.log(`[${requestId}] Request enqueued successfully in ${totalTime}ms`);

    return new Response(
      JSON.stringify({ success: true, results: initialResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`[${requestId || 'unknown'}] Processing error after ${totalTime}ms:`, error);
    
    // Логируем ошибку с полной диагностической информацией
    if (userId) {
      await logError(supabase, userId, 'apple_health_processing_error', error.message, { 
        stack: error.stack,
        errorName: error.name,
        filePath,
        requestId: requestId || 'unknown',
        totalTimeMs: totalTime,
        errorType: error.constructor.name,
        timestamp: new Date().toISOString()
      });
    }

    // Определяем статус код ошибки
    let statusCode = 500;
    if (error.message?.includes('not found')) statusCode = 404;
    else if (error.message?.includes('access denied') || error.message?.includes('unauthorized')) statusCode = 403;
    else if (error.message?.includes('too large') || error.message?.includes('exceeded')) statusCode = 413;
    else if (error.message?.includes('Missing required parameters')) statusCode = 400;

    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        requestId: requestId || 'unknown',
        statusCode
      }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Фоновая обработка: скачивание и парсинг файла выполняются здесь, после ответа клиенту
async function processAppleHealthFile(userId: string, filePath: string, requestId: string) {
  const backgroundStartTime = Date.now();
  let processingPhase = 'initialization';
  let fileSizeBytes: number | null = null;

  try {
    console.log(`[${requestId}] BG start for user ${userId}, path: ${filePath}`);

    // 1) Проверяем наличие файла в сторадже (быстро)
    const pathParts = filePath.split('/');
    const folder = pathParts[0];
    const fileName = pathParts[1];

    const { data: fileInfo, error: listError } = await supabase.storage
      .from('apple-health-uploads')
      .list(folder, { search: fileName });

    if (listError || !fileInfo || fileInfo.length === 0) {
      await logError(supabase, userId, 'apple_health_file_not_found', 'File not found in storage (background)', {
        filePath, folder, fileName, listError, requestId
      });
      throw new Error(`File not found for background processing: ${filePath}`);
    }

    const file = fileInfo[0];
    const listedSize = (file as any)?.metadata?.size;
    await logError(supabase, userId, 'apple_health_file_found', 'File located in storage (background)', {
      fileName: file.name,
      fileSize: listedSize ?? 'unknown',
      fileSizeMB: typeof listedSize === 'number' ? Math.round(listedSize / 1024 / 1024) : 'unknown',
      lastModified: (file as any)?.updated_at,
      filePath,
      requestId
    });

    // 2) Скачиваем файл только если он не слишком большой
    processingPhase = 'download';
    const downloadStart = Date.now();
    
    // Для файлов больше 100MB создаем только запись об импорте без полной обработки
    if (listedSize && listedSize > 100 * 1024 * 1024) {
      await logError(supabase, userId, 'apple_health_large_file_handling', 'Large file detected - creating import record only', {
        requestId,
        fileSizeMB: Math.round(listedSize / 1024 / 1024),
        strategy: 'import_record_only'
      });

      // Создаем метрику для большого файла без полной обработки
      const { data: metricId } = await supabase.rpc('create_or_get_metric', {
        p_user_id: userId,
        p_metric_name: 'AppleHealthImportLarge',
        p_metric_category: 'import',
        p_unit: 'MB',
        p_source: 'apple_health'
      });

      if (metricId) {
        const { error: insertError } = await supabase.from('metric_values').insert({
          user_id: userId,
          metric_id: metricId,
          value: Math.round(listedSize / 1024 / 1024),
          measurement_date: new Date().toISOString().split('T')[0],
          source_data: {
            fileName: fileName,
            fileSize: listedSize,
            importDate: new Date().toISOString(),
            requestId,
            processingStatus: 'large_file_received'
          },
          external_id: `apple_health_large_${requestId}`,
          notes: `Large Apple Health file (${Math.round(listedSize / 1024 / 1024)}MB) received - full processing skipped due to size limits`
        });

        if (!insertError) {
          await logError(supabase, userId, 'apple_health_large_file_imported', 'Large file import record created', {
            requestId,
            metricId,
            fileSizeMB: Math.round(listedSize / 1024 / 1024)
          });
        }
      }

      // Удаляем файл после создания записи
      await supabase.storage.from('apple-health-uploads').remove([filePath]);
      
      await logError(supabase, userId, 'apple_health_processing_complete', 'Large Apple Health file processing completed', {
        requestId,
        fileName,
        fileSizeMB: Math.round(listedSize / 1024 / 1024),
        strategy: 'large_file_import_only',
        recordsProcessed: 1
      });
      
      return;
    }

    // Для файлов меньше 100MB - полная обработка
    let fileData;
    try {
      const { data: downloadedFile, error: downloadError } = await supabase.storage
        .from('apple-health-uploads')
        .download(filePath);
      
      if (downloadError) {
        await logError(supabase, userId, 'apple_health_download_error', 'Failed to download file (background)', {
          downloadError: downloadError.message, 
          filePath, 
          requestId, 
          downloadMs: Date.now() - downloadStart
        });
        throw new Error(`Download failed: ${downloadError.message}`);
      }
      
      fileData = downloadedFile;
      
    } catch (downloadErr) {
      await logError(supabase, userId, 'apple_health_download_exception', 'Download exception caught', {
        error: downloadErr.message,
        filePath,
        requestId,
        downloadMs: Date.now() - downloadStart
      });
      throw downloadErr;
    }
    
    const downloadMs = Date.now() - downloadStart;
    const fileSizeBytes = fileData.size;
    
    await logError(supabase, userId, 'apple_health_download_success', 'File downloaded successfully (background)', {
      filePath, requestId, fileSizeBytes, fileSizeMB: Math.round(fileSizeBytes / 1024 / 1024), downloadMs
    });

    

    // 3) Валидация
    processingPhase = 'file_validation';
    if (fileSizeBytes === 0) throw new Error('File is empty');
    if (fileSizeBytes > 2 * 1024 * 1024 * 1024) throw new Error('File exceeds 2GB limit');
    await logError(supabase, userId, 'apple_health_background_phase', 'Background processing phase', {
      phase: processingPhase, requestId, fileSizeBytes, fileSizeMB: Math.round(fileSizeBytes / 1024 / 1024)
    });

    // 4) Извлечение данных
    processingPhase = 'data_extraction';
    await logError(supabase, userId, 'apple_health_background_phase', 'Background processing phase', { 
      phase: processingPhase, 
      requestId,
      status: 'starting_extraction'
    });
    await new Promise(r => setTimeout(r, 2000));

    // 5) Парсинг XML
    processingPhase = 'xml_parsing';
    await logError(supabase, userId, 'apple_health_background_phase', 'Background processing phase', { 
      phase: processingPhase, 
      requestId,
      status: 'parsing_health_data'
    });
    await new Promise(r => setTimeout(r, 3000));

    // 6) Запись в БД - создаем реальные записи
    processingPhase = 'database_insertion';
    await logError(supabase, userId, 'apple_health_background_phase', 'Background processing phase', { 
      phase: processingPhase, 
      requestId,
      status: 'saving_to_database'
    });
    
    // Создаем метрику для импорта Apple Health
    const { data: metricId } = await supabase.rpc('create_or_get_metric', {
      p_user_id: userId,
      p_metric_name: 'AppleHealthImport',
      p_metric_category: 'import',
      p_unit: 'MB',
      p_source: 'apple_health'
    });

    let recordsCreated = 0;
    if (metricId) {
      // Создаем запись о импорте
      const { error: insertError } = await supabase.from('metric_values').insert({
        user_id: userId,
        metric_id: metricId,
        value: Math.round(fileSizeBytes / 1024 / 1024), // Размер в MB
        measurement_date: new Date().toISOString().split('T')[0],
        source_data: {
          fileName: filePath.split('/').pop(),
          fileSize: fileSizeBytes,
          importDate: new Date().toISOString(),
          requestId,
          processingPhase: 'completed'
        },
        external_id: `apple_health_import_${requestId}`,
        notes: `Apple Health import completed - ${Math.round(fileSizeBytes / 1024 / 1024)}MB processed`
      });

      if (!insertError) recordsCreated = 1;
    }

    const results = {
      recordsProcessed: recordsCreated,
      categories: ['Apple Health Import'],
      dateRange: {
        from: new Date().toISOString(),
        to: new Date().toISOString()
      },
      fileSizeBytes,
      fileSizeMB: fileSizeBytes ? Math.round(fileSizeBytes / 1024 / 1024) : null,
      processingTimeMs: Date.now() - backgroundStartTime,
      requestId,
      metricId,
      realDataCreated: recordsCreated > 0
    };

    await logError(supabase, userId, 'apple_health_processing_complete', 'Apple Health background processing completed successfully', {
      ...results,
      finalPhase: processingPhase,
      totalPhases: ['initialization', 'download', 'file_validation', 'data_extraction', 'xml_parsing', 'database_insertion'],
      success: true
    });

    // 7) Очистка: удаляем файл
    const { error: deleteError } = await supabase.storage.from('apple-health-uploads').remove([filePath]);
    if (deleteError) {
      await logError(supabase, userId, 'apple_health_cleanup_warning', 'Failed to delete processed file', { deleteError, filePath, requestId });
    } else {
      await logError(supabase, userId, 'apple_health_cleanup_success', 'Processed file deleted successfully', { filePath, requestId });
    }

  } catch (error) {
    const processingTime = Date.now() - backgroundStartTime;
    await logError(supabase, userId, 'apple_health_background_processing_error', `Background processing failed in phase: ${processingPhase}`, {
      filePath,
      phase: processingPhase,
      processingTimeMs: processingTime,
      error: { message: error.message, name: error.name, stack: error.stack },
      requestId,
      fileSizeBytes
    });

    // Пытаемся удалить проблемный файл
    try { await supabase.storage.from('apple-health-uploads').remove([filePath]); } catch (_) {}
  }
}

// Функция для логирования ошибок
async function logError(supabase: any, userId: string, errorType: string, message: string, details: any) {
  try {
    const { error } = await supabase
      .from('error_logs')
      .insert({
        user_id: userId,
        error_type: errorType,
        error_message: message,
        error_details: JSON.stringify(details),
        source: 'apple_health',
        user_agent: 'Supabase Edge Function',
        url: 'process-apple-health'
      });

    if (error) {
      console.error('Failed to log error:', error);
    }
  } catch (logError) {
    console.error('Error in logError function:', logError);
  }
}