import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { readAll } from "https://deno.land/std@0.208.0/io/read_all.ts";
import { Unzip } from "https://deno.land/x/compress@v0.4.6/mod.ts";

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
  let userId: string, filePath: string, requestId: string;
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    requestId = crypto.randomUUID();
    const body = await req.json();
    userId = body.userId;
    filePath = body.filePath;

    console.log(`[${requestId}] Starting processing for user ${userId}, file: ${filePath}`);

    if (!userId || !filePath) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Запускаем фоновую обработку
    const processTask = processAppleHealthFileOptimized(userId, filePath, requestId);
    
    // Используем waitUntil если доступно
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(processTask);
    } else {
      processTask.catch(error => {
        console.error(`[${requestId}] Background error:`, error);
        logError(supabase, userId, 'processing_error', error.message, { requestId, filePath });
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results: {
          status: 'processing_started',
          message: 'Processing in background',
          requestId,
          filePath
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`[${requestId || 'unknown'}] Error:`, error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processAppleHealthFileOptimized(userId: string, filePath: string, requestId: string) {
  const startTime = Date.now();
  let tempExtractPath: string | null = null;
  
  try {
    console.log(`[${requestId}] Background processing started`);
    
    // 1. Проверяем наличие файла
    const { data: fileList, error: listError } = await supabase.storage
      .from('apple-health-uploads')
      .list(filePath.split('/')[0], { 
        search: filePath.split('/')[1] 
      });

    if (listError || !fileList?.length) {
      throw new Error(`File not found: ${filePath}`);
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

    // 2. Для больших файлов используем streaming
    if (fileSize > 100 * 1024 * 1024) { // > 100MB
      console.log(`[${requestId}] Using streaming for large file`);
      await processLargeFileStreaming(userId, filePath, requestId, fileSize);
    } else {
      // Для маленьких файлов - обычная обработка
      await processSmallFile(userId, filePath, requestId);
    }

    // 3. Создаем агрегированные данные
    await createDailyAggregates(userId, requestId);

    // 4. Удаляем обработанный файл
    const { error: deleteError } = await supabase.storage
      .from('apple-health-uploads')
      .remove([filePath]);
      
    if (deleteError) {
      console.error(`[${requestId}] Failed to delete file:`, deleteError);
    }

    const processingTime = Date.now() - startTime;
    await logError(supabase, userId, 'processing_complete', 'Processing completed', {
      requestId,
      processingTimeMs: processingTime,
      fileSizeMB
    });

  } catch (error) {
    console.error(`[${requestId}] Processing failed:`, error);
    await logError(supabase, userId, 'processing_failed', error.message, {
      requestId,
      filePath,
      error: error.stack
    });
    
    // Пытаемся удалить проблемный файл
    try {
      await supabase.storage.from('apple-health-uploads').remove([filePath]);
    } catch (_) {}
  }
}

async function processLargeFileStreaming(
  userId: string, 
  filePath: string, 
  requestId: string,
  fileSize: number
) {
  console.log(`[${requestId}] Starting streaming processing for ${Math.round(fileSize / 1024 / 1024)}MB file`);
  
  // Получаем signed URL для прямого доступа
  const { data: urlData, error: urlError } = await supabase.storage
    .from('apple-health-uploads')
    .createSignedUrl(filePath, 3600); // 1 час

  if (urlError || !urlData?.signedUrl) {
    throw new Error('Failed to create signed URL');
  }

  // Скачиваем и распаковываем ZIP
  const response = await fetch(urlData.signedUrl);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status}`);
  }

  const zipData = await response.arrayBuffer();
  const unzip = new Unzip(new Uint8Array(zipData));
  const entries = unzip.entries();

  // Ищем export.xml в архиве
  let xmlContent: string | null = null;
  for (const entry of entries) {
    if (entry.name.includes('export.xml')) {
      const data = unzip.extract(entry);
      xmlContent = new TextDecoder().decode(data);
      break;
    }
  }

  if (!xmlContent) {
    throw new Error('No export.xml found in Apple Health archive');
  }

  console.log(`[${requestId}] XML extracted, size: ${Math.round(xmlContent.length / 1024 / 1024)}MB`);

  // Парсим XML с помощью streaming подхода
  await parseXMLStreaming(xmlContent, userId, requestId);
}

async function processSmallFile(userId: string, filePath: string, requestId: string) {
  // Скачиваем файл целиком для маленьких файлов
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('apple-health-uploads')
    .download(filePath);
    
  if (downloadError) {
    throw new Error(`Download failed: ${downloadError.message}`);
  }

  const arrayBuffer = await fileData.arrayBuffer();
  const unzip = new Unzip(new Uint8Array(arrayBuffer));
  const entries = unzip.entries();

  let xmlContent: string | null = null;
  for (const entry of entries) {
    if (entry.name.includes('export.xml')) {
      const data = unzip.extract(entry);
      xmlContent = new TextDecoder().decode(data);
      break;
    }
  }

  if (!xmlContent) {
    throw new Error('No export.xml found in archive');
  }

  await parseXMLStreaming(xmlContent, userId, requestId);
}

async function parseXMLStreaming(xmlContent: string, userId: string, requestId: string) {
  const BATCH_SIZE = 100;
  const MAX_MEMORY_BUFFER = 5 * 1024 * 1024; // 5MB буфер
  
  let recordsProcessed = 0;
  let currentBatch: any[] = [];
  let position = 0;
  let buffer = '';
  
  console.log(`[${requestId}] Starting XML parsing, content size: ${Math.round(xmlContent.length / 1024 / 1024)}MB`);

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
      
      // Парсим атрибуты записи с помощью регулярных выражений (экономим память)
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
        await saveBatch(currentBatch);
        recordsProcessed += currentBatch.length;
        currentBatch = [];
        
        // Логируем прогресс каждые 1000 записей
        if (recordsProcessed % 1000 === 0) {
          console.log(`[${requestId}] Processed ${recordsProcessed} records`);
          await logError(supabase, userId, 'processing_progress', 'Progress update', {
            requestId,
            recordsProcessed
          });
        }
      }

      // Удаляем обработанную запись из буфера
      buffer = buffer.slice(recordEnd + 2);
      recordStart = buffer.indexOf('<Record ');
    }

    // Ограничиваем размер буфера
    if (buffer.length > MAX_MEMORY_BUFFER) {
      // Оставляем только последнюю часть буфера
      buffer = buffer.slice(-MAX_MEMORY_BUFFER / 2);
    }
  }

  // Сохраняем оставшиеся записи
  if (currentBatch.length > 0) {
    await saveBatch(currentBatch);
    recordsProcessed += currentBatch.length;
  }

  console.log(`[${requestId}] XML parsing complete, processed ${recordsProcessed} records`);
  
  // Создаем метрику импорта
  await createImportMetric(userId, requestId, recordsProcessed);
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

async function saveBatch(batch: any[]) {
  if (batch.length === 0) return;
  
  const { error } = await supabase
    .from('health_records')
    .insert(batch);
    
  if (error) {
    console.error('Batch save error:', error);
    // Попробуем сохранить по одной записи если батч не прошел
    for (const record of batch) {
      try {
        await supabase.from('health_records').insert(record);
      } catch (e) {
        console.error('Single record save failed:', e);
      }
    }
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
