import { Dumbbell, Flame, Zap, Heart, Trophy } from 'lucide-react';

export interface TrainingPlanPreset {
  id: string;
  name: string;
  icon: any;
  gradient: string;
  description: string;
  category: string;
  defaultDuration: number; // weeks
  weeklyWorkouts: number;
  workoutTemplates: Array<{
    dayOfWeek: number;
    name: string;
    type: string;
    duration: number; // minutes
    exercises: Array<{
      name: string;
      sets: { beginner: number; regular: number; advanced: number; elite: number };
      reps: { beginner: string; regular: string; advanced: string; elite: string };
      notes?: string;
    }>;
  }>;
}

export const TRAINING_PLAN_PRESETS: TrainingPlanPreset[] = [
  {
    id: 'strength-mass',
    name: 'Strength & Mass Building',
    icon: Dumbbell,
    gradient: 'from-primary via-primary/80 to-primary/60',
    description: 'Classic hypertrophy program focusing on compound movements',
    category: 'Strength',
    defaultDuration: 8,
    weeklyWorkouts: 4,
    workoutTemplates: [
      {
        dayOfWeek: 1, // Monday
        name: 'Upper Body Push',
        type: 'strength',
        duration: 60,
        exercises: [
          {
            name: 'Bench Press',
            sets: { beginner: 3, regular: 4, advanced: 5, elite: 5 },
            reps: { beginner: '8-10', regular: '6-8', advanced: '5-6', elite: '4-6' },
          },
          {
            name: 'Overhead Press',
            sets: { beginner: 3, regular: 3, advanced: 4, elite: 4 },
            reps: { beginner: '8-10', regular: '6-8', advanced: '6-8', elite: '5-7' },
          },
          {
            name: 'Incline Dumbbell Press',
            sets: { beginner: 3, regular: 3, advanced: 4, elite: 4 },
            reps: { beginner: '10-12', regular: '8-10', advanced: '8-10', elite: '8-10' },
          },
          {
            name: 'Tricep Dips',
            sets: { beginner: 2, regular: 3, advanced: 3, elite: 4 },
            reps: { beginner: '8-10', regular: '10-12', advanced: '12-15', elite: '15-20' },
          },
        ],
      },
      {
        dayOfWeek: 2, // Tuesday
        name: 'Lower Body',
        type: 'strength',
        duration: 70,
        exercises: [
          {
            name: 'Squat',
            sets: { beginner: 3, regular: 4, advanced: 5, elite: 5 },
            reps: { beginner: '8-10', regular: '6-8', advanced: '5-6', elite: '3-5' },
          },
          {
            name: 'Romanian Deadlift',
            sets: { beginner: 3, regular: 3, advanced: 4, elite: 4 },
            reps: { beginner: '10-12', regular: '8-10', advanced: '8-10', elite: '6-8' },
          },
          {
            name: 'Leg Press',
            sets: { beginner: 3, regular: 3, advanced: 3, elite: 4 },
            reps: { beginner: '12-15', regular: '10-12', advanced: '10-12', elite: '8-10' },
          },
          {
            name: 'Leg Curls',
            sets: { beginner: 2, regular: 3, advanced: 3, elite: 3 },
            reps: { beginner: '10-12', regular: '12-15', advanced: '12-15', elite: '15-20' },
          },
        ],
      },
      {
        dayOfWeek: 4, // Thursday
        name: 'Upper Body Pull',
        type: 'strength',
        duration: 60,
        exercises: [
          {
            name: 'Deadlift',
            sets: { beginner: 3, regular: 4, advanced: 5, elite: 5 },
            reps: { beginner: '6-8', regular: '5-6', advanced: '3-5', elite: '2-4' },
          },
          {
            name: 'Pull-ups',
            sets: { beginner: 3, regular: 4, advanced: 4, elite: 5 },
            reps: { beginner: '5-8', regular: '8-10', advanced: '10-12', elite: '12-15' },
          },
          {
            name: 'Barbell Rows',
            sets: { beginner: 3, regular: 3, advanced: 4, elite: 4 },
            reps: { beginner: '8-10', regular: '8-10', advanced: '6-8', elite: '6-8' },
          },
          {
            name: 'Face Pulls',
            sets: { beginner: 2, regular: 3, advanced: 3, elite: 3 },
            reps: { beginner: '12-15', regular: '15-20', advanced: '15-20', elite: '20-25' },
          },
        ],
      },
      {
        dayOfWeek: 5, // Friday
        name: 'Full Body Power',
        type: 'strength',
        duration: 65,
        exercises: [
          {
            name: 'Power Clean',
            sets: { beginner: 3, regular: 4, advanced: 5, elite: 5 },
            reps: { beginner: '5', regular: '5', advanced: '3-5', elite: '2-3' },
            notes: 'Focus on explosive power',
          },
          {
            name: 'Front Squat',
            sets: { beginner: 3, regular: 3, advanced: 4, elite: 4 },
            reps: { beginner: '6-8', regular: '6-8', advanced: '5-6', elite: '4-5' },
          },
          {
            name: 'Push Press',
            sets: { beginner: 3, regular: 3, advanced: 3, elite: 4 },
            reps: { beginner: '6-8', regular: '6-8', advanced: '5-6', elite: '3-5' },
          },
          {
            name: 'Box Jumps',
            sets: { beginner: 2, regular: 3, advanced: 3, elite: 4 },
            reps: { beginner: '5', regular: '8', advanced: '10', elite: '12' },
          },
        ],
      },
    ],
  },
  {
    id: 'fat-loss',
    name: 'Fat Loss & Conditioning',
    icon: Flame,
    gradient: 'from-orange-500 via-red-500 to-pink-500',
    description: 'High-intensity metabolic conditioning for fat loss',
    category: 'Fat Loss',
    defaultDuration: 6,
    weeklyWorkouts: 5,
    workoutTemplates: [
      {
        dayOfWeek: 1,
        name: 'HIIT Circuit',
        type: 'conditioning',
        duration: 45,
        exercises: [
          {
            name: 'Burpees',
            sets: { beginner: 3, regular: 4, advanced: 5, elite: 6 },
            reps: { beginner: '30 sec', regular: '40 sec', advanced: '45 sec', elite: '60 sec' },
          },
          {
            name: 'Kettlebell Swings',
            sets: { beginner: 3, regular: 4, advanced: 5, elite: 6 },
            reps: { beginner: '15', regular: '20', advanced: '25', elite: '30' },
          },
          {
            name: 'Mountain Climbers',
            sets: { beginner: 3, regular: 4, advanced: 5, elite: 6 },
            reps: { beginner: '30 sec', regular: '40 sec', advanced: '45 sec', elite: '60 sec' },
          },
          {
            name: 'Jump Rope',
            sets: { beginner: 3, regular: 4, advanced: 5, elite: 6 },
            reps: { beginner: '60 sec', regular: '90 sec', advanced: '120 sec', elite: '180 sec' },
          },
        ],
      },
      {
        dayOfWeek: 2,
        name: 'Strength Circuit',
        type: 'strength',
        duration: 50,
        exercises: [
          {
            name: 'Goblet Squat',
            sets: { beginner: 3, regular: 4, advanced: 4, elite: 5 },
            reps: { beginner: '12-15', regular: '15-20', advanced: '20-25', elite: '25-30' },
          },
          {
            name: 'Push-ups',
            sets: { beginner: 3, regular: 4, advanced: 4, elite: 5 },
            reps: { beginner: '10-15', regular: '15-20', advanced: '20-25', elite: '30-40' },
          },
          {
            name: 'Lunges',
            sets: { beginner: 3, regular: 4, advanced: 4, elite: 5 },
            reps: { beginner: '10/leg', regular: '12/leg', advanced: '15/leg', elite: '20/leg' },
          },
          {
            name: 'Plank',
            sets: { beginner: 3, regular: 3, advanced: 4, elite: 4 },
            reps: { beginner: '30 sec', regular: '45 sec', advanced: '60 sec', elite: '90 sec' },
          },
        ],
      },
      {
        dayOfWeek: 3,
        name: 'Cardio Intervals',
        type: 'cardio',
        duration: 40,
        exercises: [
          {
            name: 'Sprint Intervals',
            sets: { beginner: 5, regular: 8, advanced: 10, elite: 12 },
            reps: { beginner: '20 sec', regular: '30 sec', advanced: '40 sec', elite: '60 sec' },
            notes: 'Rest 40 seconds between sprints',
          },
          {
            name: 'Battle Ropes',
            sets: { beginner: 3, regular: 4, advanced: 5, elite: 6 },
            reps: { beginner: '20 sec', regular: '30 sec', advanced: '40 sec', elite: '60 sec' },
          },
          {
            name: 'Box Step-ups',
            sets: { beginner: 3, regular: 3, advanced: 4, elite: 4 },
            reps: { beginner: '10/leg', regular: '15/leg', advanced: '20/leg', elite: '25/leg' },
          },
        ],
      },
      {
        dayOfWeek: 4,
        name: 'Full Body Metabolic',
        type: 'conditioning',
        duration: 45,
        exercises: [
          {
            name: 'Thrusters',
            sets: { beginner: 3, regular: 4, advanced: 5, elite: 5 },
            reps: { beginner: '10', regular: '12', advanced: '15', elite: '20' },
          },
          {
            name: 'Renegade Rows',
            sets: { beginner: 3, regular: 3, advanced: 4, elite: 4 },
            reps: { beginner: '8/arm', regular: '10/arm', advanced: '12/arm', elite: '15/arm' },
          },
          {
            name: 'Jump Squats',
            sets: { beginner: 3, regular: 4, advanced: 4, elite: 5 },
            reps: { beginner: '10', regular: '12', advanced: '15', elite: '20' },
          },
        ],
      },
      {
        dayOfWeek: 6,
        name: 'Active Recovery',
        type: 'recovery',
        duration: 30,
        exercises: [
          {
            name: 'Light Jogging',
            sets: { beginner: 1, regular: 1, advanced: 1, elite: 1 },
            reps: { beginner: '15 min', regular: '20 min', advanced: '25 min', elite: '30 min' },
          },
          {
            name: 'Dynamic Stretching',
            sets: { beginner: 1, regular: 1, advanced: 1, elite: 1 },
            reps: { beginner: '10 min', regular: '10 min', advanced: '10 min', elite: '10 min' },
          },
          {
            name: 'Foam Rolling',
            sets: { beginner: 1, regular: 1, advanced: 1, elite: 1 },
            reps: { beginner: '10 min', regular: '10 min', advanced: '10 min', elite: '10 min' },
          },
        ],
      },
    ],
  },
  {
    id: 'athletic-performance',
    name: 'Athletic Performance',
    icon: Zap,
    gradient: 'from-yellow-500 via-orange-500 to-red-500',
    description: 'Sport-specific training for explosive power and agility',
    category: 'Performance',
    defaultDuration: 10,
    weeklyWorkouts: 5,
    workoutTemplates: [
      {
        dayOfWeek: 1,
        name: 'Power Development',
        type: 'power',
        duration: 60,
        exercises: [
          {
            name: 'Power Clean',
            sets: { beginner: 4, regular: 5, advanced: 6, elite: 6 },
            reps: { beginner: '3', regular: '3', advanced: '2-3', elite: '1-2' },
          },
          {
            name: 'Box Jumps',
            sets: { beginner: 3, regular: 4, advanced: 5, elite: 5 },
            reps: { beginner: '5', regular: '8', advanced: '10', elite: '12' },
          },
          {
            name: 'Medicine Ball Slams',
            sets: { beginner: 3, regular: 4, advanced: 4, elite: 5 },
            reps: { beginner: '8', regular: '10', advanced: '12', elite: '15' },
          },
        ],
      },
      {
        dayOfWeek: 2,
        name: 'Speed & Agility',
        type: 'agility',
        duration: 50,
        exercises: [
          {
            name: 'Sprint Drills',
            sets: { beginner: 6, regular: 8, advanced: 10, elite: 12 },
            reps: { beginner: '20m', regular: '30m', advanced: '40m', elite: '50m' },
          },
          {
            name: 'Cone Drills',
            sets: { beginner: 4, regular: 5, advanced: 6, elite: 8 },
            reps: { beginner: '30 sec', regular: '45 sec', advanced: '60 sec', elite: '90 sec' },
          },
          {
            name: 'Ladder Drills',
            sets: { beginner: 3, regular: 4, advanced: 5, elite: 6 },
            reps: { beginner: '5 patterns', regular: '8 patterns', advanced: '10 patterns', elite: '12 patterns' },
          },
        ],
      },
      {
        dayOfWeek: 3,
        name: 'Strength Foundation',
        type: 'strength',
        duration: 70,
        exercises: [
          {
            name: 'Back Squat',
            sets: { beginner: 4, regular: 4, advanced: 5, elite: 5 },
            reps: { beginner: '5-6', regular: '4-5', advanced: '3-4', elite: '2-3' },
          },
          {
            name: 'Bench Press',
            sets: { beginner: 4, regular: 4, advanced: 5, elite: 5 },
            reps: { beginner: '5-6', regular: '4-5', advanced: '3-4', elite: '2-3' },
          },
          {
            name: 'Deadlift',
            sets: { beginner: 3, regular: 4, advanced: 4, elite: 5 },
            reps: { beginner: '5', regular: '3-5', advanced: '2-3', elite: '1-2' },
          },
        ],
      },
      {
        dayOfWeek: 5,
        name: 'Plyometrics',
        type: 'power',
        duration: 45,
        exercises: [
          {
            name: 'Depth Jumps',
            sets: { beginner: 3, regular: 4, advanced: 5, elite: 6 },
            reps: { beginner: '5', regular: '6', advanced: '8', elite: '10' },
          },
          {
            name: 'Broad Jumps',
            sets: { beginner: 3, regular: 4, advanced: 5, elite: 5 },
            reps: { beginner: '5', regular: '6', advanced: '8', elite: '10' },
          },
          {
            name: 'Single-Leg Hops',
            sets: { beginner: 3, regular: 3, advanced: 4, elite: 4 },
            reps: { beginner: '5/leg', regular: '8/leg', advanced: '10/leg', elite: '12/leg' },
          },
        ],
      },
      {
        dayOfWeek: 6,
        name: 'Conditioning',
        type: 'conditioning',
        duration: 40,
        exercises: [
          {
            name: 'Sled Push',
            sets: { beginner: 4, regular: 5, advanced: 6, elite: 8 },
            reps: { beginner: '20m', regular: '30m', advanced: '40m', elite: '50m' },
          },
          {
            name: 'Prowler Sprints',
            sets: { beginner: 3, regular: 4, advanced: 5, elite: 6 },
            reps: { beginner: '15m', regular: '20m', advanced: '25m', elite: '30m' },
          },
          {
            name: 'Bike Sprints',
            sets: { beginner: 4, regular: 5, advanced: 6, elite: 8 },
            reps: { beginner: '20 sec', regular: '30 sec', advanced: '40 sec', elite: '60 sec' },
          },
        ],
      },
    ],
  },
  {
    id: 'recovery-mobility',
    name: 'Recovery & Mobility',
    icon: Heart,
    gradient: 'from-blue-500 via-purple-500 to-pink-500',
    description: 'Active recovery, flexibility, and injury prevention',
    category: 'Recovery',
    defaultDuration: 4,
    weeklyWorkouts: 3,
    workoutTemplates: [
      {
        dayOfWeek: 1,
        name: 'Yoga Flow',
        type: 'flexibility',
        duration: 45,
        exercises: [
          {
            name: 'Sun Salutations',
            sets: { beginner: 3, regular: 5, advanced: 8, elite: 10 },
            reps: { beginner: '5 rounds', regular: '5 rounds', advanced: '5 rounds', elite: '5 rounds' },
          },
          {
            name: 'Warrior Sequence',
            sets: { beginner: 2, regular: 3, advanced: 3, elite: 4 },
            reps: { beginner: '30 sec/side', regular: '45 sec/side', advanced: '60 sec/side', elite: '90 sec/side' },
          },
          {
            name: 'Pigeon Pose',
            sets: { beginner: 2, regular: 2, advanced: 3, elite: 3 },
            reps: { beginner: '60 sec/side', regular: '90 sec/side', advanced: '120 sec/side', elite: '180 sec/side' },
          },
        ],
      },
      {
        dayOfWeek: 3,
        name: 'Mobility Work',
        type: 'mobility',
        duration: 40,
        exercises: [
          {
            name: 'Hip Mobility Drills',
            sets: { beginner: 2, regular: 3, advanced: 3, elite: 4 },
            reps: { beginner: '10/side', regular: '12/side', advanced: '15/side', elite: '20/side' },
          },
          {
            name: 'Shoulder Dislocations',
            sets: { beginner: 2, regular: 3, advanced: 3, elite: 4 },
            reps: { beginner: '10', regular: '15', advanced: '20', elite: '25' },
          },
          {
            name: 'Thoracic Rotations',
            sets: { beginner: 2, regular: 3, advanced: 3, elite: 4 },
            reps: { beginner: '10/side', regular: '12/side', advanced: '15/side', elite: '20/side' },
          },
          {
            name: 'Ankle Mobility',
            sets: { beginner: 2, regular: 2, advanced: 3, elite: 3 },
            reps: { beginner: '10/side', regular: '12/side', advanced: '15/side', elite: '20/side' },
          },
        ],
      },
      {
        dayOfWeek: 5,
        name: 'Active Recovery',
        type: 'recovery',
        duration: 30,
        exercises: [
          {
            name: 'Light Swimming',
            sets: { beginner: 1, regular: 1, advanced: 1, elite: 1 },
            reps: { beginner: '15 min', regular: '20 min', advanced: '25 min', elite: '30 min' },
          },
          {
            name: 'Foam Rolling',
            sets: { beginner: 1, regular: 1, advanced: 1, elite: 1 },
            reps: { beginner: '10 min', regular: '15 min', advanced: '15 min', elite: '20 min' },
          },
          {
            name: 'Static Stretching',
            sets: { beginner: 1, regular: 1, advanced: 1, elite: 1 },
            reps: { beginner: '10 min', regular: '15 min', advanced: '15 min', elite: '20 min' },
          },
        ],
      },
    ],
  },
  {
    id: 'powerlifting',
    name: 'Powerlifting Focus',
    icon: Trophy,
    gradient: 'from-purple-500 via-pink-500 to-red-500',
    description: 'Maximize strength in the big three: squat, bench, deadlift',
    category: 'Powerlifting',
    defaultDuration: 12,
    weeklyWorkouts: 4,
    workoutTemplates: [
      {
        dayOfWeek: 1,
        name: 'Squat Day',
        type: 'strength',
        duration: 75,
        exercises: [
          {
            name: 'Back Squat (Main)',
            sets: { beginner: 4, regular: 5, advanced: 6, elite: 8 },
            reps: { beginner: '5', regular: '3-5', advanced: '2-3', elite: '1-2' },
          },
          {
            name: 'Front Squat',
            sets: { beginner: 3, regular: 3, advanced: 4, elite: 4 },
            reps: { beginner: '6-8', regular: '5-6', advanced: '4-5', elite: '3-4' },
          },
          {
            name: 'Leg Press',
            sets: { beginner: 3, regular: 3, advanced: 4, elite: 4 },
            reps: { beginner: '10-12', regular: '8-10', advanced: '6-8', elite: '5-6' },
          },
          {
            name: 'Core Work',
            sets: { beginner: 3, regular: 4, advanced: 4, elite: 5 },
            reps: { beginner: '30 sec', regular: '45 sec', advanced: '60 sec', elite: '90 sec' },
          },
        ],
      },
      {
        dayOfWeek: 2,
        name: 'Bench Day',
        type: 'strength',
        duration: 70,
        exercises: [
          {
            name: 'Bench Press (Main)',
            sets: { beginner: 4, regular: 5, advanced: 6, elite: 8 },
            reps: { beginner: '5', regular: '3-5', advanced: '2-3', elite: '1-2' },
          },
          {
            name: 'Close-Grip Bench',
            sets: { beginner: 3, regular: 3, advanced: 4, elite: 4 },
            reps: { beginner: '6-8', regular: '5-6', advanced: '4-5', elite: '3-4' },
          },
          {
            name: 'Dumbbell Press',
            sets: { beginner: 3, regular: 3, advanced: 3, elite: 4 },
            reps: { beginner: '8-10', regular: '6-8', advanced: '6-8', elite: '5-6' },
          },
          {
            name: 'Tricep Work',
            sets: { beginner: 3, regular: 3, advanced: 4, elite: 4 },
            reps: { beginner: '10-12', regular: '12-15', advanced: '15-20', elite: '20-25' },
          },
        ],
      },
      {
        dayOfWeek: 4,
        name: 'Deadlift Day',
        type: 'strength',
        duration: 75,
        exercises: [
          {
            name: 'Deadlift (Main)',
            sets: { beginner: 4, regular: 5, advanced: 6, elite: 8 },
            reps: { beginner: '5', regular: '3-5', advanced: '2-3', elite: '1' },
          },
          {
            name: 'Romanian Deadlift',
            sets: { beginner: 3, regular: 3, advanced: 4, elite: 4 },
            reps: { beginner: '8-10', regular: '6-8', advanced: '5-6', elite: '4-5' },
          },
          {
            name: 'Barbell Rows',
            sets: { beginner: 3, regular: 4, advanced: 4, elite: 5 },
            reps: { beginner: '8-10', regular: '6-8', advanced: '5-6', elite: '4-5' },
          },
          {
            name: 'Back Extensions',
            sets: { beginner: 3, regular: 3, advanced: 4, elite: 4 },
            reps: { beginner: '10', regular: '12', advanced: '15', elite: '20' },
          },
        ],
      },
      {
        dayOfWeek: 5,
        name: 'Accessory Day',
        type: 'strength',
        duration: 60,
        exercises: [
          {
            name: 'Pause Squats',
            sets: { beginner: 3, regular: 4, advanced: 4, elite: 5 },
            reps: { beginner: '5', regular: '5', advanced: '3-5', elite: '3' },
          },
          {
            name: 'Paused Bench Press',
            sets: { beginner: 3, regular: 4, advanced: 4, elite: 5 },
            reps: { beginner: '5', regular: '5', advanced: '3-5', elite: '3' },
          },
          {
            name: 'Deficit Deadlifts',
            sets: { beginner: 3, regular: 3, advanced: 4, elite: 4 },
            reps: { beginner: '5', regular: '5', advanced: '3-5', elite: '3' },
          },
        ],
      },
    ],
  },
];
