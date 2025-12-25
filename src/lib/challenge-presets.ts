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
    scalingFactor: number;
    direction: 'higher' | 'lower' | 'target'; // higher = better with increase, lower = better with decrease, target = optimal value
    min?: number; // minimum physiological value
    max?: number; // maximum physiological value
    benchmarkKey?: string; // key to lookup in BENCHMARK_STANDARDS for scientifically accurate targets
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
        baseValue: 40,
        unit: 'kg',
        scalingFactor: 1.2,
        direction: 'higher',
        min: 20,
      },
      {
        name: 'Squat',
        type: 'strength',
        baseValue: 50,
        unit: 'kg',
        scalingFactor: 1.25,
        direction: 'higher',
        min: 30,
      },
      {
        name: 'Deadlift',
        type: 'strength',
        baseValue: 60,
        unit: 'kg',
        scalingFactor: 1.3,
        direction: 'higher',
        min: 40,
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
        baseValue: 8.0,
        unit: 'hours',
        scalingFactor: 1.0,
        direction: 'higher', // Changed from 'target' - more sleep is better for recovery
        min: 6,
        max: 10,
        benchmarkKey: 'whoop_sleep', // WHOOP-compatible
      },
      {
        name: 'HRV (Heart Rate Variability)',
        type: 'recovery',
        baseValue: 70,
        unit: 'ms',
        scalingFactor: 1.3,
        direction: 'higher', // Higher HRV = better recovery
        min: 30,
        max: 150,
        benchmarkKey: 'whoop_hrv', // WHOOP-compatible
      },
      {
        name: 'Recovery Score',
        type: 'recovery',
        baseValue: 75,
        unit: '%',
        scalingFactor: 1.2,
        direction: 'higher', // Higher recovery = better
        min: 50,
        max: 100,
        benchmarkKey: 'whoop_recovery', // WHOOP-compatible
      },
      {
        name: 'Resting Heart Rate',
        type: 'recovery',
        baseValue: 58,
        unit: 'bpm',
        scalingFactor: 1.0,
        direction: 'lower', // Lower RHR = better cardiovascular fitness
        min: 38,
        max: 75,
        benchmarkKey: 'whoop_rhr', // WHOOP-compatible
      },
      {
        name: 'Body Fat Percentage',
        type: 'composition',
        baseValue: 18,
        unit: '%',
        scalingFactor: 1.0,
        direction: 'lower',
        min: 5,
        max: 35,
        benchmarkKey: 'bodyfat_male',
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
        baseValue: 100,
        unit: 'g',
        scalingFactor: 1.2,
        direction: 'higher',
        min: 60,
        max: 250,
      },
      {
        name: 'Water Intake',
        type: 'nutrition',
        baseValue: 2.5,
        unit: 'liters',
        scalingFactor: 1.15,
        direction: 'higher',
        min: 1.5,
        max: 5,
      },
      {
        name: 'Vegetable Servings',
        type: 'nutrition',
        baseValue: 4,
        unit: 'servings',
        scalingFactor: 1.25,
        direction: 'higher',
        min: 3,
        max: 10,
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
        baseValue: 32,
        unit: 'minutes',
        scalingFactor: 1.0,
        direction: 'lower',
        min: 15,
        max: 45,
        benchmarkKey: 'run_5k',
      },
      {
        name: 'VO2 Max',
        type: 'endurance',
        baseValue: 42,
        unit: 'ml/kg/min',
        scalingFactor: 1.15,
        direction: 'higher',
        min: 30,
        max: 80,
        benchmarkKey: 'vo2max_male',
      },
      {
        name: 'Weekly Distance',
        type: 'endurance',
        baseValue: 15,
        unit: 'km',
        scalingFactor: 1.3,
        direction: 'higher',
        min: 5,
        max: 100,
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
        baseValue: 15,
        unit: 'cm',
        scalingFactor: 1.3,
        direction: 'higher',
        min: 0,
        max: 50,
      },
      {
        name: 'Shoulder Mobility',
        type: 'flexibility',
        baseValue: 140,
        unit: 'degrees',
        scalingFactor: 1.1,
        direction: 'higher',
        min: 120,
        max: 180,
      },
      {
        name: 'Hip Flexor Range',
        type: 'flexibility',
        baseValue: 100,
        unit: 'degrees',
        scalingFactor: 1.15,
        direction: 'higher',
        min: 80,
        max: 140,
      },
    ],
  },
];
