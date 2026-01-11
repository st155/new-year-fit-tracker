import i18n from '@/i18n';

export interface Exercise {
  id: string;
  name: string;
  nameRu: string;
  category: 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio';
  muscleGroups: string[];
  equipment: 'barbell' | 'dumbbell' | 'machine' | 'bodyweight' | 'cable' | 'other';
  type: 'strength' | 'cardio' | 'bodyweight';
  description?: string;
}

export const EXERCISES: Exercise[] = [
  // Грудь
  {
    id: '1',
    name: 'Bench Press',
    nameRu: 'Жим штанги лежа',
    category: 'chest',
    type: 'strength',
    muscleGroups: ['chest', 'triceps', 'shoulders'],
    equipment: 'barbell',
    description: 'Базовое упражнение для развития грудных мышц'
  },
  {
    id: '2',
    name: 'Dumbbell Press',
    nameRu: 'Жим гантелей лежа',
    category: 'chest',
    type: 'strength',
    muscleGroups: ['chest', 'triceps', 'shoulders'],
    equipment: 'dumbbell'
  },
  {
    id: '3',
    name: 'Push-ups',
    nameRu: 'Отжимания',
    category: 'chest',
    type: 'bodyweight',
    muscleGroups: ['chest', 'triceps', 'core'],
    equipment: 'bodyweight'
  },
  
  // Спина
  {
    id: '4',
    name: 'Deadlift',
    nameRu: 'Становая тяга',
    category: 'back',
    type: 'strength',
    muscleGroups: ['back', 'legs', 'core'],
    equipment: 'barbell',
    description: 'Базовое упражнение для всего тела'
  },
  {
    id: '5',
    name: 'Pull-ups',
    nameRu: 'Подтягивания',
    category: 'back',
    type: 'bodyweight',
    muscleGroups: ['back', 'biceps'],
    equipment: 'bodyweight'
  },
  {
    id: '6',
    name: 'Barbell Row',
    nameRu: 'Тяга штанги в наклоне',
    category: 'back',
    type: 'strength',
    muscleGroups: ['back', 'biceps'],
    equipment: 'barbell'
  },
  
  // Ноги
  {
    id: '7',
    name: 'Squat',
    nameRu: 'Приседания',
    category: 'legs',
    type: 'strength',
    muscleGroups: ['quads', 'glutes', 'core'],
    equipment: 'barbell',
    description: 'Базовое упражнение для ног'
  },
  {
    id: '8',
    name: 'Leg Press',
    nameRu: 'Жим ногами',
    category: 'legs',
    type: 'strength',
    muscleGroups: ['quads', 'glutes'],
    equipment: 'machine'
  },
  {
    id: '9',
    name: 'Lunges',
    nameRu: 'Выпады',
    category: 'legs',
    type: 'strength',
    muscleGroups: ['quads', 'glutes'],
    equipment: 'dumbbell'
  },
  
  // Плечи
  {
    id: '10',
    name: 'Overhead Press',
    nameRu: 'Жим штанги стоя',
    category: 'shoulders',
    type: 'strength',
    muscleGroups: ['shoulders', 'triceps'],
    equipment: 'barbell'
  },
  {
    id: '11',
    name: 'Lateral Raise',
    nameRu: 'Махи гантелями в стороны',
    category: 'shoulders',
    type: 'strength',
    muscleGroups: ['shoulders'],
    equipment: 'dumbbell'
  },
  
  // Руки
  {
    id: '12',
    name: 'Bicep Curl',
    nameRu: 'Подъем на бицепс',
    category: 'arms',
    type: 'strength',
    muscleGroups: ['biceps'],
    equipment: 'dumbbell'
  },
  {
    id: '13',
    name: 'Tricep Extension',
    nameRu: 'Французский жим',
    category: 'arms',
    type: 'strength',
    muscleGroups: ['triceps'],
    equipment: 'dumbbell'
  },
  
  // Кор
  {
    id: '14',
    name: 'Plank',
    nameRu: 'Планка',
    category: 'core',
    type: 'bodyweight',
    muscleGroups: ['core'],
    equipment: 'bodyweight'
  },
  {
    id: '15',
    name: 'Crunches',
    nameRu: 'Скручивания',
    category: 'core',
    type: 'bodyweight',
    muscleGroups: ['abs'],
    equipment: 'bodyweight'
  },
  
  // Кардио
  {
    id: '16',
    name: 'Running',
    nameRu: 'Бег',
    category: 'cardio',
    type: 'cardio',
    muscleGroups: ['legs', 'cardio'],
    equipment: 'other'
  },
  {
    id: '17',
    name: 'Cycling',
    nameRu: 'Велосипед',
    category: 'cardio',
    type: 'cardio',
    muscleGroups: ['legs', 'cardio'],
    equipment: 'machine'
  }
];

// Getter functions for localized exercise categories
export const getExerciseCategories = () => [
  { value: 'chest', label: i18n.t('workouts:exerciseCategories.chest') },
  { value: 'back', label: i18n.t('workouts:exerciseCategories.back') },
  { value: 'legs', label: i18n.t('workouts:exerciseCategories.legs') },
  { value: 'shoulders', label: i18n.t('workouts:exerciseCategories.shoulders') },
  { value: 'arms', label: i18n.t('workouts:exerciseCategories.arms') },
  { value: 'core', label: i18n.t('workouts:exerciseCategories.core') },
  { value: 'cardio', label: i18n.t('workouts:exerciseCategories.cardio') },
];

// Getter functions for localized equipment types
export const getEquipmentTypes = () => [
  { value: 'barbell', label: i18n.t('workouts:equipment.barbell') },
  { value: 'dumbbell', label: i18n.t('workouts:equipment.dumbbell') },
  { value: 'machine', label: i18n.t('workouts:equipment.machine') },
  { value: 'bodyweight', label: i18n.t('workouts:equipment.bodyweight') },
  { value: 'cable', label: i18n.t('workouts:equipment.cable') },
  { value: 'other', label: i18n.t('workouts:equipment.other') },
];
// Legacy exports removed - use getExerciseCategories() and getEquipmentTypes() instead
// These getter functions return localized labels based on current language
