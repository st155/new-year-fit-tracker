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
  
  diagnostics: () => 
    invokeWithRetry<{ tokens: unknown[]; webhooks: unknown[] }>('terra-diagnostics'),
  
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
};

// ===== SUPPLEMENTS =====
export const supplementsApi = {
  scan: (imageBase64: string) =>
    invokeWithRetry<{ product: unknown; confidence: number }>('scan-supplement-bottle', { imageBase64 }),
  
  scanBarcode: (barcode: string) =>
    invokeWithRetry<{ product: unknown }>('scan-supplement-barcode', { barcode }),
  
  enrich: (productId: string) =>
    invokeWithRetry<{ enrichedData: unknown }>('enrich-supplement-info', { productId }),
  
  calculateCorrelation: (stackItemId: string, timeframeMonths?: number) =>
    invokeWithRetry<{ correlation: unknown }>('calculate-correlation', { stackItemId, timeframeMonths }),
  
  generateStack: () =>
    invokeWithRetry<{ recommendations: unknown[] }>('generate-data-driven-stack'),
};

// ===== MEDICAL DOCUMENTS =====
export const documentsApi = {
  compare: (documentIds: string[]) =>
    invokeWithRetry<{ comparison: unknown }>('compare-medical-documents', { documentIds }),
  
  batchProcess: (documentIds: string[]) =>
    invokeWithRetry<{ results: unknown[] }>('batch-process-documents', { documentIds }),
  
  parseRecommendations: (documentId: string) =>
    invokeWithRetry<{ recommendations: unknown[] }>('parse-doctor-recommendations', { documentId }),
  
  parseLabReport: (documentId: string) =>
    invokeWithRetry<{ success: boolean }>('parse-lab-report', { documentId }),
  
  rematchBiomarkers: (documentId: string) =>
    invokeWithRetry<{ rematchedCount: number; totalUnmatched: number }>('rematch-biomarkers', { documentId }),
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
    invokeWithRetry<{ updated: number }>('fix-unit-conversions', {}),
  
  generateRecommendations: () =>
    invokeWithRetry<{ recommendations: string; context: unknown }>('generate-health-recommendations', {}),
  
  parseProtocolMessage: (message: string) =>
    invokeWithRetry<{ success: boolean; supplements: unknown[]; error?: string }>('parse-protocol-message', { message }),
  
  checkCompletedProtocols: () =>
    invokeWithRetry<{ checked: boolean }>('check-completed-protocols'),
  
  importAppleHealth: (userId: string, filePath: string) =>
    invokeWithRetry<{ results: unknown }>('apple-health-import', { userId, filePath }),
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
  reprocessWebhook: (webhookId: string) =>
    invokeWithRetry<{ success: boolean }>('reprocess-webhook', { webhookId }),
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
};

export default api;
