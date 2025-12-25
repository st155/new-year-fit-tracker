/**
 * Centralized API Client for Edge Functions
 * 
 * This module provides a type-safe, centralized API client for all Edge Function calls.
 * 
 * Features:
 * - **Type-safe API calls**: All methods are fully typed with response interfaces
 * - **Centralized error handling**: Errors are logged via ErrorLogger
 * - **Automatic retry logic**: Failed requests are automatically retried
 * - **Performance metrics**: Each call tracks duration and attempt count
 * - **Consistent logging**: All errors are logged to the database
 * 
 * @example
 * ```typescript
 * import { terraApi } from '@/lib/api';
 * 
 * const { data, error, meta } = await terraApi.realtimeSync('WHOOP');
 * if (data?.success) {
 *   console.log(`Synced ${data.metricsWritten.length} metrics in ${meta?.duration}ms`);
 * }
 * ```
 */

import { supabase } from '@/integrations/supabase/client';
import { ErrorLogger } from '@/lib/error-logger';
import type {
  ApiResponse,
  ApiResponseMeta,
  ApiOptions,
  // Terra types
  TerraRealtimeSyncResult,
  TerraSyncResult,
  TerraDiagnosticsResult,
  TerraHistoricalResult,
  TerraIntegrationResult,
  TerraWidgetResult,
  TerraDeauthResult,
  TerraPurgeResult,
  TerraForceSyncResult,
  WithingsBackfillResult,
  TerraBackfillResult,
  TerraBackfillParams,
  // Supplements types
  SupplementScanResult,
  BarcodeScanResult,
  SupplementEnrichResult,
  CorrelationResult,
  StackGenerationResult,
  AutoLinkBiomarkersResult,
  LibraryBackfillResult,
  PhotoProcessResult,
  EffectivenessAnalysis,
  GenerateProtocolParams,
  GenerateProtocolResult,
  // Documents types
  DocumentCompareResult,
  BatchProcessResult,
  ParseRecommendationsResult,
  ParseLabReportResult,
  RematchBiomarkersResult,
  AnalyzeDocumentResult,
  MigrateDocumentsResult,
  ReclassifyImagingResult,
  ClassifyDocumentResult,
  RenameDocumentResult,
  // Health types
  HealthAnalysisResult,
  HealthPointsResult,
  SleepEfficiencyResult,
  FixUnitConversionsResult,
  FixDuplicateLabResultsResult,
  HealthRecommendationsResult,
  ParseProtocolMessageResult,
  CheckCompletedProtocolsResult,
  AppleHealthImportResult,
  BiomarkerTrendAnalysis,
  ProtocolLifecycleTestResult,
  RecalculateConfidenceResult,
  ProtocolTestsResult,
  CleanProtocolTestsResult,
  CleanupAppleHealthResult,
  PopulateBiomarkerCorrelationsResult,
  // AI Training types
  GenerateTrainingPlanResult,
  GenerateTravelWorkoutResult,
  TrainingGapsAnalysisResult,
  // Admin types
  AdminTerraTokensListResult,
  AdminTerraTokenCreateResult,
  AdminTerraTokenUpdateResult,
  AdminTerraTokenDeleteResult,
  AdminTerraTokenCreateParams,
  AdminTerraTokenUpdateParams,
  TrainerSuggestAdjustmentsResult,
  TrainerExecuteParams,
  TrainerExecuteResult,
  ReprocessWebhookResult,
  SendBroadcastResult,
  // AI types
  ExecuteAIActionsResult,
  GetDailyWorkoutResult,
  AnalyzeFitnessDataResult,
  AskAboutInBodyResult,
  // InBody types
  ParseInBodyResult,
  // Jobs types
  RetryJobResult,
  ResetStuckJobsResult,
  RetryStuckWebhooksResult,
  TriggerJobWorkerResult,
  // Habits types
  DeleteHabitResult,
} from './types';

// Re-export types for convenience
export type { ApiResponse, ApiResponseMeta, ApiOptions } from './types';

const DEFAULT_OPTIONS: ApiOptions = {
  retries: 2,
  retryDelay: 1000,
  timeout: 30000,
};

