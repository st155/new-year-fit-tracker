import { Activity, Moon, Apple, Heart, Bike } from 'lucide-react';

export interface ChallengePreset {
  id: string;
  name: string;
  icon: any;
  gradient: string;
  description: string;
  category: string;
  defaultDuration: number; // weeks
  disciplines: Array<{
    name: string;
    type: string;
    baseValue: number;
    unit: string;
    scalingFactor: number; // multiplier for difficulty
  }>;
}

export const CHALLENGE_PRESETS: ChallengePreset[] = [
  {
    id: 'fitness-strength',
    name: 'Fitness & Strength',
    icon: Activity,
    gradient: 'from-primary via-primary/80 to-primary/60',
    description: 'Build muscle and increase overall strength',
    category: 'Strength',
    defaultDuration: 8,
    disciplines: [
      {
        name: 'Bench Press',
        type: 'strength',
        baseValue: 60,
        unit: 'kg',
        scalingFactor: 1.2,
      },
      {
        name: 'Squat',
        type: 'strength',
        baseValue: 80,
        unit: 'kg',
        scalingFactor: 1.25,
      },
      {
        name: 'Deadlift',
        type: 'strength',
        baseValue: 100,
        unit: 'kg',
        scalingFactor: 1.3,
      },
    ],
  },
  {
    id: 'recovery-sleep',
    name: 'Recovery & Sleep',
    icon: Moon,
    gradient: 'from-blue-500 via-purple-500 to-pink-500',
    description: 'Improve sleep quality and recovery metrics',
    category: 'Recovery',
    defaultDuration: 12,
    disciplines: [
      {
        name: 'Sleep Hours',
        type: 'recovery',
        baseValue: 7.5,
        unit: 'hours',
        scalingFactor: 1.1,
      },
      {
        name: 'Recovery Score',
        type: 'recovery',
        baseValue: 75,
        unit: '%',
        scalingFactor: 1.15,
      },
      {
        name: 'Resting Heart Rate',
        type: 'recovery',
        baseValue: 60,
        unit: 'bpm',
        scalingFactor: 0.9, // lower is better
      },
    ],
  },
  {
    id: 'nutrition-detox',
    name: 'Nutrition & Detox',
    icon: Apple,
    gradient: 'from-green-500 via-emerald-500 to-teal-500',
    description: 'Clean eating and healthy nutrition habits',
    category: 'Nutrition',
    defaultDuration: 4,
    disciplines: [
      {
        name: 'Daily Protein',
        type: 'nutrition',
        baseValue: 120,
        unit: 'g',
        scalingFactor: 1.15,
      },
      {
        name: 'Water Intake',
        type: 'nutrition',
        baseValue: 3,
        unit: 'liters',
        scalingFactor: 1.2,
      },
      {
        name: 'Vegetable Servings',
        type: 'nutrition',
        baseValue: 5,
        unit: 'servings',
        scalingFactor: 1.3,
      },
    ],
  },
  {
    id: 'cardio-endurance',
    name: 'Cardio & Endurance',
    icon: Heart,
    gradient: 'from-red-500 via-orange-500 to-yellow-500',
    description: 'Build cardiovascular fitness and endurance',
    category: 'Cardio',
    defaultDuration: 10,
    disciplines: [
      {
        name: '5K Run Time',
        type: 'endurance',
        baseValue: 30,
        unit: 'minutes',
        scalingFactor: 0.85, // lower is better
      },
      {
        name: 'VO2 Max',
        type: 'endurance',
        baseValue: 45,
        unit: 'ml/kg/min',
        scalingFactor: 1.15,
      },
      {
        name: 'Weekly Distance',
        type: 'endurance',
        baseValue: 20,
        unit: 'km',
        scalingFactor: 1.3,
      },
    ],
  },
  {
    id: 'flexibility-mobility',
    name: 'Flexibility & Mobility',
    icon: Bike,
    gradient: 'from-cyan-500 via-sky-500 to-blue-500',
    description: 'Enhance flexibility and range of motion',
    category: 'Mobility',
    defaultDuration: 6,
    disciplines: [
      {
        name: 'Sit & Reach',
        type: 'flexibility',
        baseValue: 20,
        unit: 'cm',
        scalingFactor: 1.25,
      },
      {
        name: 'Shoulder Mobility',
        type: 'flexibility',
        baseValue: 150,
        unit: 'degrees',
        scalingFactor: 1.1,
      },
      {
        name: 'Hip Flexor Range',
        type: 'flexibility',
        baseValue: 110,
        unit: 'degrees',
        scalingFactor: 1.15,
      },
    ],
  },
];
