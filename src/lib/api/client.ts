/**
 * Centralized API Client for Edge Functions
 * 
 * Benefits:
 * - Type-safe API calls
 * - Centralized error handling
 * - Automatic retry logic
 * - Consistent logging
 */

import { supabase } from '@/integrations/supabase/client';

interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

interface ApiOptions {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
}

const DEFAULT_OPTIONS: ApiOptions = {
  retries: 2,
  retryDelay: 1000,
  timeout: 30000,
};

async function invokeWithRetry<T>(
  functionName: string,
  body?: Record<string, unknown>,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const { retries, retryDelay } = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= (retries || 0); attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body,
      });

      if (error) {
        throw new Error(error.message || `Edge function ${functionName} failed`);
      }

      return { data: data as T, error: null };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[API] ${functionName} attempt ${attempt + 1} failed:`, lastError.message);
      
      if (attempt < (retries || 0)) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  console.error(`[API] ${functionName} failed after ${(retries || 0) + 1} attempts`);
  return { data: null, error: lastError };
}

// ===== TERRA INTEGRATION =====
export const terraApi = {
  sync: (provider?: string) => 
    invokeWithRetry<{ success: boolean; metrics?: number }>('sync-terra-realtime', { provider }),
  
  realtimeSync: (provider: string = 'WHOOP') =>
    invokeWithRetry<{ success: boolean; metricsWritten: string[]; errors?: string[]; duration: number }>('sync-terra-realtime', { provider }),
  
  diagnostics: (provider?: string) => 
    invokeWithRetry<{ tokens?: unknown[]; webhooks?: unknown[]; date_range?: { start: string; end: string }; available_in_terra?: unknown; in_database?: unknown; missing_in_db?: unknown; webhook_logs?: unknown[] }>('terra-diagnostics', { provider }),
  
  requestHistorical: (terraUserId: string, days?: number) =>
    invokeWithRetry<{ success: boolean }>('terra-request-historical', { terra_user_id: terraUserId, days }),
  
  integrate: (action: string, provider?: string) =>
    invokeWithRetry<{ url?: string; success?: boolean }>('terra-integration', { action, provider }),
  
  generateWidget: (provider?: string) =>
    invokeWithRetry<{ url: string }>('terra-integration', { action: 'generate-widget-session', provider }),
  
  syncData: () =>
    invokeWithRetry<{ success: boolean }>('terra-integration', { action: 'sync-data' }),
  
  deauthenticate: (provider: string) =>
    invokeWithRetry<{ success: boolean }>('terra-integration', { action: 'deauthenticate-user', provider }),
  
  purgeUsers: (provider: string) =>
    invokeWithRetry<{ success: boolean; terra_users_found?: number }>('terra-integration', { action: 'purge-terra-users', provider }),
  
  forceSync: (provider: string, dataType?: string) =>
    invokeWithRetry<{ success: boolean }>('force-terra-sync', { provider, dataType }),
  
  withingsBackfill: (daysBack?: number) =>
    invokeWithRetry<{ metricsInserted: number }>('withings-backfill', { daysBack }),
  
  backfill: (params: { userId: string; provider: string; terraUserId: string; startDaysAgo: number }) =>
    invokeWithRetry<{ success: boolean; jobId?: string }>('terra-backfill', params),
};

// ===== SUPPLEMENTS =====
export const supplementsApi = {
  scan: (frontImageBase64: string, backImageBase64?: string) =>
    invokeWithRetry<{ success: boolean; extracted?: any; suggestions?: any; quick_match?: boolean; productId?: string; error?: string }>('scan-supplement-bottle', { frontImageBase64, backImageBase64 }),
  
  scanBarcode: (barcode: string, createIfNotFound?: boolean) =>
    invokeWithRetry<{ found: boolean; product?: any }>('scan-supplement-barcode', { barcode, create_if_not_found: createIfNotFound }),
  
  enrich: (productId: string, labelData?: any) =>
    invokeWithRetry<{ success: boolean; product?: any; enrichedData?: any; error?: string }>('enrich-supplement-info', { productId, labelData }),
  
  calculateCorrelation: (stackItemId: string, timeframeMonths?: number) =>
    invokeWithRetry<unknown>('calculate-correlation', { stackItemId, timeframeMonths }),
  
  generateStack: () =>
    invokeWithRetry<{ success: boolean; recommendations?: unknown[]; message?: string; no_deficiencies?: boolean; error?: string; analysis?: unknown; deficiencies?: unknown[] }>('generate-data-driven-stack'),
  
  autoLinkBiomarkers: (stackItemId: string, supplementName: string) =>
    invokeWithRetry<{ success: boolean }>('auto-link-biomarkers', { stackItemId, supplementName }),
  
  backfillLibrary: () =>
    invokeWithRetry<{ success: boolean; addedCount: number; skippedCount: number }>('backfill-supplement-library'),
  
  processPhoto: (imageBase64: string) =>
    invokeWithRetry<{ success: boolean; processedImage?: string; error?: string }>('process-supplement-photo', { image: imageBase64 }),
  
  analyzeEffectiveness: (stackItemId: string, userId: string) =>
    invokeWithRetry<unknown>('analyze-supplement-effectiveness', { stackItemId, userId }),
};

// ===== MEDICAL DOCUMENTS =====
export const documentsApi = {
  compare: (documentIds: string[]) =>
    invokeWithRetry<{ analysis: string; comparison?: unknown }>('compare-medical-documents', { documentIds }),
  
  batchProcess: (documentIds: string[]) =>
    invokeWithRetry<{ results: unknown[] }>('batch-process-documents', { documentIds }),
  
  parseRecommendations: (documentId: string) =>
    invokeWithRetry<{ recommendations: unknown[] }>('parse-doctor-recommendations', { documentId }),
  
  parseLabReport: (documentId: string) =>
    invokeWithRetry<{ success: boolean }>('parse-lab-report', { documentId }),
  
  rematchBiomarkers: (documentId?: string) =>
    invokeWithRetry<{ rematchedCount: number; totalUnmatched: number }>('rematch-biomarkers', { documentId }),
  
  analyze: (documentId: string) =>
    invokeWithRetry<{ success: boolean }>('analyze-medical-document', { documentId }),
  
  migrateToMedicalDocuments: (action: string) =>
    invokeWithRetry<{ total_migrated: number; inbody?: { migrated: number; total: number; errors?: unknown[] }; photos?: { migrated: number; total: number; errors?: unknown[] } }>('migrate-to-medical-documents', { action }),
  
  reclassifyImaging: () =>
    invokeWithRetry<{ reclassified: number }>('reclassify-imaging-documents'),
  
  classifyDocument: (fileName: string, fileContent?: string, mimeType?: string) =>
    invokeWithRetry<{ document_type: string; tags: string[]; suggested_date: string | null; confidence: number }>('ai-classify-document', { fileName, fileContent, mimeType }),
  
  renameDocument: (fileName: string, documentType: string, fileContent?: string) =>
    invokeWithRetry<{ suggestedName: string }>('ai-rename-document', { fileName, documentType, fileContent }),
};

// ===== HEALTH ANALYSIS =====
export const healthApi = {
  generateAnalysis: (userId?: string) =>
    invokeWithRetry<{ analysis: string }>('generate-health-analysis', { userId }),
  
  calculateHealthPoints: (userId: string) =>
    invokeWithRetry<{ points: number; breakdown: unknown }>('calculate-health-points', { userId }),
  
  calculateSleepEfficiency: (userId: string) =>
    invokeWithRetry<{ efficiency: number }>('calculate-sleep-efficiency', { userId }),
  
  fixUnitConversions: () =>
    invokeWithRetry<{ updated: number; skipped?: number; total?: number }>('fix-unit-conversions'),
  
  fixDuplicateLabResults: () =>
    invokeWithRetry<{ deleted: number }>('fix-duplicate-lab-results'),
  
  generateRecommendations: () =>
    invokeWithRetry<{ recommendations: string; context: unknown }>('generate-health-recommendations', {}),
  
  parseProtocolMessage: (message: string) =>
    invokeWithRetry<{ success: boolean; supplements: unknown[]; error?: string }>('parse-protocol-message', { message }),
  
  checkCompletedProtocols: () =>
    invokeWithRetry<{ checked: boolean }>('check-completed-protocols'),
  
  importAppleHealth: (userId: string, filePath: string) =>
    invokeWithRetry<{ results: unknown }>('apple-health-import', { userId, filePath }),
  
  analyzeBiomarkerTrends: (biomarkerId: string) =>
    invokeWithRetry<any>('analyze-biomarker-trends', { biomarkerId }),
  
  testProtocolLifecycle: (userId: string) =>
    invokeWithRetry<{ success: boolean; summary: unknown; results: unknown[]; timestamp: string }>('test-protocol-lifecycle', { userId }),
  
  recalculateConfidence: (userId: string, metricName?: string) =>
    invokeWithRetry<{ success: boolean }>('recalculate-confidence', { user_id: userId, metric_name: metricName }),
  
  runProtocolTests: (userId: string) =>
    invokeWithRetry<{ test_data: { protocols_created: number; alerts_created: number } }>('run-protocol-tests', { userId }),
  
  cleanProtocolTests: (userId: string) =>
    invokeWithRetry<{ deleted_count: number }>('clean-protocol-tests', { userId }),
  
  cleanupAppleHealth: (userId: string) =>
    invokeWithRetry<{ deletedMetrics: number }>('cleanup-apple-health', { userId }),
  
  populateBiomarkerCorrelations: () =>
    invokeWithRetry<{ success: boolean }>('populate-biomarker-correlations'),
};

// ===== AI TRAINING =====
export const aiTrainingApi = {
  generatePlan: (userId: string) =>
    invokeWithRetry<{ program_data: { program_name: string }; workout_count: number }>('generate-ai-training-plan', { user_id: userId }),
  
  generateTravelWorkout: (params: Record<string, unknown>) =>
    invokeWithRetry<unknown>('generate-travel-workout', params),
  
  analyzeGaps: (lookbackDays: number) =>
    invokeWithRetry<unknown>('analyze-training-gaps', { lookbackDays }),
};

// ===== ADMIN =====
export const adminApi = {
  terraTokens: {
    list: () => invokeWithRetry<{ tokens: unknown[] }>('admin-terra-tokens', { action: 'list' }),
    create: (params: { user_id: string; terra_user_id: string; provider: string }) =>
      invokeWithRetry<{ token: unknown }>('admin-terra-tokens', { action: 'create', data: params }),
    update: (params: { id: string; is_active?: boolean }) =>
      invokeWithRetry<{ token: unknown }>('admin-terra-tokens', { action: 'update', data: params }),
    delete: (id: string) =>
      invokeWithRetry<{ success: boolean }>('admin-terra-tokens', { action: 'delete', data: { id } }),
    deauthUser: (terraUserId: string, provider?: string) =>
      invokeWithRetry<{ success: boolean }>('admin-terra-tokens', { 
        action: 'deauth-user', 
        data: { terraUserId, provider } 
      }),
    deauthAll: (targetUserId: string, providerFilter?: string) =>
      invokeWithRetry<{ success: boolean }>('admin-terra-tokens', { 
        action: 'deauth-all', 
        data: { targetUserId, providerFilter } 
      }),
  },
  
  trainerSuggestAdjustments: (clientId: string, forceRegenerate?: boolean) =>
    invokeWithRetry<{ analysis_summary?: string; suggestions_count?: number }>('trainer-ai-suggest-adjustments', { clientId, forceRegenerate }),
  
  trainerExecute: (params: { trainerId: string; clientId?: string; actions?: unknown[]; autoConfirm?: boolean }) =>
    invokeWithRetry<{ success: boolean }>('trainer-ai-execute', params),
  
  reprocessWebhook: (webhookId: string) =>
    invokeWithRetry<{ success: boolean }>('reprocess-webhook', { webhookId }),
  
  sendBroadcast: (broadcastId: string) =>
    invokeWithRetry<{ sent_count: number }>('send-trainer-broadcast', { broadcastId }),
};

// ===== AI =====
export const aiApi = {
  executeActions: (pendingActionId: string, conversationId?: string, actions?: unknown[]) =>
    invokeWithRetry<{ success: boolean; results: { success: boolean; message?: string }[] }>('execute-ai-actions', { 
      pendingActionId, 
      conversationId, 
      actions 
    }),
  
  getDailyWorkout: (userId: string, date?: string) =>
    invokeWithRetry<{ success: boolean; workout?: unknown }>('get-daily-ai-workout', { user_id: userId, date }),
  
  analyzeFitnessData: (imageUrl: string, userId: string, goalId?: string, measurementDate?: string) =>
    invokeWithRetry<{ success: boolean; saved?: boolean; message?: string; analysis?: unknown; savedMeasurements?: unknown[] }>('analyze-fitness-data', { 
      imageUrl, 
      userId, 
      goalId, 
      measurementDate 
    }),
  
  askAboutInBody: (analysisId: string, question: string) =>
    invokeWithRetry<{ answer: string }>('ask-about-inbody', { analysisId, question }),
};

// ===== INBODY =====
export const inbodyApi = {
  parse: (images: string[], uploadId: string) =>
    invokeWithRetry<{ success: boolean; analysis?: unknown; error?: string }>('parse-inbody-pdf', { images, uploadId }),
};

// ===== JOBS =====
export const jobsApi = {
  retry: (jobId: string) =>
    invokeWithRetry<{ success: boolean }>('retry-jobs', { jobId }),
  
  resetStuck: () =>
    invokeWithRetry<{ count: number }>('reset-stuck-jobs'),
  
  retryStuckWebhooks: () =>
    invokeWithRetry<{ processed: number }>('retry-stuck-webhooks'),
  
  trigger: () =>
    invokeWithRetry<{ success: boolean }>('job-worker'),
};

// ===== HABITS =====
export const habitsApi = {
  delete: (habitId: string) =>
    invokeWithRetry<{ success: boolean; deletedCount?: number }>('delete-habit', { habitId }),
};

// ===== SUPPLEMENTS (additional) =====
export const supplementsApiExtended = {
  generateProtocol: (params: {
    user_id?: string;
    goals: string[];
    health_conditions?: string[];
    dietary_restrictions?: string[];
    protocol_duration_days?: number;
  }) => invokeWithRetry<{ protocol: unknown }>('generate-supplement-protocol', params),
};

// ===== UNIFIED API OBJECT =====
export const api = {
  terra: terraApi,
  supplements: supplementsApi,
  documents: documentsApi,
  health: healthApi,
  aiTraining: aiTrainingApi,
  admin: adminApi,
  jobs: jobsApi,
  ai: aiApi,
  inbody: inbodyApi,
  habits: habitsApi,
};

export default api;
