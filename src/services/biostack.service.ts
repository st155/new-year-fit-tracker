/**
 * BioStack Service Layer
 * 
 * All Supabase database operations for the biostack/supplements domain.
 * UI components should NOT call supabase directly - use this service instead.
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  ProtocolDTO,
  ActiveProtocolDTO,
  LibraryEntryDTO,
  LibraryStatsDTO,
  InventoryItemDTO,
  AdherenceStatsDTO,
  CreateProtocolInput,
  AddToInventoryInput,
  UpdateInventoryInput,
  UpdateLibraryEntryInput,
  EnrichmentStatus,
} from '@/features/biostack/types';

// ============= Helper Functions =============

/**
 * Calculate protocol progress based on dates
 */
function calculateProtocolProgress(startDate: string, endDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  const daysTotal = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const daysElapsed = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const progressPercent = Math.min(100, Math.max(0, (daysElapsed / daysTotal) * 100));

  return { daysTotal, daysElapsed, daysRemaining, progressPercent };
}

/**
 * Normalize supplement name for matching
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/vitamin/g, 'vit')
    .replace(/magnesium/g, 'mg')
    .trim();
}

/**
 * Normalize dosage unit to match database constraints
 */
function normalizeDosageUnit(unit: string | undefined): string {
  if (!unit) return 'serving';
  
  const normalized = unit.toLowerCase().trim();
  
  if (/^м[гg]$|миллиграмм|milligram/i.test(normalized)) return 'mg';
  if (/^г$|грамм|gram/i.test(normalized)) return 'g';
  if (/^мкг$|^mcg$|микрограмм|microgram|µg/i.test(normalized)) return 'mcg';
  if (/^ме$|^iu$|международн/i.test(normalized)) return 'IU';
  if (/^мл$|^ml$|миллилитр|milliliter/i.test(normalized)) return 'ml';
  if (/капсул|таблетк|порци|serving|caps|tab|dose/i.test(normalized)) return 'serving';
  
  console.warn(`⚠️ Unknown dosage unit: "${unit}", defaulting to "serving"`);
  return 'serving';
}

/**
 * Determine enrichment status for a product
 */
function getEnrichmentStatus(product: any): EnrichmentStatus {
  if (product.description && product.benefits && product.research_summary) {
    return 'enriched';
  } else if (product.description || product.benefits) {
    return 'partial';
  }
  return 'not_enriched';
}

// ============= Protocols Service =============

