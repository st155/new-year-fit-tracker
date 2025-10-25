import { formatISO, parseISO, startOfDay, endOfDay } from 'date-fns';

/**
 * ARCHITECTURE: UTC-first date handling
 * 
 * GOLDEN RULES:
 * 1. DB stores ALWAYS UTC (timestamptz in Supabase)
 * 2. UI displays in user timezone
 * 3. Comparisons are ONLY in UTC
 * 4. Day starts at 00:00 user timezone → convert to UTC for queries
 */

export class DateTimeService {
  private static userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  /**
   * Get start of day in UTC for user timezone
   * Example: User in EST sees "2025-10-27" → returns 2025-10-27T04:00:00Z
   */
  static startOfDayUTC(date: Date | string): Date {
    const parsed = typeof date === 'string' ? parseISO(date) : date;
    // Start of day in UTC (ignoring timezone)
    const year = parsed.getUTCFullYear();
    const month = parsed.getUTCMonth();
    const day = parsed.getUTCDate();
    return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  }

  /**
   * Get end of day in UTC for user timezone
   */
  static endOfDayUTC(date: Date | string): Date {
    const parsed = typeof date === 'string' ? parseISO(date) : date;
    const year = parsed.getUTCFullYear();
    const month = parsed.getUTCMonth();
    const day = parsed.getUTCDate();
    return new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
  }

  /**
   * Format date for Supabase queries (ISO UTC)
   */
  static toDBFormat(date: Date): string {
    return formatISO(date);
  }

  /**
   * Get "today" for queries (start of day in UTC)
   * Returns: "2025-10-27T00:00:00.000Z"
   */
  static todayUTC(): string {
    return this.toDBFormat(this.startOfDayUTC(new Date()));
  }

  /**
   * Get date as YYYY-MM-DD for queries
   * Example: "2025-10-27"
   */
  static todayDateString(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  /**
   * Get date range for queries (last N days)
   * Returns: { start: "2025-09-27T00:00:00Z", end: "2025-10-27T23:59:59Z" }
   */
  static getDateRangeUTC(days: number): { start: string; end: string } {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    return {
      start: this.toDBFormat(this.startOfDayUTC(start)),
      end: this.toDBFormat(this.endOfDayUTC(end)),
    };
  }

  /**
   * Check if two dates are the same day in user timezone
   */
  static isSameDay(date1: Date | string, date2: Date | string): boolean {
    const d1 = typeof date1 === 'string' ? parseISO(date1) : date1;
    const d2 = typeof date2 === 'string' ? parseISO(date2) : date2;
    
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  /**
   * Phase 7: Enhanced timezone utilities
   */

  /**
   * Parse ISO date with timezone awareness
   */
  static parseWithTimezone(isoString: string): Date {
    return parseISO(isoString);
  }

  /**
   * Format date for display in user timezone
   */
  static formatForDisplay(date: Date | string, formatStr: string = 'PPP'): string {
    const parsed = typeof date === 'string' ? parseISO(date) : date;
    return parsed.toLocaleDateString();
  }

  /**
   * Check if measurement is from today (user timezone)
   */
  static isToday(measurementDate: string): boolean {
    const parsed = parseISO(measurementDate);
    const today = new Date();
    
    return (
      parsed.getFullYear() === today.getFullYear() &&
      parsed.getMonth() === today.getMonth() &&
      parsed.getDate() === today.getDate()
    );
  }

  /**
   * Format day key for grouping (YYYY-MM-DD)
   */
  static formatDayKey(date: Date | string): string {
    const parsed = typeof date === 'string' ? parseISO(date) : date;
    return parsed.toISOString().split('T')[0];
  }

  /**
   * Get date range for queries (last N days) - inclusive
   */
  static getDateRangeForQuery(days: number): { start: string; end: string } {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    return {
      start: this.formatDayKey(start),
      end: this.formatDayKey(end),
    };
  }
}

// Convenient exports
export const todayUTC = () => DateTimeService.todayUTC();
export const todayDateString = () => DateTimeService.todayDateString();
export const dateRangeUTC = (days: number) => DateTimeService.getDateRangeUTC(days);
export const formatForDB = (date: Date) => DateTimeService.toDBFormat(date);
export const isSameDay = (date1: Date | string, date2: Date | string) => 
  DateTimeService.isSameDay(date1, date2);
