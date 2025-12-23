/**
 * Translation map for workout names from English to Russian
 * Used to translate source_data.name from wearable providers
 */
export const WORKOUT_TRANSLATIONS: Record<string, string> = {
  // Recovery & Wellness
  'Sauna': 'Сауна',
  'Ice Bath': 'Ледяная ванна',
  'Meditation': 'Медитация',
  'Stretching': 'Растяжка',
  'Massage Therapy': 'Массаж',
  'Massage': 'Массаж',
  'Yoga': 'Йога',
  'Breathwork': 'Дыхательные упражнения',
  'Nap': 'Дневной сон',
  'Recovery': 'Восстановление',
  
  // Cardio
  'Walking': 'Прогулка',
  'Running': 'Бег',
  'Cycling': 'Велосипед',
  'Swimming': 'Плавание',
  'Hiking': 'Хайкинг',
  'Rowing': 'Гребля',
  'Elliptical': 'Эллиптический тренажёр',
  'Stair Climbing': 'Подъём по лестнице',
  'Jump Rope': 'Скакалка',
  'Dance': 'Танцы',
  'Aerobics': 'Аэробика',
  'HIIT': 'HIIT',
  'Cardio': 'Кардио',
  
  // Strength
  'Strength Training': 'Силовая тренировка',
  'Strength training': 'Силовая тренировка',
  'Weightlifting': 'Силовая тренировка',
  'Weight Training': 'Силовая тренировка',
  'Functional Training': 'Функциональная тренировка',
  'CrossFit': 'Кроссфит',
  'Calisthenics': 'Калистеника',
  'Bodyweight': 'Тренировка с собственным весом',
  
  // Sports
  'Tennis': 'Теннис',
  'Golf': 'Гольф',
  'Basketball': 'Баскетбол',
  'Football': 'Футбол',
  'Soccer': 'Футбол',
  'Volleyball': 'Волейбол',
  'Boxing': 'Бокс',
  'Martial Arts': 'Единоборства',
  'Skiing': 'Лыжи',
  'Snowboarding': 'Сноуборд',
  'Surfing': 'Сёрфинг',
  'Paddleboarding': 'SUP',
  
  // Generic
  'Workout': 'Тренировка',
  'Whoop Workout': 'Тренировка',
  'Activity': 'Активность',
  'Other': 'Другое',
  'Unknown': 'Тренировка',
};

/**
 * Translates workout name from English to Russian
 * Also handles names with location prefixes (e.g., "Germasogeia Бег" -> "Бег")
 */
export function translateWorkoutName(name: string): string {
  if (!name) return 'Тренировка';
  
  // Direct translation lookup
  const directTranslation = WORKOUT_TRANSLATIONS[name];
  if (directTranslation) {
    return directTranslation;
  }
  
  // Case-insensitive lookup
  const lowerName = name.toLowerCase();
  for (const [key, value] of Object.entries(WORKOUT_TRANSLATIONS)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }
  
  // Check if name contains a known workout type (for names like "Germasogeia Бег")
  for (const [key, value] of Object.entries(WORKOUT_TRANSLATIONS)) {
    if (name.includes(key)) {
      return value;
    }
  }
  
  // Check for Russian workout names already in the string
  const russianWorkouts = ['Бег', 'Прогулка', 'Плавание', 'Велосипед', 'Йога'];
  for (const workout of russianWorkouts) {
    if (name.includes(workout)) {
      return workout;
    }
  }
  
  // Return original if no translation found (might already be in Russian)
  return name;
}
