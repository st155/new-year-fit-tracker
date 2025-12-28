/**
 * Duration formatting utilities with i18n support
 */

/**
 * Format options for elapsed time
 */
export interface ElapsedTimeFormatOptions {
  daysHours?: string; // e.g., "{{days}}д {{hours}}ч" or "{{days}}d {{hours}}h"
  hours?: string; // e.g., "{{hours}}ч" or "{{hours}}h"
  hoursMinutes?: string; // e.g., "{{hours}}ч {{minutes}}м" or "{{hours}}h {{minutes}}m"
  minutes?: string; // e.g., "{{minutes}}м" or "{{minutes}}m"
}

/**
 * Milestone labels for localization
 */
export interface MilestoneLabels {
  oneWeek: string;
  oneMonth: string;
  hundredDays: string;
  oneYear: string;
}

// Default Russian formats
const defaultFormats: ElapsedTimeFormatOptions = {
  daysHours: '{{days}}д {{hours}}ч',
  hours: '{{hours}}ч',
  hoursMinutes: '{{hours}}ч {{minutes}}м',
  minutes: '{{minutes}}м',
};

const defaultMilestoneLabels: MilestoneLabels = {
  oneWeek: '1 неделя',
  oneMonth: '1 месяц',
  hundredDays: '100 дней',
  oneYear: '1 год',
};

/**
 * Calculate elapsed time from a start date
 */
export function calculateElapsedTime(startDate: string) {
  const start = new Date(startDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return { days, hours, minutes, totalDays: days };
}

/**
 * Format elapsed time for display
 */
export function formatElapsedTime(
  days: number,
  hours: number,
  minutes: number,
  formats: ElapsedTimeFormatOptions = defaultFormats
): string {
  const replace = (template: string, values: Record<string, number>) => {
    let result = template;
    for (const [key, value] of Object.entries(values)) {
      result = result.replace(`{{${key}}}`, String(value));
    }
    return result;
  };

  if (days > 0) {
    if (hours > 0) {
      return replace(formats.daysHours || defaultFormats.daysHours!, { days, hours });
    }
    return replace(formats.daysHours || defaultFormats.daysHours!, { days, hours: 0 }).replace(' 0ч', '').replace(' 0h', '');
  }
  if (hours > 0) {
    if (minutes > 0) {
      return replace(formats.hoursMinutes || defaultFormats.hoursMinutes!, { hours, minutes });
    }
    return replace(formats.hours || defaultFormats.hours!, { hours });
  }
  return replace(formats.minutes || defaultFormats.minutes!, { minutes });
}

/**
 * Get milestone progress (7, 30, 100, 365 days)
 */
export function getMilestoneProgress(
  days: number,
  labels: MilestoneLabels = defaultMilestoneLabels
): { next: number; progress: number; label: string } | null {
  const milestones = [
    { value: 7, label: labels.oneWeek },
    { value: 30, label: labels.oneMonth },
    { value: 100, label: labels.hundredDays },
    { value: 365, label: labels.oneYear }
  ];
  
  for (const milestone of milestones) {
    if (days < milestone.value) {
      return {
        next: milestone.value,
        progress: (days / milestone.value) * 100,
        label: milestone.label
      };
    }
  }
  
  return null;
}

/**
 * Calculate money saved based on cost per day
 */
export function calculateMoneySaved(days: number, costPerDay: number): number {
  return Math.round(days * costPerDay);
}