export const protocolsService = {
  /**
   * Fetch active protocols with progress calculation (user_stack based)
   */
  async fetchActiveProtocols(userId: string): Promise<ActiveProtocolDTO[]> {
    const { data, error } = await supabase
      .from('user_stack')
      .select(`
        id,
        stack_name,
        source,
        start_date,
        planned_end_date,
        end_action,
        target_outcome,
        supplement_products (
          name,
          brand
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .not('planned_end_date', 'is', null)
      .order('planned_end_date', { ascending: true })
      .limit(3);

    if (error) {
      console.error('Error fetching active protocols:', error);
      throw error;
    }

    return (data || []).map((protocol) => {
      const progress = calculateProtocolProgress(
        protocol.start_date,
        protocol.planned_end_date!
      );

      return {
        ...protocol,
        ...progress,
      } as ActiveProtocolDTO;
    });
  },

  /**
   * Fetch active protocol (protocols table based)
   */
  async fetchActiveProtocolV2(userId: string): Promise<ProtocolDTO | null> {
    const { data, error } = await supabase
      .from('protocols')
      .select(`
        *,
        protocol_items(
          *,
          supplement_products!protocol_items_product_id_fkey(*)
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching active protocol:', error);
      throw error;
    }

    return data;
  },

  /**
   * Fetch protocol history
   */
  async fetchProtocolHistory(userId: string): Promise<ProtocolDTO[]> {
    const { data, error } = await supabase
      .from('protocols')
      .select(`
        *,
        protocol_items(
          *,
          supplement_products!protocol_items_product_id_fkey(*)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching protocol history:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Fetch protocols for management (with linked products)
   */
  async fetchProtocolsForManagement(userId: string): Promise<ProtocolDTO[]> {
    const { data, error } = await supabase
      .from('protocols')
      .select(`
        *,
        protocol_items (
          *,
          supplement_products!protocol_items_product_id_fkey (
            name,
            brand,
            form,
            image_url,
            servings_per_container
          ),
          linked_product:supplement_products!protocol_items_linked_product_id_fkey (
            id,
            name,
            brand,
            form,
            image_url
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Create a protocol
   */
  async createProtocol(protocol: Record<string, unknown>): Promise<ProtocolDTO> {
    const { data, error } = await supabase
      .from('protocols')
      .insert(protocol as any)
      .select()
      .single();

    if (error) throw error;
    return data as ProtocolDTO;
  },

  /**
   * Create protocol from parsed data (e.g., from AI/doctor message)
   */
  async createProtocolFromParsed(
    userId: string,
    input: CreateProtocolInput
  ): Promise<ProtocolDTO> {
    const { name, description, duration, supplements, onProgress } = input;

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + duration);

    // Create protocol
    const { data: protocol, error: protocolError } = await supabase
      .from('protocols')
      .insert({
        user_id: userId,
        name,
        description: description || null,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        is_active: true,
        ai_generated: true,
        ai_rationale: 'Imported from doctor/family message via AI parser'
      })
      .select()
      .single();

    if (protocolError) throw protocolError;

    onProgress?.(0, supplements.length, 'Обработка добавок...');

    // Process each supplement
    for (let i = 0; i < supplements.length; i++) {
      const supp = supplements[i];
      onProgress?.(i, supplements.length, `Обработка ${supp.supplement_name}...`);

      // Find or create product
      let productId: string | null = null;
      const normalizedSearchName = normalizeName(supp.supplement_name);

      // Try exact match with brand
      if (supp.brand) {
        const { data: exactMatch } = await supabase
          .from('supplement_products')
          .select('id, name, brand')
          .ilike('name', supp.supplement_name)
          .ilike('brand', supp.brand)
          .maybeSingle();

        if (exactMatch) productId = exactMatch.id;
      }

      // Try normalized name match
      if (!productId) {
        const { data: potentialMatches } = await supabase
          .from('supplement_products')
          .select('id, name, brand')
          .ilike('name', `%${supp.supplement_name}%`);

        const normalizedMatch = potentialMatches?.find(p =>
          normalizeName(p.name) === normalizedSearchName &&
          (!supp.brand || !p.brand || p.brand.toLowerCase() === supp.brand.toLowerCase())
        );

        if (normalizedMatch) productId = normalizedMatch.id;
      }

      // Create new product if not found
      if (!productId) {
        const { data: newProduct, error: productError } = await supabase
          .from('supplement_products')
          .insert({
            name: supp.supplement_name,
            brand: supp.brand || 'Unknown',
            dosage_amount: supp.dosage_amount,
            dosage_unit: normalizeDosageUnit(supp.dosage_unit),
            form: supp.form || null,
            image_url: supp.photo_url || null,
          })
          .select('id')
          .single();

        if (productError) throw productError;
        productId = newProduct.id;
      }

      // Create protocol item
      const { error: itemError } = await supabase
        .from('protocol_items')
        .insert({
          protocol_id: protocol.id,
          product_id: productId,
          daily_dosage: supp.dosage_amount,
          intake_times: supp.intake_times,
          notes: supp.timing_notes || null,
        });

      if (itemError) throw itemError;

      // Sync to library
      const { data: existingLibraryEntry } = await supabase
        .from('user_supplement_library')
        .select('id')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .maybeSingle();

      if (!existingLibraryEntry) {
        await supabase
          .from('user_supplement_library')
          .insert({
            user_id: userId,
            product_id: productId,
            scan_count: 0,
            source: 'protocol',
          });
      }
    }

    onProgress?.(supplements.length, supplements.length, 'Завершение...');
    return protocol;
  },

  /**
   * Activate a protocol
   */
  async activateProtocol(userId: string, protocolId: string): Promise<void> {
    // Deactivate all other protocols
    await supabase
      .from('protocols')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true);

    // Activate selected protocol
    const { error } = await supabase
      .from('protocols')
      .update({ is_active: true })
      .eq('id', protocolId);

    if (error) throw error;
  },

  /**
   * Deactivate a protocol
   */
  async deactivateProtocol(protocolId: string): Promise<void> {
    const { error } = await supabase
      .from('protocols')
      .update({ is_active: false })
      .eq('id', protocolId);

    if (error) throw error;
  },

  /**
   * Toggle protocol active status
   */
  async toggleProtocol(protocolId: string, currentStatus: boolean): Promise<void> {
    const { error } = await supabase
      .from('protocols')
      .update({ is_active: !currentStatus })
      .eq('id', protocolId);

    if (error) throw error;
  },

  /**
   * Delete a protocol and its items
   */
  async deleteProtocol(protocolId: string): Promise<void> {
    // Get protocol item IDs
    const { data: items } = await supabase
      .from('protocol_items')
      .select('id')
      .eq('protocol_id', protocolId);

    const itemIds = items?.map(i => i.id) || [];

    // Delete supplement logs
    if (itemIds.length > 0) {
      await supabase
        .from('supplement_logs')
        .delete()
        .in('protocol_item_id', itemIds);
    }

    // Delete protocol items
    await supabase
      .from('protocol_items')
      .delete()
      .eq('protocol_id', protocolId);

    // Delete protocol
    const { error } = await supabase
      .from('protocols')
      .delete()
      .eq('id', protocolId);

    if (error) throw error;
  },
};

// ============= Library Service =============

export const libraryService = {
  /**
   * Fetch user's supplement library
   */
  async fetchLibrary(userId: string): Promise<LibraryEntryDTO[]> {
    const { data: library, error } = await supabase
      .from('user_supplement_library')
      .select(`
        *,
        source,
        supplement_products (
          id, name, brand, dosage_amount, dosage_unit, form, image_url,
          description, avg_rating, benefits, research_summary, manufacturer_info,
          servings_per_container, price, label_description, label_benefits,
          certifications, storage_instructions, country_of_origin, website,
          ingredients, warnings, recommended_daily_intake, expiration_info, barcode
        )
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    // Check which products are in stack
    const { data: stackItems } = await supabase
      .from('user_stack')
      .select('product_id')
      .eq('user_id', userId)
      .eq('is_active', true);

    const stackProductIds = new Set(stackItems?.map(item => item.product_id) || []);

    return (library || []).map(entry => ({
      ...entry,
      is_in_stack: stackProductIds.has(entry.product_id),
      enrichment_status: getEnrichmentStatus(entry.supplement_products),
    })) as LibraryEntryDTO[];
  },

  /**
   * Get library stats
   */
  async fetchLibraryStats(userId: string): Promise<LibraryStatsDTO> {
    const { count } = await supabase
      .from('user_supplement_library')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    return { totalCount: count || 0 };
  },

  /**
   * Add product to library
   */
  async addToLibrary(userId: string, productId: string): Promise<void> {
    const { data: existing } = await supabase
      .from('user_supplement_library')
      .select('scan_count')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('user_supplement_library')
        .update({ scan_count: existing.scan_count + 1 })
        .eq('user_id', userId)
        .eq('product_id', productId);
    } else {
      await supabase
        .from('user_supplement_library')
        .insert({
          user_id: userId,
          product_id: productId,
          scan_count: 1,
        });
    }
  },

  /**
   * Update library entry
   */
  async updateLibraryEntry(userId: string, input: UpdateLibraryEntryInput): Promise<void> {
    const { productId, notes, customRating, tags } = input;

    const { error } = await supabase
      .from('user_supplement_library')
      .update({
        notes,
        custom_rating: customRating,
        tags,
      })
      .eq('user_id', userId)
      .eq('product_id', productId);

    if (error) throw error;
  },

  /**
   * Remove from library
   */
  async removeFromLibrary(userId: string, productId: string): Promise<void> {
    const { error } = await supabase
      .from('user_supplement_library')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);

    if (error) throw error;
  },
};

// ============= Inventory Service =============

export const inventoryService = {
  /**
   * Fetch user inventory
   */
  async fetchInventory(userId: string): Promise<InventoryItemDTO[]> {
    const { data, error } = await supabase
      .from('user_inventory')
      .select(`
        *,
        supplement_products(*)
      `)
      .eq('user_id', userId)
      .order('is_low_alert', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Fetch low stock alerts
   */
  async fetchLowStockAlerts(userId: string): Promise<InventoryItemDTO[]> {
    const { data, error } = await supabase
      .from('user_inventory')
      .select(`
        *,
        supplement_products(*)
      `)
      .eq('user_id', userId)
      .eq('is_low_alert', true);

    if (error) throw error;
    return data || [];
  },

  /**
   * Add to inventory
   */
  async addToInventory(item: AddToInventoryInput): Promise<InventoryItemDTO> {
    const { data, error } = await supabase
      .from('user_inventory')
      .insert(item)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update inventory item
   */
  async updateInventory(input: UpdateInventoryInput): Promise<InventoryItemDTO> {
    const { id, updates } = input;

    const { data, error } = await supabase
      .from('user_inventory')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Remove from inventory
   */
  async removeFromInventory(id: string): Promise<void> {
    const { error } = await supabase
      .from('user_inventory')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

// ============= Logs Service =============

export const logsService = {
  /**
   * Fetch today's schedule
   */
  async fetchTodaySchedule(userId: string): Promise<any[]> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('supplement_logs')
      .select(`
        *,
        protocol_items(
          *,
          supplement_products(*)
        )
      `)
      .eq('user_id', userId)
      .gte('scheduled_time', todayStart.toISOString())
      .lte('scheduled_time', todayEnd.toISOString())
      .order('scheduled_time', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Fetch adherence stats (last 30 days)
   */
  async fetchAdherenceStats(userId: string): Promise<AdherenceStatsDTO> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('supplement_logs')
      .select('status, scheduled_time')
      .eq('user_id', userId)
      .gte('scheduled_time', thirtyDaysAgo.toISOString());

    if (error) throw error;

    const total = data?.length || 0;
    const taken = data?.filter(log => log.status === 'taken').length || 0;
    const adherenceRate = total > 0 ? (taken / total) * 100 : 0;

    return { total, taken, adherenceRate };
  },

  /**
   * Mark supplement log as taken
   */
  async markAsTaken(logId: string): Promise<void> {
    const { error } = await supabase
      .from('supplement_logs')
      .update({
        status: 'taken',
        taken_at: new Date().toISOString(),
      })
      .eq('id', logId);

    if (error) throw error;
  },

  /**
   * Add note to log
   */
  async addNote(logId: string, note: string): Promise<void> {
    const { error } = await supabase
      .from('supplement_logs')
      .update({ notes: note })
      .eq('id', logId);

    if (error) throw error;
  },

  /**
   * Log intake for a stack item
   */
  async logIntakeForStackItem(
    userId: string,
    stackItemId: string,
    intakeTime: string,
    intakeDate: string
  ): Promise<void> {
    const { error } = await supabase
      .from('intake_logs')
      .insert({
        user_id: userId,
        stack_item_id: stackItemId,
        intake_time: intakeTime,
        intake_date: intakeDate,
        taken_at: new Date().toISOString(),
        servings_taken: 1,
      });

    if (error) throw error;
  },

  /**
   * Cancel intake log
   */
  async cancelIntakeLog(logId: string): Promise<void> {
    const { error } = await supabase
      .from('intake_logs')
      .delete()
      .eq('id', logId);

    if (error) throw error;
  },
};

// ============= Combined Service Export =============

export const biostackService = {
  protocols: protocolsService,
  library: libraryService,
  inventory: inventoryService,
  logs: logsService,
};

export default biostackService;
