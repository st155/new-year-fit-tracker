/**
 * BioStack Feature Types
 * 
 * DTOs and interfaces for the biostack/supplements domain
 */

// ============= Supplement Products =============

export interface SupplementProductDTO {
  id: string;
  name: string;
  brand: string | null;
  dosage_amount: number | null;
  dosage_unit: string | null;
  form: string | null;
  image_url: string | null;
  description: string | null;
  avg_rating: number | null;
  benefits: string[] | null;
  research_summary: string | null;
  manufacturer_info: unknown;
  servings_per_container: number | null;
  price: string | null;
  label_description: string | null;
  label_benefits: string[] | null;
  certifications: string[] | null;
  storage_instructions: string | null;
  country_of_origin: string | null;
  website: string | null;
  ingredients: string[] | null;
  warnings: string | null;
  recommended_daily_intake: string | null;
  expiration_info: string | null;
  barcode: string | null;
}

// ============= Library =============

export type LibrarySource = 'scan' | 'protocol' | 'manual';
export type EnrichmentStatus = 'enriched' | 'partial' | 'not_enriched';

export interface LibraryEntryDTO {
  id: string;
  user_id: string;
  product_id: string;
  first_scanned_at: string;
  scan_count: number;
  notes: string | null;
  custom_rating: number | null;
  tags: string[] | null;
  source: LibrarySource;
  created_at: string;
  updated_at: string;
  supplement_products: SupplementProductDTO;
  is_in_stack: boolean;
  enrichment_status: EnrichmentStatus;
}

export interface LibraryStatsDTO {
  totalCount: number;
}

// ============= Protocols =============

export type ProtocolSource = 'doctor_rx' | 'ai_suggestion' | 'manual';
export type EndAction = 'prompt_retest' | 'none';

export interface ProtocolItemDTO {
  id: string;
  protocol_id: string;
  product_id: string;
  daily_dosage: number | null;
  intake_times: string[] | null;
  notes: string | null;
  linked_product_id: string | null;
  supplement_products: Partial<SupplementProductDTO> | null;
  linked_product?: Partial<SupplementProductDTO> | null;
  [key: string]: unknown; // Allow additional fields from DB
}

export interface ProtocolDTO {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  ai_generated?: boolean;
  ai_rationale?: string | null;
  created_at: string;
  updated_at?: string;
  protocol_items?: ProtocolItemDTO[];
  [key: string]: unknown; // Allow additional fields from DB
}

export interface ActiveProtocolDTO {
  id: string;
  stack_name: string;
  source: ProtocolSource;
  start_date: string;
  planned_end_date: string;
  end_action: EndAction;
  target_outcome?: string;
  supplement_products: {
    name: string;
    brand?: string;
  } | null;
  // Calculated progress fields
  daysElapsed: number;
  daysTotal: number;
  daysRemaining: number;
  progressPercent: number;
}

// ============= Inventory =============

export interface InventoryItemDTO {
  id: string;
  user_id: string;
  product_id: string;
  current_servings: number;
  initial_servings?: number;
  original_servings?: number;
  low_stock_threshold?: number;
  storage_location?: string | null;
  is_low_alert?: boolean;
  created_at: string;
  updated_at?: string;
  supplement_products?: Partial<SupplementProductDTO> | null;
  [key: string]: unknown; // Allow additional fields from DB
}

// ============= Today's Supplements =============

export type IntakeTime = 'morning' | 'afternoon' | 'evening' | 'before_sleep' | 'as_needed';
export type SupplementSource = 'manual' | 'protocol';

export interface TodaySupplementDTO {
  id: string;
  name: string;
  brand?: string;
  dosage: string;
  form?: string;
  intakeTime: IntakeTime;
  source: SupplementSource;
  sourceId: string;
  protocolName?: string;
  takenToday: boolean;
  takenAt?: Date;
  productId?: string;
  imageUrl?: string;
  linkedBiomarkerIds?: string[];
  logId?: string;
  todayIntakeCount: number;
  // Smart timing
  scheduledTime?: string;
  intakeInstruction?: string;
  timeWindowMinutes: number;
  // Computed status
  isDueNow: boolean;
  isOverdue: boolean;
  minutesUntilDue?: number;
  minutesOverdue?: number;
}

export interface GroupedSupplementsDTO {
  morning: TodaySupplementDTO[];
  afternoon: TodaySupplementDTO[];
  evening: TodaySupplementDTO[];
  before_sleep: TodaySupplementDTO[];
  as_needed: TodaySupplementDTO[];
}

// ============= Intake Logs =============

export interface IntakeLogDTO {
  id: string;
  user_id: string;
  stack_item_id?: string;
  protocol_item_id?: string;
  intake_time: IntakeTime;
  intake_date: string;
  taken_at: string;
  servings_taken: number;
}

export interface SupplementLogDTO {
  id: string;
  user_id: string;
  protocol_item_id: string;
  scheduled_time: string;
  status: 'scheduled' | 'pending' | 'taken' | 'missed';
  taken_at: string | null;
  servings_taken: number | null;
}

// ============= Adherence & Stats =============

export interface AdherenceStatsDTO {
  total: number;
  taken: number;
  adherenceRate: number;
}

// ============= Correlation =============

export interface CorrelationDTO {
  success: boolean;
  error?: string;
  biomarker?: {
    id: string;
    name: string;
    unit: string;
    startValue: number;
    endValue: number;
    changePercent: number;
    referenceRange: unknown;
  };
  intakeData?: Array<{
    week: string;
    avgConsistency: number;
    intakeCount: number;
  }>;
  biomarkerData?: Array<{
    date: string;
    value: number;
  }>;
  correlation?: {
    score: number;
    interpretation: string;
    pValue: number;
  };
  aiInsights?: {
    is_effective: boolean;
    confidence_level: 'high' | 'medium' | 'low';
    key_insight: string;
    recommendation: string;
  };
  timeToEffect?: {
    weeks: number;
    description: string;
  } | null;
  avgConsistency?: number;
}

// ============= Mutation Inputs =============

export interface CreateProtocolInput {
  name: string;
  description?: string;
  duration: number;
  supplements: Array<{
    supplement_name: string;
    dosage_amount: number;
    dosage_unit: string;
    intake_times: string[];
    timing_notes?: string;
    form?: string;
    brand?: string;
    photo_url?: string;
  }>;
  onProgress?: (current: number, total: number, step: string) => void;
}

export interface AddToInventoryInput {
  user_id: string;
  product_id: string;
  current_servings: number;
  original_servings: number;
  low_stock_threshold: number;
  storage_location?: string;
}

export interface UpdateInventoryInput {
  id: string;
  updates: Partial<{
    current_servings: number;
    low_stock_threshold: number;
    storage_location: string;
  }>;
}

export interface UpdateLibraryEntryInput {
  productId: string;
  notes?: string;
  customRating?: number | null;
  tags?: string[];
}

// ============= Query Options =============

export interface BiostackQueryOptions {
  enabled?: boolean;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
}
