export interface Exercise {
  id: string;
  name: string;
  nameRu: string;
  category: 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio';
  muscleGroups: string[];
  equipment: 'barbell' | 'dumbbell' | 'machine' | 'bodyweight' | 'cable' | 'other';
  description?: string;
}

export const EXERCISES: Exercise[] = [
  // Грудь
  {
    id: '1',
    name: 'Bench Press',
    nameRu: 'Жим штанги лежа',
    category: 'chest',
    muscleGroups: ['chest', 'triceps', 'shoulders'],
    equipment: 'barbell',
    description: 'Базовое упражнение для развития грудных мышц'
  },
  {
    id: '2',
    name: 'Dumbbell Press',
    nameRu: 'Жим гантелей лежа',
    category: 'chest',
    muscleGroups: ['chest', 'triceps', 'shoulders'],
    equipment: 'dumbbell'
  },
  {
    id: '3',
    name: 'Push-ups',
    nameRu: 'Отжимания',
    category: 'chest',
    muscleGroups: ['chest', 'triceps', 'core'],
    equipment: 'bodyweight'
  },
  
  // Спина
  {
    id: '4',
    name: 'Deadlift',
    nameRu: 'Становая тяга',
    category: 'back',
    muscleGroups: ['back', 'legs', 'core'],
    equipment: 'barbell',
    description: 'Базовое упражнение для всего тела'
  },
  {
    id: '5',
    name: 'Pull-ups',
    nameRu: 'Подтягивания',
    category: 'back',
    muscleGroups: ['back', 'biceps'],
    equipment: 'bodyweight'
  },
  {
    id: '6',
    name: 'Barbell Row',
    nameRu: 'Тяга штанги в наклоне',
    category: 'back',
    muscleGroups: ['back', 'biceps'],
    equipment: 'barbell'
  },
  
  // Ноги
  {
    id: '7',
    name: 'Squat',
    nameRu: 'Приседания',
    category: 'legs',
    muscleGroups: ['quads', 'glutes', 'core'],
    equipment: 'barbell',
    description: 'Базовое упражнение для ног'
  },
  {
    id: '8',
    name: 'Leg Press',
    nameRu: 'Жим ногами',
    category: 'legs',
    muscleGroups: ['quads', 'glutes'],
    equipment: 'machine'
  },
  {
    id: '9',
    name: 'Lunges',
    nameRu: 'Выпады',
    category: 'legs',
    muscleGroups: ['quads', 'glutes'],
    equipment: 'dumbbell'
  },
  
  // Плечи
  {
    id: '10',
    name: 'Overhead Press',
    nameRu: 'Жим штанги стоя',
    category: 'shoulders',
    muscleGroups: ['shoulders', 'triceps'],
    equipment: 'barbell'
  },
  {
    id: '11',
    name: 'Lateral Raise',
    nameRu: 'Махи гантелями в стороны',
    category: 'shoulders',
    muscleGroups: ['shoulders'],
    equipment: 'dumbbell'
  },
  
  // Руки
  {
    id: '12',
    name: 'Bicep Curl',
    nameRu: 'Подъем на бицепс',
    category: 'arms',
    muscleGroups: ['biceps'],
    equipment: 'dumbbell'
  },
  {
    id: '13',
    name: 'Tricep Extension',
    nameRu: 'Французский жим',
    category: 'arms',
    muscleGroups: ['triceps'],
    equipment: 'dumbbell'
  },
  
  // Кор
  {
    id: '14',
    name: 'Plank',
    nameRu: 'Планка',
    category: 'core',
    muscleGroups: ['core'],
    equipment: 'bodyweight'
  },
  {
    id: '15',
    name: 'Crunches',
    nameRu: 'Скручивания',
    category: 'core',
    muscleGroups: ['abs'],
    equipment: 'bodyweight'
  },
  
  // Кардио
  {
    id: '16',
    name: 'Running',
    nameRu: 'Бег',
    category: 'cardio',
    muscleGroups: ['legs', 'cardio'],
    equipment: 'other'
  },
  {
    id: '17',
    name: 'Cycling',
    nameRu: 'Велосипед',
    category: 'cardio',
    muscleGroups: ['legs', 'cardio'],
    equipment: 'machine'
  }
];

export const EXERCISE_CATEGORIES = [
  { value: 'chest', label: 'Грудь' },
  { value: 'back', label: 'Спина' },
  { value: 'legs', label: 'Ноги' },
  { value: 'shoulders', label: 'Плечи' },
  { value: 'arms', label: 'Руки' },
  { value: 'core', label: 'Кор' },
  { value: 'cardio', label: 'Кардио' }
] as const;

export const EQUIPMENT_TYPES = [
  { value: 'barbell', label: 'Штанга' },
  { value: 'dumbbell', label: 'Гантели' },
  { value: 'machine', label: 'Тренажер' },
  { value: 'bodyweight', label: 'Собственный вес' },
  { value: 'cable', label: 'Кроссовер' },
  { value: 'other', label: 'Другое' }
] as const;
