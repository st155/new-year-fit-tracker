import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts';
import { unzip } from 'https://deno.land/x/zip@v1.2.5/mod.ts';

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
    
    // Для файлов больше 200MB используем экстремально оптимизированную обработку
    if (listedSize && listedSize > 200 * 1024 * 1024) {
      await logError(supabase, userId, 'apple_health_ultra_large_processing', 'Starting ultra-optimized processing for very large file', {
        requestId,
        fileSizeMB: Math.round(listedSize / 1024 / 1024)
      });

      // Получаем signed URL для стриминга без загрузки в память Edge Function
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('apple-health-uploads')
        .createSignedUrl(filePath, 3600); // 1 час на обработку

      if (urlError || !signedUrlData?.signedUrl) {
        throw new Error(`Failed to create signed URL: ${urlError?.message}`);
      }

      await logError(supabase, userId, 'apple_health_streaming_start', 'Starting streaming processing of ultra large file', {
        requestId,
        fileSizeMB: Math.round(listedSize / 1024 / 1024),
        method: 'external_streaming'
      });

      // Стриминговая обработка через fetch с минимальным использованием памяти
      try {
        const response = await fetch(signedUrlData.signedUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No reader available for streaming');
        }

        let xmlBuffer = '';
        let recordsFound = 0;
        let recordsProcessed = 0;
        const decoder = new TextDecoder();
        const maxRecordsPerBatch = 25; // Очень маленькие батчи для экономии памяти
        let currentBatch: any[] = [];

        await logError(supabase, userId, 'apple_health_streaming_active', 'Streaming processing active', {
          requestId,
          maxRecordsPerBatch
        });

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Декодируем часть файла
          const chunk = decoder.decode(value, { stream: true });
          xmlBuffer += chunk;

          // Ищем завершенные XML записи в буфере
          let recordStart = xmlBuffer.indexOf('<Record ');
          while (recordStart !== -1) {
            const recordEnd = xmlBuffer.indexOf('/>', recordStart);
            if (recordEnd === -1) break; // Запись не завершена, ждем следующий chunk

            const recordXml = xmlBuffer.slice(recordStart, recordEnd + 2);
            recordsFound++;

            // Парсим атрибуты записи без DOM парсера для экономии памяти
            const typeMatch = recordXml.match(/type="([^"]+)"/);
            const valueMatch = recordXml.match(/value="([^"]+)"/);
            const startDateMatch = recordXml.match(/startDate="([^"]+)"/);
            const unitMatch = recordXml.match(/unit="([^"]+)"/);
            const sourceMatch = recordXml.match(/sourceName="([^"]+)"/);

            if (typeMatch && valueMatch && startDateMatch) {
              const value = parseFloat(valueMatch[1]);
              if (!isNaN(value)) {
                currentBatch.push({
                  user_id: userId,
                  record_type: typeMatch[1],
                  value: value,
                  unit: unitMatch?.[1] || '',
                  start_date: startDateMatch[1],
                  end_date: startDateMatch[1], // Упрощаем для экономии памяти
                  source_name: sourceMatch?.[1] || 'Apple Health',
                  metadata: {
                    imported_from: 'apple_health_streaming',
                    request_id: requestId,
                    batch_number: Math.floor(recordsProcessed / maxRecordsPerBatch) + 1
                  }
                });
              }
            }

            // Сохраняем батч при достижении лимита
            if (currentBatch.length >= maxRecordsPerBatch) {
              const { error: batchError } = await supabase
                .from('health_records')
                .insert(currentBatch);
                
              if (!batchError) {
                recordsProcessed += currentBatch.length;
              }

              currentBatch = []; // Очищаем память

              // Логируем прогресс каждые 1000 записей
              if (recordsProcessed % 1000 === 0) {
                await logError(supabase, userId, 'apple_health_streaming_progress', 'Streaming progress update', {
                  requestId,
                  recordsFound,
                  recordsProcessed,
                  memoryEfficient: true
                });
              }
            }

            // Удаляем обработанную запись из буфера
            xmlBuffer = xmlBuffer.slice(recordEnd + 2);
            recordStart = xmlBuffer.indexOf('<Record ');
          }

          // Ограничиваем размер буфера чтобы не переполнить память
          if (xmlBuffer.length > 1024 * 1024) { // 1MB буфер макс
            // Оставляем только последнюю часть, которая может содержать неполную запись
            const lastRecordStart = xmlBuffer.lastIndexOf('<Record ');
            if (lastRecordStart !== -1) {
              xmlBuffer = xmlBuffer.slice(lastRecordStart);
            } else {
              xmlBuffer = xmlBuffer.slice(-50000); // Оставляем последние 50KB
            }
          }
        }

        // Сохраняем оставшиеся записи
        if (currentBatch.length > 0) {
          const { error: batchError } = await supabase
            .from('health_records')
            .insert(currentBatch);
            
          if (!batchError) {
            recordsProcessed += currentBatch.length;
          }
        }

        await logError(supabase, userId, 'apple_health_streaming_complete', 'Streaming processing completed', {
          requestId,
          recordsFound,
          recordsProcessed,
          fileSizeMB: Math.round(listedSize / 1024 / 1024)
        });

        // Создаем агрегированные дневные сводки
        const endDate = new Date();
        for (let d = 7; d >= 0; d--) { // Только последние 7 дней для экономии ресурсов
          const date = new Date(endDate);
          date.setDate(date.getDate() - d);
          const dateStr = date.toISOString().split('T')[0];
          
          await supabase.rpc('aggregate_daily_health_data', {
            p_user_id: userId,
            p_date: dateStr
          });
        }

        // Создаем метрику успешного импорта
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
            value: recordsProcessed,
            measurement_date: new Date().toISOString().split('T')[0],
            source_data: {
              fileName: fileName,
              fileSize: listedSize,
              importDate: new Date().toISOString(),
              requestId,
              recordsImported: recordsProcessed,
              totalRecordsFound: recordsFound,
              fileType: 'ultra_large_streaming',
              processingMethod: 'memory_optimized_streaming'
            },
            external_id: `apple_health_streaming_${requestId}`,
            notes: `Apple Health ultra-large file streaming import: ${recordsProcessed}/${recordsFound} records processed from ${Math.round(listedSize / 1024 / 1024)}MB file using memory-optimized streaming`
          });
        }

        // Удаляем файл после успешной обработки
        await supabase.storage.from('apple-health-uploads').remove([filePath]);
        return;

      } catch (streamError) {
        await logError(supabase, userId, 'apple_health_streaming_error', 'Streaming processing failed', {
          requestId,
          error: streamError.message,
          fileSizeMB: Math.round(listedSize / 1024 / 1024)
        });
        throw streamError;
      }
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
    
    let xmlContent: string;
    
    try {
      // Проверяем, является ли файл ZIP архивом
      const zipSignature = uint8Array.slice(0, 4);
      const isZip = zipSignature[0] === 0x50 && zipSignature[1] === 0x4B; // "PK" signature
      
      if (isZip) {
        console.log(`[${requestId}] Processing ZIP archive`);
        
        // Извлекаем XML из ZIP архива
        const extractedFiles = await unzip(uint8Array);
        
        // Ищем файл export.xml или любой XML файл
        let xmlFile = extractedFiles.find(file => 
          file.name === 'export.xml' || 
          file.name === 'apple_health_export/export.xml' ||
          file.name.endsWith('.xml')
        );
        
        if (!xmlFile) {
          throw new Error('No XML file found in ZIP archive');
        }
        
        xmlContent = new TextDecoder('utf-8').decode(xmlFile.content);
        
        await logError(supabase, userId, 'apple_health_zip_extracted', 'XML extracted from ZIP archive', {
          requestId,
          zipSizeMB: Math.round(uint8Array.length / 1024 / 1024),
          xmlSizeMB: Math.round(xmlContent.length / 1024 / 1024),
          xmlFileName: xmlFile.name
        });
        
      } else {
        console.log(`[${requestId}] Processing raw XML file`);
        
        // Если это уже XML файл, читаем напрямую
        const textDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: false });
        const fullText = textDecoder.decode(uint8Array);
        
        // Проверяем наличие XML содержимого
        if (!fullText.includes('<?xml') || !fullText.includes('<HealthData')) {
          throw new Error('File does not contain valid Apple Health XML data');
        }
        
        xmlContent = fullText;
        
        await logError(supabase, userId, 'apple_health_xml_direct', 'Raw XML file processed', {
          requestId,
          xmlSizeMB: Math.round(xmlContent.length / 1024 / 1024)
        });
      }
      
    } catch (extractError) {
      await logError(supabase, userId, 'apple_health_extraction_error', 'Failed to extract XML content', {
        requestId,
        error: extractError.message,
        fileSize: uint8Array.length
      });
      throw new Error(`Failed to extract XML content: ${extractError.message}`);
    }

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