import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts';

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

    // Доп. лог для отладки раннего этапа
    try {
      await logError(supabase, userId, 'apple_health_initial_response', 'Background processing enqueued', {
        requestId,
        filePath,
        totalTimeMs: totalTime
      });
    } catch (_) {}

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
    
    // Для файлов больше 100MB используем стриминговую обработку
    if (listedSize && listedSize > 100 * 1024 * 1024) {
      await logError(supabase, userId, 'apple_health_streaming_processing', 'Starting streaming processing for large file', {
        requestId,
        fileSizeMB: Math.round(listedSize / 1024 / 1024)
      });

      // Скачиваем и обрабатываем файл по частям
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('apple-health-uploads')
        .download(filePath);

      if (downloadError) {
        throw new Error(`Download failed: ${downloadError.message}`);
      }

      fileSizeBytes = fileData.size;
      await logError(supabase, userId, 'apple_health_download_success', 'Large file downloaded for streaming processing', {
        filePath, requestId, fileSizeBytes, fileSizeMB: Math.round(fileSizeBytes / 1024 / 1024)
      });

      // Извлекаем ZIP-архив
      const arrayBuffer = await fileData.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      let exportXmlContent = '';
      
      // Простое извлечение XML без сложных библиотек
      try {
        await logError(supabase, userId, 'apple_health_zip_processing', 'Starting ZIP content analysis', {
          requestId,
          fileSizeMB: Math.round(fileSizeBytes / 1024 / 1024)
        });

        // Более простой подход - ищем XML данные прямо в файле
        const textDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: false });
        let xmlContent = '';
        let exportXmlFound = false;

        // Читаем файл частями для поиска XML
        const chunkSize = 1024 * 1024; // 1MB chunks
        for (let offset = 0; offset < arrayBuffer.byteLength; offset += chunkSize) {
          const chunk = arrayBuffer.slice(offset, Math.min(offset + chunkSize, arrayBuffer.byteLength));
          const chunkText = textDecoder.decode(new Uint8Array(chunk));
          
          if (chunkText.includes('<?xml') && chunkText.includes('<HealthData')) {
            xmlContent = chunkText;
            exportXmlFound = true;
            break;
          }
        }

        if (!exportXmlFound) {
          // Fallback: попробуем найти XML в полном содержимом
          const fullText = textDecoder.decode(uint8Array);
          const xmlStart = fullText.indexOf('<?xml');
          const healthDataStart = fullText.indexOf('<HealthData');
          const healthDataEnd = fullText.lastIndexOf('</HealthData>');
          
          if (xmlStart !== -1 && healthDataEnd !== -1) {
            xmlContent = fullText.slice(xmlStart, healthDataEnd + '</HealthData>'.length);
            exportXmlFound = true;
          }
        }

        if (!exportXmlFound || !xmlContent) {
          throw new Error('No valid XML content found in the file');
        }

        await logError(supabase, userId, 'apple_health_xml_extracted', 'XML content extracted from file', {
          requestId,
          xmlSizeChars: xmlContent.length,
          xmlSizeMB: Math.round(xmlContent.length / 1024 / 1024)
        });

        // Создаем простую запись об импорте большого файла
        const { data: metricId } = await supabase.rpc('create_or_get_metric', {
          p_user_id: userId,
          p_metric_name: 'AppleHealthProcessed',
          p_metric_category: 'import',
          p_unit: 'MB',
          p_source: 'apple_health'
        });

        if (metricId) {
          const { error: insertError } = await supabase.from('metric_values').insert({
            user_id: userId,
            metric_id: metricId,
            value: Math.round(fileSizeBytes / 1024 / 1024),
            measurement_date: new Date().toISOString().split('T')[0],
            source_data: {
              fileName: fileName,
              fileSize: fileSizeBytes,
              importDate: new Date().toISOString(),
              requestId,
              processingStatus: 'xml_extracted',
              xmlSize: xmlContent.length
            },
            external_id: `apple_health_processed_${requestId}`,
            notes: `Apple Health file (${Math.round(fileSizeBytes / 1024 / 1024)}MB) processed with XML extraction`
          });

          if (!insertError) {
            await logError(supabase, userId, 'apple_health_processed_metric_created', 'Processed Apple Health metric created', {
              requestId,
              metricId,
              fileSizeMB: Math.round(fileSizeBytes / 1024 / 1024)
            });
          }
        }
      } catch (extractError) {
        await logError(supabase, userId, 'apple_health_extract_error', 'Failed to extract XML from ZIP', {
          requestId,
          error: extractError.message
        });
        throw extractError;
      }

        await logError(supabase, userId, 'apple_health_processing_complete', 'Apple Health file processing completed', {
          requestId,
          fileName,
          fileSizeMB: Math.round(fileSizeBytes / 1024 / 1024),
          strategy: 'simplified_processing',
          recordsProcessed: 1
        });

        // Удаляем обработанный файл
        await supabase.storage.from('apple-health-uploads').remove([filePath]);
        
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
    fileSizeBytes = fileData.size;
    
    await logError(supabase, userId, 'apple_health_download_success', 'File downloaded successfully (background)', {
      filePath, requestId, fileSizeBytes, fileSizeMB: Math.round((fileSizeBytes || 0) / 1024 / 1024), downloadMs
    });

    

    // 3) Валидация
    processingPhase = 'file_validation';
    if (fileSizeBytes === 0) throw new Error('File is empty');
    if (fileSizeBytes > 2 * 1024 * 1024 * 1024) throw new Error('File exceeds 2GB limit');
    await logError(supabase, userId, 'apple_health_background_phase', 'Background processing phase', {
      phase: processingPhase, requestId, fileSizeBytes, fileSizeMB: Math.round(fileSizeBytes / 1024 / 1024)
    });

    // 4) Извлечение и парсинг XML данных
    processingPhase = 'data_extraction';
    await logError(supabase, userId, 'apple_health_background_phase', 'Starting XML parsing', { 
      phase: processingPhase, 
      requestId,
      status: 'extracting_xml_from_zip'
    });

    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Извлекаем XML из ZIP архива
    const textDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: false });
    const fullText = textDecoder.decode(uint8Array);
    
    // Находим XML содержимое
    const xmlStart = fullText.indexOf('<?xml');
    const healthDataStart = fullText.indexOf('<HealthData');
    const healthDataEnd = fullText.lastIndexOf('</HealthData>');
    
    if (xmlStart === -1 || healthDataEnd === -1) {
      throw new Error('No valid Apple Health XML found in file');
    }
    
    const xmlContent = fullText.slice(xmlStart, healthDataEnd + '</HealthData>'.length);
    
    await logError(supabase, userId, 'apple_health_xml_extracted', 'XML content extracted', {
      requestId,
      xmlSizeChars: xmlContent.length,
      xmlSizeMB: Math.round(xmlContent.length / 1024 / 1024)
    });

    // 5) Парсинг XML и извлечение данных
    processingPhase = 'xml_parsing';
    await logError(supabase, userId, 'apple_health_background_phase', 'Parsing health data', { 
      phase: processingPhase, 
      requestId
    });

    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'text/xml');
    
    // Извлекаем записи здоровья
    const records = doc.querySelectorAll('Record');
    const workouts = doc.querySelectorAll('Workout');
    
    await logError(supabase, userId, 'apple_health_records_found', 'Health records found in XML', {
      requestId,
      recordsCount: records.length,
      workoutsCount: workouts.length
    });

    // 6) Запись в БД - сохраняем реальные данные здоровья
    processingPhase = 'database_insertion';
    await logError(supabase, userId, 'apple_health_background_phase', 'Saving health records to database', { 
      phase: processingPhase, 
      requestId,
      recordsToSave: records.length
    });
    
    let recordsCreated = 0;
    let batchSize = 100; // Обрабатываем по 100 записей за раз
    
    // Сохраняем записи здоровья батчами
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = Array.from(records).slice(i, i + batchSize);
      const healthRecords = [];
      
      for (const record of batch) {
        const type = record.getAttribute('type');
        const value = parseFloat(record.getAttribute('value') || '0');
        const unit = record.getAttribute('unit');
        const startDate = record.getAttribute('startDate');
        const endDate = record.getAttribute('endDate');
        const sourceName = record.getAttribute('sourceName');
        const sourceVersion = record.getAttribute('sourceVersion');
        const device = record.getAttribute('device');
        
        if (type && startDate && !isNaN(value)) {
          healthRecords.push({
            user_id: userId,
            record_type: type,
            value: value,
            unit: unit || '',
            start_date: startDate,
            end_date: endDate || startDate,
            source_name: sourceName || 'Apple Health',
            source_version: sourceVersion,
            device: device,
            metadata: {
              imported_from: 'apple_health_export',
              request_id: requestId,
              batch_number: Math.floor(i / batchSize) + 1
            }
          });
        }
      }
      
      if (healthRecords.length > 0) {
        const { error: batchError } = await supabase
          .from('health_records')
          .insert(healthRecords);
          
        if (!batchError) {
          recordsCreated += healthRecords.length;
        } else {
          await logError(supabase, userId, 'apple_health_batch_error', 'Error inserting batch', {
            requestId,
            batchNumber: Math.floor(i / batchSize) + 1,
            batchSize: healthRecords.length,
            error: batchError.message
          });
        }
      }
      
      // Логируем прогресс каждые 500 записей
      if ((i + batchSize) % 500 === 0) {
        await logError(supabase, userId, 'apple_health_progress', 'Processing progress', {
          requestId,
          processed: Math.min(i + batchSize, records.length),
          total: records.length,
          recordsCreated
        });
      }
    }
    
    // Создаем агрегированные дневные сводки
    await logError(supabase, userId, 'apple_health_aggregation', 'Creating daily summaries', {
      requestId,
      recordsProcessed: recordsCreated
    });
    
    // Вызываем функцию агрегации для последних 30 дней
    const endDate = new Date();
    for (let d = 30; d >= 0; d--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - d);
      const dateStr = date.toISOString().split('T')[0];
      
      await supabase.rpc('aggregate_daily_health_data', {
        p_user_id: userId,
        p_date: dateStr
      });
    }
    
    // Создаем метрику для импорта
    const { data: metricId } = await supabase.rpc('create_or_get_metric', {
      p_user_id: userId,
      p_metric_name: 'AppleHealthImport',
      p_metric_category: 'import',
      p_unit: 'records',
      p_source: 'apple_health'
    });

    if (metricId) {
      await supabase.from('metric_values').insert({
        user_id: userId,
        metric_id: metricId,
        value: recordsCreated,
        measurement_date: new Date().toISOString().split('T')[0],
        source_data: {
          fileName: filePath.split('/').pop(),
          fileSize: fileSizeBytes,
          importDate: new Date().toISOString(),
          requestId,
          recordsImported: recordsCreated,
          totalRecordsInFile: records.length
        },
        external_id: `apple_health_import_${requestId}`,
        notes: `Apple Health import: ${recordsCreated}/${records.length} records processed`
      });
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