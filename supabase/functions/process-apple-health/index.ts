import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decode as base64Decode } from "https://deno.land/std@0.208.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Request received: ${req.method} ${req.url}`);

  try {
    const body = await req.json();
    const { userId, filePath } = body;

    console.log(`[${requestId}] Processing for user ${userId}, file: ${filePath}`);

    if (!userId || !filePath) {
      console.error(`[${requestId}] Missing parameters: userId=${userId}, filePath=${filePath}`);
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: userId and filePath' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Немедленно возвращаем ответ и запускаем обработку в фоне
    const response = new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Processing started',
        requestId,
        filePath
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

    // Запускаем фоновую обработку без ожидания
    processAppleHealthFileOptimized(userId, filePath, requestId)
      .catch(error => {
        console.error(`[${requestId}] Background processing failed:`, error);
        logError(supabase, userId, 'processing_error', error.message, { 
          requestId, 
          filePath,
          stack: error.stack 
        });
      });

    return response;

  } catch (error) {
    console.error(`[${requestId}] Request processing error:`, error);
    return new Response(
      JSON.stringify({ 
        error: 'Request processing failed',
        details: error.message,
        requestId 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processAppleHealthFileOptimized(userId: string, filePath: string, requestId: string) {
  const startTime = Date.now();
  
  try {
    console.log(`[${requestId}] Background processing started`);
    
    // 1. Проверяем наличие файла
    const { data: fileList, error: listError } = await supabase.storage
      .from('apple-health-uploads')
      .list(filePath.split('/')[0], { 
        search: filePath.split('/')[1] 
      });

    if (listError || !fileList?.length) {
      throw new Error(`File not found: ${filePath}, error: ${listError?.message}`);
    }

    const fileInfo = fileList[0];
    const fileSize = (fileInfo as any)?.metadata?.size || 0;
    const fileSizeMB = Math.round(fileSize / 1024 / 1024);
    
    console.log(`[${requestId}] File found: ${fileSizeMB}MB`);
    
    await logError(supabase, userId, 'processing_start', 'Starting Apple Health processing', {
      requestId,
      filePath,
      fileSizeMB
    });

    // 2. Обрабатываем файл (убрали ограничение на размер файла)
    console.log(`[${requestId}] Processing file directly`);
    await processFileDirectly(userId, filePath, requestId);

    // 3. Создаем агрегированные данные
    await createDailyAggregates(userId, requestId);

    // 4. Удаляем обработанный файл
    const { error: deleteError } = await supabase.storage
      .from('apple-health-uploads')
      .remove([filePath]);
      
    if (deleteError) {
      console.error(`[${requestId}] Failed to delete file:`, deleteError);
    } else {
      console.log(`[${requestId}] File deleted successfully`);
    }

    const processingTime = Date.now() - startTime;
    await logError(supabase, userId, 'processing_complete', 'Processing completed successfully', {
      requestId,
      processingTimeMs: processingTime,
      fileSizeMB
    });

  } catch (error) {
    console.error(`[${requestId}] Processing failed:`, error);
    await logError(supabase, userId, 'processing_failed', `Processing failed: ${error.message}`, {
      requestId,
      filePath,
      errorStack: error.stack
    });
    
    // Пытаемся удалить проблемный файл
    try {
      await supabase.storage.from('apple-health-uploads').remove([filePath]);
      console.log(`[${requestId}] Problem file deleted`);
    } catch (deleteError) {
      console.error(`[${requestId}] Failed to delete problem file:`, deleteError);
    }
    
    throw error; // Перебрасываем ошибку для логирования
  }
}

async function processFileDirectly(userId: string, filePath: string, requestId: string) {
  console.log(`[${requestId}] Starting direct file processing`);
  
  // Скачиваем файл
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('apple-health-uploads')
    .download(filePath);
    
  if (downloadError) {
    throw new Error(`Download failed: ${downloadError.message}`);
  }

  const arrayBuffer = await fileData.arrayBuffer();
  console.log(`[${requestId}] File downloaded, size: ${Math.round(arrayBuffer.byteLength / 1024 / 1024)}MB`);
  
  // Проверяем формат файла по магическим байтам
  const uint8Array = new Uint8Array(arrayBuffer);
  const isZip = uint8Array[0] === 0x50 && uint8Array[1] === 0x4B; // "PK"
  const isXml = new TextDecoder().decode(uint8Array.slice(0, 5)) === '<?xml';
  
  let xmlContent: string | null = null;
  
  if (isXml) {
    // Прямой XML файл
    xmlContent = new TextDecoder().decode(arrayBuffer);
    console.log(`[${requestId}] Direct XML file detected`);
  } else if (isZip) {
    // Ищем XML содержимое внутри ZIP (упрощенный подход)
    console.log(`[${requestId}] ZIP file detected, extracting XML`);
    const zipString = new TextDecoder('utf-8', { ignoreBOM: true, fatal: false }).decode(arrayBuffer);
    
    // Паттерн для поиска XML заголовка в ZIP данных
    const xmlPattern = /<\?xml[\s\S]*?<HealthData[\s\S]*?<\/HealthData>/i;
    const xmlMatch = zipString.match(xmlPattern);
    
    if (xmlMatch) {
      xmlContent = xmlMatch[0];
      console.log(`[${requestId}] XML extracted from ZIP successfully`);
    } else {
      console.log(`[${requestId}] No XML content found in ZIP file`);
    }
  } else {
    throw new Error('Unknown file format - not ZIP or XML');
  }

  if (!xmlContent) {
    throw new Error('No XML content found in uploaded file');
  }

  console.log(`[${requestId}] XML content size: ${Math.round(xmlContent.length / 1024 / 1024)}MB`);

  // Парсим XML
  await parseXMLStreaming(xmlContent, userId, requestId);
}

async function parseXMLStreaming(xmlContent: string, userId: string, requestId: string) {
  const BATCH_SIZE = 50; // Уменьшили для надежности
  const MAX_MEMORY_BUFFER = 2 * 1024 * 1024; // 2MB буфер для экономии памяти
  
  let recordsProcessed = 0;
  let currentBatch: any[] = [];
  let position = 0;
  let buffer = '';
  
  console.log(`[${requestId}] Starting XML parsing, content size: ${Math.round(xmlContent.length / 1024 / 1024)}MB`);

  try {
    // Обрабатываем XML по частям
    while (position < xmlContent.length) {
      // Читаем следующий чанк
      const chunkSize = Math.min(MAX_MEMORY_BUFFER, xmlContent.length - position);
      buffer += xmlContent.slice(position, position + chunkSize);
      position += chunkSize;

      // Ищем полные записи Record в буфере
      let recordStart = buffer.indexOf('<Record ');
      while (recordStart !== -1) {
        const recordEnd = buffer.indexOf('/>', recordStart);
        if (recordEnd === -1) break; // Запись не полная, ждем следующий чанк

        const recordXml = buffer.slice(recordStart, recordEnd + 2);
        
        // Парсим атрибуты записи
        const record = parseRecordAttributes(recordXml);
        
        if (record && isValidHealthRecord(record)) {
          currentBatch.push({
            user_id: userId,
            record_type: record.type,
            value: record.value,
            unit: record.unit || '',
            start_date: record.startDate,
            end_date: record.endDate || record.startDate,
            source_name: record.sourceName || 'Apple Health',
            source_version: record.sourceVersion,
            device: record.device,
            metadata: {
              imported_from: 'apple_health',
              request_id: requestId
            }
          });
        }

        // Сохраняем батч при достижении размера
        if (currentBatch.length >= BATCH_SIZE) {
          await saveBatch(currentBatch, requestId);
          recordsProcessed += currentBatch.length;
          currentBatch = [];
          
          // Логируем прогресс каждые 500 записей
          if (recordsProcessed % 500 === 0) {
            console.log(`[${requestId}] Processed ${recordsProcessed} records`);
          }
        }

        // Удаляем обработанную запись из буфера
        buffer = buffer.slice(recordEnd + 2);
        recordStart = buffer.indexOf('<Record ');
      }

      // Ограничиваем размер буфера
      if (buffer.length > MAX_MEMORY_BUFFER) {
        buffer = buffer.slice(-MAX_MEMORY_BUFFER / 2);
      }
    }

    // Сохраняем оставшиеся записи
    if (currentBatch.length > 0) {
      await saveBatch(currentBatch, requestId);
      recordsProcessed += currentBatch.length;
    }

    console.log(`[${requestId}] XML parsing complete, processed ${recordsProcessed} records`);
    
    // Создаем метрику импорта
    await createImportMetric(userId, requestId, recordsProcessed);
    
  } catch (error) {
    console.error(`[${requestId}] XML parsing error:`, error);
    throw new Error(`XML parsing failed: ${error.message}`);
  }
}

function parseRecordAttributes(recordXml: string): any {
  const getAttribute = (name: string): string | null => {
    const regex = new RegExp(`${name}="([^"]+)"`);
    const match = recordXml.match(regex);
    return match ? match[1] : null;
  };

  return {
    type: getAttribute('type'),
    value: parseFloat(getAttribute('value') || '0'),
    unit: getAttribute('unit'),
    startDate: getAttribute('startDate'),
    endDate: getAttribute('endDate'),
    sourceName: getAttribute('sourceName'),
    sourceVersion: getAttribute('sourceVersion'),
    device: getAttribute('device')
  };
}

function isValidHealthRecord(record: any): boolean {
  // Фильтруем только важные типы данных
  const importantTypes = [
    'HKQuantityTypeIdentifierStepCount',
    'HKQuantityTypeIdentifierDistanceWalkingRunning',
    'HKQuantityTypeIdentifierHeartRate',
    'HKQuantityTypeIdentifierRestingHeartRate',
    'HKQuantityTypeIdentifierActiveEnergyBurned',
    'HKQuantityTypeIdentifierBasalEnergyBurned',
    'HKQuantityTypeIdentifierBodyMass',
    'HKQuantityTypeIdentifierBodyMassIndex',
    'HKQuantityTypeIdentifierBodyFatPercentage',
    'HKQuantityTypeIdentifierBloodPressureSystolic',
    'HKQuantityTypeIdentifierBloodPressureDiastolic',
    'HKQuantityTypeIdentifierBloodGlucose',
    'HKQuantityTypeIdentifierOxygenSaturation',
    'HKCategoryTypeIdentifierSleepAnalysis',
    'HKQuantityTypeIdentifierSleepDuration',
    'HKQuantityTypeIdentifierVO2Max',
    'HKQuantityTypeIdentifierRespiratoryRate'
  ];

  return record.type && 
         importantTypes.includes(record.type) && 
         record.startDate && 
         !isNaN(record.value) && 
         record.value !== 0;
}

async function saveBatch(batch: any[], requestId: string) {
  if (batch.length === 0) return;
  
  try {
    const { error } = await supabase
      .from('health_records')
      .insert(batch);
      
    if (error) {
      console.error(`[${requestId}] Batch save error:`, error);
      // Попробуем сохранить по одной записи если батч не прошел
      let savedCount = 0;
      for (const record of batch) {
        try {
          await supabase.from('health_records').insert(record);
          savedCount++;
        } catch (e) {
          console.error(`[${requestId}] Single record save failed:`, e);
        }
      }
      console.log(`[${requestId}] Saved ${savedCount}/${batch.length} records individually`);
    } else {
      console.log(`[${requestId}] Batch of ${batch.length} records saved successfully`);
    }
  } catch (error) {
    console.error(`[${requestId}] Critical batch save error:`, error);
    throw error;
  }
}

async function createDailyAggregates(userId: string, requestId: string) {
  console.log(`[${requestId}] Creating daily aggregates`);
  
  // Агрегируем только последние 30 дней для экономии ресурсов
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    
    try {
      await supabase.rpc('aggregate_daily_health_data', {
        p_user_id: userId,
        p_date: dateStr
      });
    } catch (e) {
      console.error(`Failed to aggregate for ${dateStr}:`, e);
    }
  }
}

async function createImportMetric(userId: string, requestId: string, recordsCount: number) {
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
      value: recordsCount,
      measurement_date: new Date().toISOString().split('T')[0],
      source_data: {
        importDate: new Date().toISOString(),
        requestId,
        recordsImported: recordsCount
      },
      external_id: `apple_health_import_${requestId}`,
      notes: `Apple Health import: ${recordsCount} records processed`
    });
  }
}

async function logError(supabase: any, userId: string, errorType: string, message: string, details: any) {
  try {
    await supabase.from('error_logs').insert({
      user_id: userId,
      error_type: errorType,
      error_message: message,
      error_details: JSON.stringify(details),
      source: 'apple_health',
      url: 'process-apple-health'
    });
  } catch (e) {
    console.error('Failed to log:', e);
  }
}
