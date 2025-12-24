// Activity types with their display configuration
export const ACTIVITY_TYPES = {
  strength: {
    label: 'Силовая',
    icon: '🏋️',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/30',
  },
  cardio: {
    label: 'Кардио',
    icon: '🏃',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/30',
  },
  running: {
    label: 'Пробежка',
    icon: '🏃',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/30',
  },
  massage: {
    label: 'Массаж',
    icon: '💆',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/20',
    borderColor: 'border-pink-500/30',
  },
  stretching: {
    label: 'Растяжка',
    icon: '🧘',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/30',
  },
  yoga: {
    label: 'Йога',
    icon: '🧘',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/30',
  },
  sauna: {
    label: 'Сауна',
    icon: '🧖',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/30',
  },
  barochamber: {
    label: 'Барокамера',
    icon: '🫁',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
    borderColor: 'border-cyan-500/30',
  },
  swimming: {
    label: 'Плавание',
    icon: '🏊',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
  },
  recovery: {
    label: 'Восстановление',
    icon: '🛌',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500/30',
  },
  cryo: {
    label: 'Криотерапия',
    icon: '🧊',
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/20',
    borderColor: 'border-sky-500/30',
  },
  rest: {
    label: 'Отдых',
    icon: '😴',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
    borderColor: 'border-slate-500/30',
  },
  other: {
    label: 'Другое',
    icon: '📌',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
    borderColor: 'border-gray-500/30',
  },
} as const;

export type ActivityType = keyof typeof ACTIVITY_TYPES;

export function getActivityConfig(type: string) {
  return ACTIVITY_TYPES[type as ActivityType] || ACTIVITY_TYPES.other;
}

export function parseActivityDescription(text: string): Record<string, number> {
  const result: Record<string, number> = {};
  const lowerText = text.toLowerCase();

  // Pattern matching for Russian descriptions
  const patterns: [RegExp, string][] = [
    [/(\d+)\s*(?:раз|раза|x|×)?\s*(?:в неделю\s*)?(?:силов|тренир)/i, 'strength'],
    [/силов[^\d]*(\d+)/i, 'strength'],
    [/(\d+)\s*(?:раз|раза|x|×)?\s*(?:в неделю\s*)?(?:массаж)/i, 'massage'],
    [/массаж[^\d]*(\d+)/i, 'massage'],
    [/(\d+)\s*(?:раз|раза|x|×)?\s*(?:в неделю\s*)?(?:пробежк|бег)/i, 'running'],
    [/пробежк[^\d]*(\d+)/i, 'running'],
    [/(\d+)\s*(?:раз|раза|x|×)?\s*(?:в неделю\s*)?(?:сауна|баня)/i, 'sauna'],
    [/сауна/i, 'sauna'],
    [/баня/i, 'sauna'],
    [/(\d+)\s*(?:раз|раза|x|×)?\s*(?:в неделю\s*)?(?:растяжк|стретч)/i, 'stretching'],
    [/растяжк/i, 'stretching'],
    [/(\d+)\s*(?:раз|раза|x|×)?\s*(?:в неделю\s*)?(?:барокамер)/i, 'barochamber'],
    [/барокамер/i, 'barochamber'],
    [/(\d+)\s*(?:раз|раза|x|×)?\s*(?:в неделю\s*)?(?:йога|yoga)/i, 'yoga'],
    [/йога/i, 'yoga'],
    [/(\d+)\s*(?:раз|раза|x|×)?\s*(?:в неделю\s*)?(?:плаван|бассейн)/i, 'swimming'],
    [/плаван|бассейн/i, 'swimming'],
    [/(\d+)\s*(?:раз|раза|x|×)?\s*(?:в неделю\s*)?(?:крио)/i, 'cryo'],
    [/крио/i, 'cryo'],
  ];

  for (const [pattern, activityType] of patterns) {
    const match = lowerText.match(pattern);
    if (match) {
      const count = match[1] ? parseInt(match[1], 10) : 1;
      if (!result[activityType] || count > result[activityType]) {
        result[activityType] = count;
      }
    }
  }

  return result;
}
