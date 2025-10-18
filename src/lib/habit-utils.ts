import { 
  CigaretteOff, 
  Dumbbell, 
  BookOpen, 
  MessageCircle, 
  Moon, 
  Apple, 
  BrainCircuit, 
  Target,
  Activity,
  Coffee,
  Wine,
  Smartphone,
  Tv,
  type LucideIcon
} from "lucide-react";

export type HabitSentiment = 'negative' | 'positive' | 'neutral';

/**
 * Determines the sentiment/type of a habit based on its category and name
 */
export function getHabitSentiment(habit: any): HabitSentiment {
  const name = habit.name?.toLowerCase() || '';
  const category = habit.category?.toLowerCase() || '';
  const settings = habit.custom_settings || {};

  // Check if explicitly set in custom settings
  if (settings.sentiment) {
    return settings.sentiment as HabitSentiment;
  }

  // Negative habits (things to quit/avoid)
  const negativeKeywords = [
    'quit', 'stop', 'avoid', 'smoking', 'drinking', 'alcohol', 
    'sugar', 'junk food', 'soda', 'screen time', 'social media',
    'procrastination', 'бросить', 'перестать'
  ];

  // Positive habits (things to build/do)
  const positiveKeywords = [
    'exercise', 'workout', 'run', 'walk', 'meditation', 'yoga',
    'reading', 'learning', 'practice', 'study', 'water', 'sleep',
    'fitness', 'health', 'тренировка', 'упражнение', 'чтение'
  ];

  // Check name for keywords
  for (const keyword of negativeKeywords) {
    if (name.includes(keyword)) return 'negative';
  }

  for (const keyword of positiveKeywords) {
    if (name.includes(keyword)) return 'positive';
  }

  // Check category
  if (['fitness', 'nutrition', 'sleep', 'mindfulness', 'learning'].includes(category)) {
    return 'positive';
  }

  // Default to neutral
  return 'neutral';
}

/**
 * Returns the appropriate Lucide icon for a habit
 */
export function getHabitIcon(habit: any): LucideIcon {
  const name = habit.name?.toLowerCase() || '';
  const category = habit.category?.toLowerCase() || '';

  // Icon mapping based on keywords
  if (name.includes('smok') || name.includes('курить')) return CigaretteOff;
  if (name.includes('drink') || name.includes('alcohol') || name.includes('алкоголь')) return Wine;
  if (name.includes('exercise') || name.includes('workout') || name.includes('тренировка')) return Dumbbell;
  if (name.includes('run') || name.includes('бег')) return Activity;
  if (name.includes('read') || name.includes('book') || name.includes('чтение')) return BookOpen;
  if (name.includes('speak') || name.includes('talk') || name.includes('communication')) return MessageCircle;
  if (name.includes('sleep') || name.includes('сон')) return Moon;
  if (name.includes('food') || name.includes('eat') || name.includes('nutrition') || name.includes('питание')) return Apple;
  if (name.includes('meditation') || name.includes('mindful') || name.includes('медитация')) return BrainCircuit;
  if (name.includes('coffee') || name.includes('кофе')) return Coffee;
  if (name.includes('phone') || name.includes('screen') || name.includes('телефон')) return Smartphone;
  if (name.includes('tv') || name.includes('television')) return Tv;

  // Category-based fallback
  if (category === 'fitness') return Dumbbell;
  if (category === 'nutrition') return Apple;
  if (category === 'sleep') return Moon;
  if (category === 'mindfulness') return BrainCircuit;

  // Default
  return Target;
}

/**
 * Returns the HSL color string for a habit's neon glow
 */
export function getHabitNeonColor(sentiment: HabitSentiment): string {
  switch (sentiment) {
    case 'negative':
      return 'hsl(0 100% 65%)';
    case 'positive':
      return 'hsl(142 76% 53%)';
    case 'neutral':
      return 'hsl(262 83% 58%)';
  }
}

/**
 * Returns CSS class for habit card based on sentiment
 */
export function getHabitCardClass(sentiment: HabitSentiment): string {
  return `habit-card-${sentiment}`;
}

/**
 * Returns CSS class for neon circle based on sentiment
 */
export function getNeonCircleClass(sentiment: HabitSentiment): string {
  return `neon-circle-${sentiment}`;
}