/**
 * Invokes an Edge Function with automatic retry logic and performance tracking.
 * 
 * @template T - The expected response type
 * @param functionName - Name of the Edge Function to invoke
 * @param body - Optional request body
 * @param options - Optional configuration (retries, delay, timeout)
 * @returns Promise with typed data, error, and performance metadata
 * 
 * @example
 * ```typescript
 * const { data, error, meta } = await invokeWithRetry<MyResponse>('my-function', { param: 'value' });
 * console.log(`Completed in ${meta?.duration}ms after ${meta?.attempts} attempt(s)`);
 * ```
 */
async function invokeWithRetry<T>(
  functionName: string,
  body?: Record<string, unknown>,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const { retries, retryDelay } = { ...DEFAULT_OPTIONS, ...options };
  const startTime = performance.now();
  let lastError: Error | null = null;
  let attempts = 0;

  for (let attempt = 0; attempt <= (retries || 0); attempt++) {
    attempts++;
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body,
      });

      if (error) {
        throw new Error(error.message || `Edge function ${functionName} failed`);
      }

      const duration = performance.now() - startTime;
      const meta: ApiResponseMeta = { duration, attempts, functionName };
      
      return { data: data as T, error: null, meta };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[API] ${functionName} attempt ${attempt + 1} failed:`, lastError.message);
      
      // Log error on final attempt
      if (attempt === (retries || 0)) {
        await ErrorLogger.logAPIError(
          `Edge function ${functionName} failed after ${attempts} attempts: ${lastError.message}`,
          functionName,
          { 
            body: body ? Object.keys(body) : [], // Log only keys for privacy
            attempts,
            lastError: lastError.message 
          }
        );
      }
      
      if (attempt < (retries || 0)) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  const duration = performance.now() - startTime;
  const meta: ApiResponseMeta = { duration, attempts, functionName };
  
  console.error(`[API] ${functionName} failed after ${attempts} attempts`);
  return { data: null, error: lastError, meta };
}

// ===== TERRA INTEGRATION =====
/**
 * Terra API - Wearable device integration endpoints
 * 
 * Handles synchronization with Terra-connected wearable devices like
 * WHOOP, Garmin, Fitbit, Apple Health, and others.
 * 
 * @example
 * ```typescript
 * // Sync real-time data from WHOOP
 * const { data } = await terraApi.realtimeSync('WHOOP');
 * 
 * // Get diagnostics for all providers
 * const { data: diagnostics } = await terraApi.diagnostics();
 * ```
 */
export const terraApi = {
  /**
   * Triggers a basic sync with Terra provider
   * @param provider - Optional provider name (e.g., 'WHOOP', 'GARMIN')
   */
  sync: (provider?: string) => 
    invokeWithRetry<TerraSyncResult>('sync-terra-realtime', { provider }),
  
  /**
   * Triggers real-time synchronization with specified provider
   * @param provider - Provider name (default: 'WHOOP')
   * @returns Sync result with written metrics and any errors
   */
  realtimeSync: (provider: string = 'WHOOP') =>
    invokeWithRetry<TerraRealtimeSyncResult>('sync-terra-realtime', { provider }),
  
  /**
   * Retrieves diagnostic information for Terra connections
   * @param provider - Optional provider to filter diagnostics
   * @returns Token status, webhook logs, and data availability
   */
  diagnostics: (provider?: string) => 
    invokeWithRetry<TerraDiagnosticsResult>('terra-diagnostics', { provider }),
  
  /**
   * Requests historical data from Terra for a specific user
   * @param terraUserId - Terra user ID
   * @param days - Number of days of historical data (default: 30)
   */
  requestHistorical: (terraUserId: string, days?: number) =>
    invokeWithRetry<TerraHistoricalResult>('terra-request-historical', { terra_user_id: terraUserId, days }),
  
  /**
   * Performs Terra integration actions (widget, sync, deauth)
   * @param action - Action to perform
   * @param provider - Optional provider for the action
   */
  integrate: (action: string, provider?: string) =>
    invokeWithRetry<TerraIntegrationResult>('terra-integration', { action, provider }),
  
  /**
   * Generates a Terra widget session URL for device connection
   * @param provider - Optional provider to pre-select
   * @returns Widget URL for user authentication
   */
  generateWidget: (provider?: string) =>
    invokeWithRetry<TerraWidgetResult>('terra-integration', { action: 'generate-widget-session', provider }),
  
  /**
   * Triggers a data sync across all connected providers
   */
  syncData: () =>
    invokeWithRetry<TerraDeauthResult>('terra-integration', { action: 'sync-data' }),
  
  /**
   * Deauthenticates a specific provider connection
   * @param provider - Provider to disconnect
   */
  deauthenticate: (provider: string) =>
    invokeWithRetry<TerraDeauthResult>('terra-integration', { action: 'deauthenticate-user', provider }),
  
  /**
   * Purges all Terra users for a specific provider
   * @param provider - Provider to purge users from
   * @returns Count of users found and purged
   */
  purgeUsers: (provider: string) =>
    invokeWithRetry<TerraPurgeResult>('terra-integration', { action: 'purge-terra-users', provider }),
  
  /**
   * Forces a sync with specific provider and data type
   * @param provider - Provider to sync
   * @param dataType - Optional specific data type to sync
   */
  forceSync: (provider: string, dataType?: string) =>
    invokeWithRetry<TerraForceSyncResult>('force-terra-sync', { provider, dataType }),
  
  /**
   * Backfills historical data from Withings
   * @param daysBack - Number of days to backfill (default: 30)
   * @returns Count of metrics inserted
   */
  withingsBackfill: (daysBack?: number) =>
    invokeWithRetry<WithingsBackfillResult>('withings-backfill', { daysBack }),
  
  /**
   * Initiates a background backfill job for historical data
   * @param params - Backfill parameters including user, provider, and date range
   * @returns Job ID for tracking
   */
  backfill: (params: TerraBackfillParams) =>
    invokeWithRetry<TerraBackfillResult>('terra-backfill', params),
};

// ===== SUPPLEMENTS =====
/**
 * Supplements API - Supplement tracking and analysis endpoints
 * 
 * Provides functionality for scanning supplement bottles, managing supplement stacks,
 * analyzing effectiveness, and generating AI-powered protocols.
 * 
 * @example
 * ```typescript
 * // Scan a supplement bottle
 * const { data } = await supplementsApi.scan(frontImageBase64, backImageBase64);
 * 
 * // Generate an AI supplement protocol
 * const { data: protocol } = await supplementsApi.generateProtocol({
 *   goals: ['energy', 'focus'],
 *   protocol_duration_days: 30
 * });
 * ```
 */
export const supplementsApi = {
  /**
   * Scans supplement bottle images to extract product information
   * @param frontImageBase64 - Base64 encoded front label image
   * @param backImageBase64 - Optional base64 encoded back label image
   * @returns Extracted information and product suggestions
   */
  scan: (frontImageBase64: string, backImageBase64?: string) =>
    invokeWithRetry<SupplementScanResult>('scan-supplement-bottle', { frontImageBase64, backImageBase64 }),
  
  /**
   * Looks up a supplement by barcode
   * @param barcode - Product barcode
   * @param createIfNotFound - Whether to create a new entry if not found
   * @returns Product information if found
   */
  scanBarcode: (barcode: string, createIfNotFound?: boolean) =>
    invokeWithRetry<BarcodeScanResult>('scan-supplement-barcode', { barcode, create_if_not_found: createIfNotFound }),
  
  /**
   * Enriches supplement information with AI-generated data
   * @param productId - Product ID to enrich
   * @param labelData - Optional additional label data
   * @returns Enriched product with benefits, warnings, and interactions
   */
  enrich: (productId: string, labelData?: unknown) =>
    invokeWithRetry<SupplementEnrichResult>('enrich-supplement-info', { productId, labelData }),
  
  /**
   * Calculates correlation between supplement and biomarkers
   * @param stackItemId - Stack item ID to analyze
   * @param timeframeMonths - Analysis timeframe in months
   * @returns Correlation data with affected biomarkers
   */
  calculateCorrelation: (stackItemId: string, timeframeMonths?: number) =>
    invokeWithRetry<CorrelationResult>('calculate-correlation', { stackItemId, timeframeMonths }),
  
  /**
   * Generates a data-driven supplement stack based on biomarker deficiencies
   * @returns Personalized recommendations based on health data
   */
  generateStack: () =>
    invokeWithRetry<StackGenerationResult>('generate-data-driven-stack'),
  
  /**
   * Automatically links a supplement to relevant biomarkers
   * @param stackItemId - Stack item to link
   * @param supplementName - Name of the supplement
   */
  autoLinkBiomarkers: (stackItemId: string, supplementName: string) =>
    invokeWithRetry<AutoLinkBiomarkersResult>('auto-link-biomarkers', { stackItemId, supplementName }),
  
  /**
   * Backfills the supplement library with product data
   * @returns Count of added and skipped items
   */
  backfillLibrary: () =>
    invokeWithRetry<LibraryBackfillResult>('backfill-supplement-library'),
  
  /**
   * Processes and optimizes a supplement photo
   * @param imageBase64 - Base64 encoded image
   * @returns Processed image ready for scanning
   */
  processPhoto: (imageBase64: string) =>
    invokeWithRetry<PhotoProcessResult>('process-supplement-photo', { image: imageBase64 }),
  
  /**
   * Analyzes the effectiveness of a supplement based on biomarker changes
   * @param stackItemId - Stack item to analyze
   * @param userId - User ID for context
   * @returns Effectiveness score and trend analysis
   */
  analyzeEffectiveness: (stackItemId: string, userId: string) =>
    invokeWithRetry<EffectivenessAnalysis>('analyze-supplement-effectiveness', { stackItemId, userId }),
  
  /**
   * Generates an AI-powered supplement protocol based on goals and health conditions
   * @param params - Protocol generation parameters
   * @returns Complete protocol with supplements, dosages, and timing
   * 
   * @example
   * ```typescript
   * const { data } = await supplementsApi.generateProtocol({
   *   goals: ['muscle_gain', 'recovery'],
   *   health_conditions: ['vitamin_d_deficiency'],
   *   dietary_restrictions: ['vegan'],
   *   protocol_duration_days: 60
   * });
   * ```
   */
  generateProtocol: (params: GenerateProtocolParams) =>
    invokeWithRetry<GenerateProtocolResult>('generate-supplement-protocol', params),
};

// ===== MEDICAL DOCUMENTS =====
/**
 * Documents API - Medical document processing endpoints
 * 
 * Handles parsing, analysis, and management of medical documents
 * including lab reports, imaging, and doctor recommendations.
 * 
 * @example
 * ```typescript
 * // Parse a lab report
 * const { data } = await documentsApi.parseLabReport(documentId);
 * 
 * // Compare multiple documents
 * const { data: comparison } = await documentsApi.compare([doc1Id, doc2Id]);
 * ```
 */
export const documentsApi = {
  /**
   * Compares multiple medical documents for trends and changes
   * @param documentIds - Array of document IDs to compare
   * @returns Analysis with similarities, differences, and trends
   */
  compare: (documentIds: string[]) =>
    invokeWithRetry<DocumentCompareResult>('compare-medical-documents', { documentIds }),
  
  /**
   * Batch processes multiple documents
   * @param documentIds - Array of document IDs to process
   * @returns Processing results for each document
   */
  batchProcess: (documentIds: string[]) =>
    invokeWithRetry<BatchProcessResult>('batch-process-documents', { documentIds }),
  
  /**
   * Extracts doctor recommendations from a document
   * @param documentId - Document to parse
   * @returns List of extracted recommendations
   */
  parseRecommendations: (documentId: string) =>
    invokeWithRetry<ParseRecommendationsResult>('parse-doctor-recommendations', { documentId }),
  
  /**
   * Parses a lab report to extract biomarker values
   * @param documentId - Lab report document ID
   */
  parseLabReport: (documentId: string) =>
    invokeWithRetry<ParseLabReportResult>('parse-lab-report', { documentId }),
  
  /**
   * Rematches unmatched biomarkers to master list
   * @param documentId - Optional specific document to rematch
   * @returns Count of rematched biomarkers
   */
  rematchBiomarkers: (documentId?: string) =>
    invokeWithRetry<RematchBiomarkersResult>('rematch-biomarkers', { documentId }),
  
  /**
   * Analyzes a medical document with AI
   * @param documentId - Document to analyze
   */
  analyze: (documentId: string) =>
    invokeWithRetry<AnalyzeDocumentResult>('analyze-medical-document', { documentId }),
  
  /**
   * Migrates legacy documents to the medical_documents table
   * @param action - Migration action to perform
   * @returns Migration statistics
   */
  migrateToMedicalDocuments: (action: string) =>
    invokeWithRetry<MigrateDocumentsResult>('migrate-to-medical-documents', { action }),
  
  /**
   * Reclassifies imaging documents with improved categorization
   * @returns Count of reclassified documents
   */
  reclassifyImaging: () =>
    invokeWithRetry<ReclassifyImagingResult>('reclassify-imaging-documents'),
  
  /**
   * Classifies a document type using AI
   * @param fileName - Name of the file
   * @param fileContent - Optional file content for analysis
   * @param mimeType - Optional MIME type
   * @returns Document type, tags, and confidence score
   */
  classifyDocument: (fileName: string, fileContent?: string, mimeType?: string) =>
    invokeWithRetry<ClassifyDocumentResult>('ai-classify-document', { fileName, fileContent, mimeType }),
  
  /**
   * Suggests a better filename for a document
   * @param fileName - Current filename
   * @param documentType - Detected document type
   * @param fileContent - Optional content for context
   * @returns Suggested new filename
   */
  renameDocument: (fileName: string, documentType: string, fileContent?: string) =>
    invokeWithRetry<RenameDocumentResult>('ai-rename-document', { fileName, documentType, fileContent }),
};

// ===== HEALTH ANALYSIS =====
/**
 * Health API - Health analysis and recommendations endpoints
 * 
 * Provides comprehensive health analysis, biomarker tracking,
 * and personalized recommendations.
 * 
 * @example
 * ```typescript
 * // Generate health analysis
 * const { data } = await healthApi.generateAnalysis(userId);
 * 
 * // Calculate health points
 * const { data: points } = await healthApi.calculateHealthPoints(userId);
 * ```
 */
export const healthApi = {
  /**
   * Generates a comprehensive health analysis for a user
   * @param userId - Optional user ID (uses authenticated user if not provided)
   * @returns AI-generated health analysis
   */
  generateAnalysis: (userId?: string) =>
    invokeWithRetry<HealthAnalysisResult>('generate-health-analysis', { userId }),
  
  /**
   * Calculates health points score with breakdown by category
   * @param userId - User ID to calculate for
   * @returns Total points and breakdown by health area
   */
  calculateHealthPoints: (userId: string) =>
    invokeWithRetry<HealthPointsResult>('calculate-health-points', { userId }),
  
  /**
   * Calculates sleep efficiency percentage
   * @param userId - User ID
   * @returns Sleep efficiency score
   */
  calculateSleepEfficiency: (userId: string) =>
    invokeWithRetry<SleepEfficiencyResult>('calculate-sleep-efficiency', { userId }),
  
  /**
   * Fixes unit conversion issues in biomarker data
   * @returns Count of fixed records
   */
  fixUnitConversions: () =>
    invokeWithRetry<FixUnitConversionsResult>('fix-unit-conversions'),
  
  /**
   * Removes duplicate lab results
   * @returns Count of deleted duplicates
   */
  fixDuplicateLabResults: () =>
    invokeWithRetry<FixDuplicateLabResultsResult>('fix-duplicate-lab-results'),
  
  /**
   * Generates personalized health recommendations
   * @returns AI-generated recommendations with context
   */
  generateRecommendations: () =>
    invokeWithRetry<HealthRecommendationsResult>('generate-health-recommendations', {}),
  
  /**
   * Parses a text message to extract supplement information
   * @param message - Text message to parse
   * @returns Extracted supplement details
   */
  parseProtocolMessage: (message: string) =>
    invokeWithRetry<ParseProtocolMessageResult>('parse-protocol-message', { message }),
  
  /**
   * Checks for completed supplement protocols
   * @returns Whether check was performed
   */
  checkCompletedProtocols: () =>
    invokeWithRetry<CheckCompletedProtocolsResult>('check-completed-protocols'),
  
  /**
   * Imports Apple Health data from exported file
   * @param userId - User ID to import for
   * @param filePath - Path to the export file
   * @returns Import statistics
   */
  importAppleHealth: (userId: string, filePath: string) =>
    invokeWithRetry<AppleHealthImportResult>('apple-health-import', { userId, filePath }),
  
  /**
   * Analyzes trends for a specific biomarker
   * @param biomarkerId - Biomarker to analyze
   * @returns Trend analysis with predictions
   */
  analyzeBiomarkerTrends: (biomarkerId: string) =>
    invokeWithRetry<BiomarkerTrendAnalysis>('analyze-biomarker-trends', { biomarkerId }),
  
  /**
   * Tests the complete protocol lifecycle
   * @param userId - User ID for testing
   * @returns Test results and summary
   */
  testProtocolLifecycle: (userId: string) =>
    invokeWithRetry<ProtocolLifecycleTestResult>('test-protocol-lifecycle', { userId }),
  
  /**
   * Recalculates confidence scores for metrics
   * @param userId - User ID
   * @param metricName - Optional specific metric to recalculate
   */
  recalculateConfidence: (userId: string, metricName?: string) =>
    invokeWithRetry<RecalculateConfidenceResult>('recalculate-confidence', { user_id: userId, metric_name: metricName }),
  
  /**
   * Runs protocol test suite
   * @param userId - User ID for tests
   * @returns Test data with counts
   */
  runProtocolTests: (userId: string) =>
    invokeWithRetry<ProtocolTestsResult>('run-protocol-tests', { userId }),
  
  /**
   * Cleans up protocol test data
   * @param userId - User ID
   * @returns Count of deleted test records
   */
  cleanProtocolTests: (userId: string) =>
    invokeWithRetry<CleanProtocolTestsResult>('clean-protocol-tests', { userId }),
  
  /**
   * Cleans up Apple Health imported data
   * @param userId - User ID
   * @returns Count of deleted metrics
   */
  cleanupAppleHealth: (userId: string) =>
    invokeWithRetry<CleanupAppleHealthResult>('cleanup-apple-health', { userId }),
  
  /**
   * Populates biomarker correlation data
   * @returns Success status
   */
  populateBiomarkerCorrelations: () =>
    invokeWithRetry<PopulateBiomarkerCorrelationsResult>('populate-biomarker-correlations'),
};

// ===== AI TRAINING =====
/**
 * AI Training API - AI-powered workout generation endpoints
 * 
 * Generates personalized training plans and workouts using AI.
 * 
 * @example
 * ```typescript
 * // Generate a training plan
 * const { data } = await aiTrainingApi.generatePlan(userId);
 * ```
 */
export const aiTrainingApi = {
  /**
   * Generates a complete AI training plan
   * @param userId - User ID to generate plan for
   * @returns Training program with workout count
   */
  generatePlan: (userId: string) =>
    invokeWithRetry<GenerateTrainingPlanResult>('generate-ai-training-plan', { user_id: userId }),
  
  /**
   * Generates a travel-friendly workout
   * @param params - Workout parameters (equipment, duration, etc.)
   * @returns Customized travel workout
   */
  generateTravelWorkout: (params: Record<string, unknown>) =>
    invokeWithRetry<GenerateTravelWorkoutResult>('generate-travel-workout', params),
  
  /**
   * Analyzes training gaps and provides suggestions
   * @param lookbackDays - Number of days to analyze
   * @returns Gap analysis with recommendations
   */
  analyzeGaps: (lookbackDays: number) =>
    invokeWithRetry<TrainingGapsAnalysisResult>('analyze-training-gaps', { lookbackDays }),
};

// ===== ADMIN =====
/**
 * Admin API - Administrative and trainer endpoints
 * 
 * Provides administrative functions for managing Terra tokens,
 * trainer operations, and system maintenance.
 * 
 * @example
 * ```typescript
 * // List all Terra tokens
 * const { data } = await adminApi.terraTokens.list();
 * 
 * // Send a trainer broadcast
 * const { data: result } = await adminApi.sendBroadcast(broadcastId);
 * ```
 */
export const adminApi = {
  /**
   * Terra token management endpoints
   */
  terraTokens: {
    /**
     * Lists all Terra tokens
     * @returns Array of Terra tokens
     */
    list: () => invokeWithRetry<AdminTerraTokensListResult>('admin-terra-tokens', { action: 'list' }),
    
    /**
     * Creates a new Terra token
     * @param params - Token creation parameters
     * @returns Created token
     */
    create: (params: AdminTerraTokenCreateParams) =>
      invokeWithRetry<AdminTerraTokenCreateResult>('admin-terra-tokens', { action: 'create', data: params }),
    
    /**
     * Updates an existing Terra token
     * @param params - Token update parameters
     * @returns Updated token
     */
    update: (params: AdminTerraTokenUpdateParams) =>
      invokeWithRetry<AdminTerraTokenUpdateResult>('admin-terra-tokens', { action: 'update', data: params }),
    
    /**
     * Deletes a Terra token
     * @param id - Token ID to delete
     */
    delete: (id: string) =>
      invokeWithRetry<AdminTerraTokenDeleteResult>('admin-terra-tokens', { action: 'delete', data: { id } }),
    
    /**
     * Deauthenticates a specific Terra user
     * @param terraUserId - Terra user ID
     * @param provider - Optional provider filter
     */
    deauthUser: (terraUserId: string, provider?: string) =>
      invokeWithRetry<AdminTerraTokenDeleteResult>('admin-terra-tokens', { 
        action: 'deauth-user', 
        data: { terraUserId, provider } 
      }),
    
    /**
     * Deauthenticates all tokens for a user
     * @param targetUserId - User ID to deauth
     * @param providerFilter - Optional provider filter
     */
    deauthAll: (targetUserId: string, providerFilter?: string) =>
      invokeWithRetry<AdminTerraTokenDeleteResult>('admin-terra-tokens', { 
        action: 'deauth-all', 
        data: { targetUserId, providerFilter } 
      }),
  },
  
  /**
   * Requests AI suggestions for client training adjustments
   * @param clientId - Client ID to analyze
   * @param forceRegenerate - Whether to force new analysis
   * @returns Suggestions summary and count
   */
  trainerSuggestAdjustments: (clientId: string, forceRegenerate?: boolean) =>
    invokeWithRetry<TrainerSuggestAdjustmentsResult>('trainer-ai-suggest-adjustments', { clientId, forceRegenerate }),
  
  /**
   * Executes trainer AI actions
   * @param params - Execution parameters
   * @returns Execution result
   */
  trainerExecute: (params: TrainerExecuteParams) =>
    invokeWithRetry<TrainerExecuteResult>('trainer-ai-execute', params),
  
  /**
   * Reprocesses a failed webhook
   * @param webhookId - Webhook ID to reprocess
   */
  reprocessWebhook: (webhookId: string) =>
    invokeWithRetry<ReprocessWebhookResult>('reprocess-webhook', { webhookId }),
  
  /**
   * Sends a trainer broadcast message
   * @param broadcastId - Broadcast ID to send
   * @returns Count of messages sent
   */
  sendBroadcast: (broadcastId: string) =>
    invokeWithRetry<SendBroadcastResult>('send-trainer-broadcast', { broadcastId }),
};

// ===== AI =====
/**
 * AI API - AI-powered features endpoints
 * 
 * Provides AI functionality for fitness analysis, workouts, and Q&A.
 * 
 * @example
 * ```typescript
 * // Analyze fitness data from an image
 * const { data } = await aiApi.analyzeFitnessData(imageUrl, userId);
 * ```
 */
export const aiApi = {
  /**
   * Executes pending AI actions
   * @param pendingActionId - Action ID to execute
   * @param conversationId - Optional conversation context
   * @param actions - Optional specific actions to execute
   * @returns Execution results
   */
  executeActions: (pendingActionId: string, conversationId?: string, actions?: unknown[]) =>
    invokeWithRetry<ExecuteAIActionsResult>('execute-ai-actions', { 
      pendingActionId, 
      conversationId, 
      actions 
    }),
  
  /**
   * Gets the daily AI-generated workout
   * @param userId - User ID
   * @param date - Optional date (defaults to today)
   * @returns Daily workout details
   */
  getDailyWorkout: (userId: string, date?: string) =>
    invokeWithRetry<GetDailyWorkoutResult>('get-daily-ai-workout', { user_id: userId, date }),
  
  /**
   * Analyzes fitness data from an uploaded image
   * @param imageUrl - URL of the image to analyze
   * @param userId - User ID
   * @param goalId - Optional goal to track progress against
   * @param measurementDate - Optional measurement date
   * @returns Analysis results and saved measurements
   */
  analyzeFitnessData: (imageUrl: string, userId: string, goalId?: string, measurementDate?: string) =>
    invokeWithRetry<AnalyzeFitnessDataResult>('analyze-fitness-data', { 
      imageUrl, 
      userId, 
      goalId, 
      measurementDate 
    }),
  
  /**
   * Asks a question about an InBody analysis
   * @param analysisId - InBody analysis ID
   * @param question - Question to ask
   * @returns AI-generated answer
   */
  askAboutInBody: (analysisId: string, question: string) =>
    invokeWithRetry<AskAboutInBodyResult>('ask-about-inbody', { analysisId, question }),
};

// ===== INBODY =====
/**
 * InBody API - InBody scan parsing endpoints
 * 
 * Handles parsing of InBody body composition scan results.
 * 
 * @example
 * ```typescript
 * const { data } = await inbodyApi.parse(imagePages, uploadId);
 * ```
 */
export const inbodyApi = {
  /**
   * Parses InBody scan images/PDF
   * @param images - Array of base64 encoded page images
   * @param uploadId - Upload ID for tracking
   * @returns Parsed body composition analysis
   */
  parse: (images: string[], uploadId: string) =>
    invokeWithRetry<ParseInBodyResult>('parse-inbody-pdf', { images, uploadId }),
};

// ===== JOBS =====
/**
 * Jobs API - Background job management endpoints
 * 
 * Manages background jobs, webhooks, and system maintenance tasks.
 * 
 * @example
 * ```typescript
 * // Reset stuck jobs
 * const { data } = await jobsApi.resetStuck();
 * ```
 */
export const jobsApi = {
  /**
   * Retries a specific failed job
   * @param jobId - Job ID to retry
   */
  retry: (jobId: string) =>
    invokeWithRetry<RetryJobResult>('retry-jobs', { jobId }),
  
  /**
   * Resets all stuck jobs to pending state
   * @returns Count of reset jobs
   */
  resetStuck: () =>
    invokeWithRetry<ResetStuckJobsResult>('reset-stuck-jobs'),
  
  /**
   * Retries all stuck webhook processing jobs
   * @returns Count of processed webhooks
   */
  retryStuckWebhooks: () =>
    invokeWithRetry<RetryStuckWebhooksResult>('retry-stuck-webhooks'),
  
  /**
   * Triggers the background job worker
   */
  trigger: () =>
    invokeWithRetry<TriggerJobWorkerResult>('job-worker'),
};

// ===== HABITS =====
/**
 * Habits API - Habit tracking endpoints
 * 
 * Manages user habits and tracking.
 * 
 * @example
 * ```typescript
 * const { data } = await habitsApi.delete(habitId);
 * ```
 */
export const habitsApi = {
  /**
   * Deletes a habit and all associated data
   * @param habitId - Habit ID to delete
   * @returns Deletion result with count of deleted records
   */
  delete: (habitId: string) =>
    invokeWithRetry<DeleteHabitResult>('delete-habit', { habitId }),
};

// ===== UNIFIED API OBJECT =====
/**
 * Unified API object providing access to all API namespaces
 * 
 * @example
 * ```typescript
 * import { api } from '@/lib/api';
 * 
 * // Access any API namespace
 * await api.terra.realtimeSync('WHOOP');
 * await api.supplements.generateStack();
 * await api.health.generateAnalysis();
 * ```
 */
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
