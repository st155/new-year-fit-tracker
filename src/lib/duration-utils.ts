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
export function formatElapsedTime(days: number, hours: number, minutes: number): string {
  if (days > 0) {
    return hours > 0 ? `${days}д ${hours}ч` : `${days}д`;
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours}ч ${minutes}м` : `${hours}ч`;
  }
  return `${minutes}м`;
}

/**
 * Get milestone progress (7, 30, 100, 365 days)
 */
export function getMilestoneProgress(days: number): { next: number; progress: number; label: string } | null {
  const milestones = [
    { value: 7, label: '1 неделя' },
    { value: 30, label: '1 месяц' },
    { value: 100, label: '100 дней' },
    { value: 365, label: '1 год' }
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
