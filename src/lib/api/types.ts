/**
 * API Type Definitions
 * 
 * Comprehensive type definitions for all Edge Function API responses.
 * These types ensure type-safety across the entire API client.
 */

// ============================================
// COMMON TYPES
// ============================================

/** Standard API response with metadata */
export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
  meta?: ApiResponseMeta;
}

/** Performance metadata for API calls */
export interface ApiResponseMeta {
  /** Duration of the API call in milliseconds */
  duration: number;
  /** Number of attempts made (1 = first attempt succeeded) */
  attempts: number;
  /** Name of the edge function called */
  functionName: string;
}

/** API client options */
export interface ApiOptions {
  /** Number of retry attempts on failure (default: 2) */
  retries?: number;
  /** Delay between retries in milliseconds (default: 1000) */
  retryDelay?: number;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

// ============================================
// TERRA API TYPES
// ============================================

/** Result of Terra real-time sync operation */
export interface TerraRealtimeSyncResult {
  success: boolean;
  metricsWritten: string[];
  errors?: string[];
  duration: number;
}

/** Terra sync result (simplified) */
export interface TerraSyncResult {
  success: boolean;
  metrics?: number;
}

/** Terra token information */
export interface TerraToken {
  id: string;
  user_id: string;
  terra_user_id: string;
  provider: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Webhook log entry */
export interface WebhookLog {
  id: string;
  provider: string;
  event_type: string;
  payload: unknown;
  created_at: string;
}

/** Webhook information */
export interface WebhookInfo {
  id: string;
  provider: string;
  status: string;
  last_received_at?: string;
}

/** Terra diagnostics result */
export interface TerraDiagnosticsResult {
  tokens?: TerraToken[];
  webhooks?: WebhookInfo[];
  date_range?: { start: string; end: string };
  available_in_terra?: unknown;
  in_database?: unknown;
  missing_in_db?: unknown;
  webhook_logs?: WebhookLog[];
}

/** Terra historical data request result */
export interface TerraHistoricalResult {
  success: boolean;
}

/** Terra integration result */
export interface TerraIntegrationResult {
  url?: string;
  success?: boolean;
}

/** Terra widget generation result */
export interface TerraWidgetResult {
  url: string;
}

/** Terra deauthentication result */
export interface TerraDeauthResult {
  success: boolean;
}

/** Terra user purge result */
export interface TerraPurgeResult {
  success: boolean;
  terra_users_found?: number;
}

/** Terra force sync result */
export interface TerraForceSyncResult {
  success: boolean;
}

/** Withings backfill result */
export interface WithingsBackfillResult {
  metricsInserted: number;
}

/** Terra backfill result */
export interface TerraBackfillResult {
  success: boolean;
  jobId?: string;
}

/** Terra backfill parameters */
export interface TerraBackfillParams {
  userId: string;
  provider: string;
  terraUserId: string;
  startDaysAgo: number;
  [key: string]: unknown;
}

// ============================================
// SUPPLEMENTS API TYPES
// ============================================

/** Extracted supplement information from label */
export interface SupplementExtraction {
  brand?: string;
  productName?: string;
  ingredients?: SupplementIngredient[];
  servingSize?: string;
  servingsPerContainer?: number;
}

/** Individual supplement ingredient */
export interface SupplementIngredient {
  name: string;
  amount?: string;
  unit?: string;
  dailyValue?: number;
}

/** Supplement suggestion from database */
export interface SupplementSuggestion {
  id: string;
  name: string;
  brand?: string;
  similarity: number;
}

/** Supplement scan result */
export interface SupplementScanResult {
  success: boolean;
  extracted?: SupplementExtraction;
  suggestions?: SupplementSuggestion[];
  quick_match?: boolean;
  productId?: string;
  error?: string;
}

/** Product information */
export interface SupplementProduct {
  id: string;
  name: string;
  brand?: string;
  ingredients?: SupplementIngredient[];
  imageUrl?: string;
  barcode?: string;
}

/** Barcode scan result */
export interface BarcodeScanResult {
  found: boolean;
  product?: SupplementProduct;
}

/** Enriched supplement data */
export interface EnrichedSupplementData {
  description?: string;
  benefits?: string[];
  warnings?: string[];
  interactions?: string[];
}

/** Supplement enrichment result */
export interface SupplementEnrichResult {
  success: boolean;
  product?: SupplementProduct;
  enrichedData?: EnrichedSupplementData;
  error?: string;
}

/** Correlation calculation result - flexible to match actual API response */
export interface CorrelationResult {
  success?: boolean;
  correlation?: number;
  biomarkers?: { name: string; correlation: number }[];
  period?: string;
  [key: string]: unknown;
}

/** Deficiency detected in analysis */
export interface DetectedDeficiency {
  biomarker: string;
  currentValue: number;
  optimalRange: { min: number; max: number };
  severity: 'mild' | 'moderate' | 'severe';
}

/** Supplement recommendation */
export interface SupplementRecommendation {
  name: string;
  dosage: string;
  frequency: string;
  rationale: string;
  priority: number;
}

/** Stack generation result - flexible to match actual API response */
export interface StackGenerationResult {
  success: boolean;
  recommendations?: SupplementRecommendation[];
  message?: string;
  no_deficiencies?: boolean;
  error?: string;
  analysis?: unknown;
  deficiencies?: unknown[];
}

/** Auto-link biomarkers result */
export interface AutoLinkBiomarkersResult {
  success: boolean;
  linkedCount?: number;
}

/** Library backfill result */
export interface LibraryBackfillResult {
  success: boolean;
  addedCount: number;
  skippedCount: number;
}

/** Photo processing result */
export interface PhotoProcessResult {
  success: boolean;
  processedImage?: string;
  error?: string;
}

/** Supplement effectiveness analysis - flexible to match actual API response */
export type EffectivenessAnalysis = unknown;

/** Protocol item in generated protocol */
export interface ProtocolItem {
  name: string;
  dosage: string;
  frequency: string;
  timing: string;
  rationale: string;
}

/** Generated protocol */
export interface Protocol {
  name: string;
  duration_days: number;
  items: ProtocolItem[];
  goals: string[];
  created_at: string;
}

/** Protocol generation parameters */
export interface GenerateProtocolParams {
  user_id?: string;
  goals: string[];
  health_conditions?: string[];
  dietary_restrictions?: string[];
  protocol_duration_days?: number;
  [key: string]: unknown;
}

/** Protocol generation result */
export interface GenerateProtocolResult {
  protocol: Protocol;
}

// ============================================
// DOCUMENTS API TYPES
// ============================================

/** Document comparison result */
export interface DocumentCompareResult {
  analysis: string;
  comparison?: {
    similarities: string[];
    differences: string[];
    trends: string[];
  };
}

/** Batch document processing result */
export interface BatchProcessResult {
  results: { documentId: string; success: boolean; error?: string }[];
}

/** Doctor recommendation */
export interface DoctorRecommendation {
  id: string;
  type: 'supplement' | 'medication' | 'lifestyle';
  name: string;
  dosage?: string;
  frequency?: string;
  rationale?: string;
}

/** Parse recommendations result */
export interface ParseRecommendationsResult {
  recommendations: DoctorRecommendation[];
}

/** Lab report parse result */
export interface ParseLabReportResult {
  success: boolean;
  biomarkers?: { name: string; value: number; unit: string }[];
}

/** Biomarker rematch result */
export interface RematchBiomarkersResult {
  rematchedCount: number;
  totalUnmatched: number;
}

/** Document analysis result */
export interface AnalyzeDocumentResult {
  success: boolean;
  summary?: string;
  entities?: string[];
}

/** Migration result */
export interface MigrateDocumentsResult {
  total_migrated: number;
  inbody?: { migrated: number; total: number; errors?: unknown[] };
  photos?: { migrated: number; total: number; errors?: unknown[] };
}

/** Reclassify imaging result */
export interface ReclassifyImagingResult {
  reclassified: number;
}

/** Document classification result */
export interface ClassifyDocumentResult {
  document_type: string;
  tags: string[];
  suggested_date: string | null;
  confidence: number;
}

/** Document rename result */
export interface RenameDocumentResult {
  suggestedName: string;
}

// ============================================
// HEALTH API TYPES
// ============================================

/** Health analysis result */
export interface HealthAnalysisResult {
  analysis: string;
}

/** Health points breakdown */
export interface HealthPointsBreakdown {
  nutrition: number;
  exercise: number;
  sleep: number;
  recovery: number;
  biomarkers: number;
}

/** Health points result */
export interface HealthPointsResult {
  points: number;
  breakdown: HealthPointsBreakdown;
}

/** Sleep efficiency result */
export interface SleepEfficiencyResult {
  efficiency: number;
}

/** Unit conversions fix result */
export interface FixUnitConversionsResult {
  updated: number;
  skipped?: number;
  total?: number;
}

/** Duplicate lab results fix result */
export interface FixDuplicateLabResultsResult {
  deleted: number;
}

/** Health recommendations result */
export interface HealthRecommendationsResult {
  recommendations: string;
  context: unknown;
}

/** Parsed supplement from message - flexible to match actual API response */
export type ParsedSupplement = unknown;

/** Protocol message parse result */
export interface ParseProtocolMessageResult {
  success: boolean;
  supplements: ParsedSupplement[];
  error?: string;
}

/** Check completed protocols result */
export interface CheckCompletedProtocolsResult {
  checked: boolean;
}

/** Apple Health import result */
export interface AppleHealthImportResult {
  results: {
    imported: number;
    skipped: number;
    errors: string[];
  };
}

/** Biomarker trend analysis - flexible to match actual API response */
export type BiomarkerTrendAnalysis = unknown;

/** Protocol lifecycle test result */
export interface ProtocolLifecycleTestResult {
  success: boolean;
  summary: unknown;
  results: unknown[];
  timestamp: string;
}

/** Recalculate confidence result */
export interface RecalculateConfidenceResult {
  success: boolean;
}

/** Protocol tests result */
export interface ProtocolTestsResult {
  test_data: {
    protocols_created: number;
    alerts_created: number;
  };
}

/** Clean protocol tests result */
export interface CleanProtocolTestsResult {
  deleted_count: number;
}

/** Cleanup Apple Health result */
export interface CleanupAppleHealthResult {
  deletedMetrics: number;
}

/** Populate biomarker correlations result */
export interface PopulateBiomarkerCorrelationsResult {
  success: boolean;
}

// ============================================
// AI TRAINING API TYPES
// ============================================

/** Generated training program */
export interface TrainingProgram {
  program_name: string;
  description?: string;
  weeks?: number;
}

/** AI training plan generation result */
export interface GenerateTrainingPlanResult {
  program_data: TrainingProgram;
  workout_count: number;
}

/** Travel workout generation result - flexible to match actual API response */
export type GenerateTravelWorkoutResult = unknown;

/** Training gaps analysis result - flexible to match actual API response */
export type TrainingGapsAnalysisResult = unknown;

// ============================================
// ADMIN API TYPES
// ============================================

/** Admin Terra tokens list result */
export interface AdminTerraTokensListResult {
  tokens: TerraToken[];
}

/** Admin Terra token create result */
export interface AdminTerraTokenCreateResult {
  token: TerraToken;
}

/** Admin Terra token update result */
export interface AdminTerraTokenUpdateResult {
  token: TerraToken;
}

/** Admin Terra token delete result */
export interface AdminTerraTokenDeleteResult {
  success: boolean;
}

/** Admin Terra token create params */
export interface AdminTerraTokenCreateParams {
  user_id: string;
  terra_user_id: string;
  provider: string;
}

/** Admin Terra token update params */
export interface AdminTerraTokenUpdateParams {
  id: string;
  is_active?: boolean;
}

/** Trainer AI suggest adjustments result */
export interface TrainerSuggestAdjustmentsResult {
  analysis_summary?: string;
  suggestions_count?: number;
}

/** Trainer AI execute params */
export interface TrainerExecuteParams {
  trainerId: string;
  clientId?: string;
  actions?: unknown[];
  autoConfirm?: boolean;
  [key: string]: unknown;
}

/** Trainer AI execute result */
export interface TrainerExecuteResult {
  success: boolean;
}

/** Reprocess webhook result */
export interface ReprocessWebhookResult {
  success: boolean;
}

/** Send broadcast result */
export interface SendBroadcastResult {
  sent_count: number;
}

// ============================================
// AI API TYPES
// ============================================

/** AI action execution result item */
export interface AIActionResultItem {
  success: boolean;
  message?: string;
}

/** AI actions execution result */
export interface ExecuteAIActionsResult {
  success: boolean;
  results: AIActionResultItem[];
}

/** Daily AI workout */
export interface DailyAIWorkout {
  name: string;
  exercises: { name: string; sets: number; reps: number; notes?: string }[];
  duration: number;
  intensity: string;
}

/** Get daily workout result */
export interface GetDailyWorkoutResult {
  success: boolean;
  workout?: DailyAIWorkout;
}

/** Saved measurement from fitness data analysis */
export interface SavedMeasurement {
  metric: string;
  value: number;
  unit: string;
}

/** Fitness data analysis result */
export interface AnalyzeFitnessDataResult {
  success: boolean;
  saved?: boolean;
  message?: string;
  analysis?: unknown;
  savedMeasurements?: SavedMeasurement[];
}

/** Ask about InBody result */
export interface AskAboutInBodyResult {
  answer: string;
}

// ============================================
// INBODY API TYPES
// ============================================

/** InBody analysis data */
export interface InBodyAnalysis {
  weight?: number;
  muscleMass?: number;
  bodyFat?: number;
  visceralFat?: number;
  segmentalAnalysis?: unknown;
}

/** InBody parse result */
export interface ParseInBodyResult {
  success: boolean;
  analysis?: InBodyAnalysis;
  analyses?: InBodyAnalysis[];
  reports_count?: number;
  error?: string;
}

// ============================================
// JOBS API TYPES
// ============================================

/** Retry job result */
export interface RetryJobResult {
  success: boolean;
}

/** Reset stuck jobs result */
export interface ResetStuckJobsResult {
  count: number;
}

/** Retry stuck webhooks result */
export interface RetryStuckWebhooksResult {
  processed: number;
}

/** Trigger job worker result */
export interface TriggerJobWorkerResult {
  success: boolean;
}

// ============================================
// HABITS API TYPES
// ============================================

/** Delete habit result */
export interface DeleteHabitResult {
  success: boolean;
  deletedCount?: number;
}
