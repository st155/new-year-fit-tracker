/**
 * Color scheme for workout types
 * Using semantic tokens and gradients
 */

export const workoutTypeColors = {
  strength: {
    gradient: 'from-purple-500 to-pink-500',
    accent: 'border-l-purple-500',
    badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    glow: 'shadow-[0_0_20px_rgba(168,85,247,0.3)]',
  },
  cardio: {
    gradient: 'from-orange-500 to-red-500',
    accent: 'border-l-orange-500',
    badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    glow: 'shadow-[0_0_20px_rgba(249,115,22,0.3)]',
  },
  hybrid: {
    gradient: 'from-cyan-500 to-blue-500',
    accent: 'border-l-cyan-500',
    badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    glow: 'shadow-[0_0_20px_rgba(6,182,212,0.3)]',
  },
  imported: {
    gradient: 'from-green-500 to-emerald-500',
    accent: 'border-l-green-500',
    badge: 'bg-green-500/10 text-green-400 border-green-500/20',
    glow: 'shadow-[0_0_20px_rgba(34,197,94,0.3)]',
  },
  default: {
    gradient: 'from-gray-500 to-gray-600',
    accent: 'border-l-gray-500',
    badge: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    glow: 'shadow-[0_0_20px_rgba(107,114,128,0.3)]',
  },
} as const;

export type WorkoutType = keyof typeof workoutTypeColors;

export function getWorkoutColors(type: string | null | undefined) {
  const normalizedType = type?.toLowerCase() as WorkoutType;
  return workoutTypeColors[normalizedType] || workoutTypeColors.default;
}
