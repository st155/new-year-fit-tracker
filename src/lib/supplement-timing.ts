export interface TimeStatus {
  isDueNow: boolean;
  isOverdue: boolean;
  minutesUntilDue?: number;
  minutesOverdue?: number;
}

export function calculateTimeStatus(
  specificTime?: string,
  timeWindowMinutes: number = 60,
  takenAt?: Date
): TimeStatus {
  // If already taken, not due or overdue
  if (takenAt) {
    return { isDueNow: false, isOverdue: false };
  }

  // If no specific time, not time-based
  if (!specificTime) {
    return { isDueNow: false, isOverdue: false };
  }

  const now = new Date();
  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
  
  // Parse scheduled time (format: "HH:MM")
  const [hours, minutes] = specificTime.split(':').map(Number);
  const scheduledTimeMinutes = hours * 60 + minutes;
  
  const halfWindow = timeWindowMinutes / 2;
  const windowStart = scheduledTimeMinutes - halfWindow;
  const windowEnd = scheduledTimeMinutes + halfWindow;
  
  // Check if currently in window
  if (currentTimeMinutes >= windowStart && currentTimeMinutes <= windowEnd) {
    return { isDueNow: true, isOverdue: false };
  }
  
  // Check if overdue
  if (currentTimeMinutes > windowEnd) {
    return {
      isDueNow: false,
      isOverdue: true,
      minutesOverdue: currentTimeMinutes - windowEnd
    };
  }
  
  // Future scheduled time
  return {
    isDueNow: false,
    isOverdue: false,
    minutesUntilDue: windowStart - currentTimeMinutes
  };
}

export interface IntakeInstruction {
  value: string;
  label: string;
  icon: string;
  description: string;
}

export const INTAKE_INSTRUCTIONS: IntakeInstruction[] = [
  { value: 'any', label: 'Anytime', icon: '⏰', description: 'Can take at any time' },
  { value: 'before_food', label: 'Before food', icon: '🕐', description: '30 min before meal' },
  { value: 'with_food', label: 'With food', icon: '🍽️', description: 'During meal' },
  { value: 'after_food', label: 'After food', icon: '🥗', description: 'Within 30 min after' },
  { value: 'with_fat', label: 'With fatty food', icon: '🧈', description: 'For fat-soluble vitamins' },
  { value: 'empty_stomach', label: 'Empty stomach', icon: '💧', description: '2+ hours after eating' },
  { value: 'before_sleep_30', label: '30 min before sleep', icon: '🌙', description: 'For melatonin, magnesium' },
  { value: 'before_sleep_60', label: '1 hour before sleep', icon: '🌙', description: 'For ashwagandha, GABA' },
  { value: 'between_meals', label: 'Between meals', icon: '⏳', description: '2+ hours between eating' },
];

export function getInstructionInfo(value?: string): IntakeInstruction | undefined {
  return INTAKE_INSTRUCTIONS.find(i => i.value === value);
}

export function formatTimeUntil(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
