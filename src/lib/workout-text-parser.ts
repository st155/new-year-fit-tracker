/**
 * Parser for converting notebook-style workout text to structured data
 * Supports formats:
 * - 10x20kg, 10x20 (reps x weight)
 * - 10 (reps only, bodyweight)
 * - 3x45sec, 45sec (duration sets)
 * - 1m, 2m (duration in minutes)
 * - superset: (marks start of superset group)
 */

export interface ParsedSet {
  reps?: number;
  weight?: number;
  duration_seconds?: number;
  isBodyweight?: boolean;
}

export interface ParsedExercise {
  name: string;
  sets: ParsedSet[];
  supersetGroup?: number;
  totalVolume?: number;
}

export interface ParsedWorkout {
  exercises: ParsedExercise[];
  totalVolume: number;
  totalSets: number;
}

/**
 * Parse a single set string like "10x20kg", "10", "45sec", "1m"
 */
function parseSetString(setStr: string): ParsedSet | null {
  const trimmed = setStr.trim().toLowerCase();
  if (!trimmed) return null;

  // Duration format: 45sec, 45s, 3x45sec
  const secMatch = trimmed.match(/^(\d+)x?(\d+)?\s*(sec|s|сек)$/i);
  if (secMatch) {
    const count = secMatch[2] ? parseInt(secMatch[1]) : 1;
    const seconds = secMatch[2] ? parseInt(secMatch[2]) : parseInt(secMatch[1]);
    return { duration_seconds: seconds, reps: count };
  }

  // Duration format: 1m, 2m (minutes)
  const minMatch = trimmed.match(/^(\d+)\s*(m|min|мин)$/i);
  if (minMatch) {
    return { duration_seconds: parseInt(minMatch[1]) * 60 };
  }

  // Weight format: 10x20kg, 10x20, 8x50
  const weightMatch = trimmed.match(/^(\d+)\s*[xх×]\s*(\d+(?:\.\d+)?)\s*(kg|кг)?$/i);
  if (weightMatch) {
    return {
      reps: parseInt(weightMatch[1]),
      weight: parseFloat(weightMatch[2]),
    };
  }

  // Reverse format: 75x8kg (weight x reps) - less common but handle it
  const reverseMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*[xх×]\s*(\d+)\s*(kg|кг)$/i);
  if (reverseMatch) {
    return {
      weight: parseFloat(reverseMatch[1]),
      reps: parseInt(reverseMatch[2]),
    };
  }

  // Bodyweight format: just "10" (reps only)
  const bwMatch = trimmed.match(/^(\d+)$/);
  if (bwMatch) {
    return {
      reps: parseInt(bwMatch[1]),
      isBodyweight: true,
    };
  }

  // Special: "10 push ups" or similar - extract the number
  const textMatch = trimmed.match(/^(\d+)\s+\w+/i);
  if (textMatch) {
    return {
      reps: parseInt(textMatch[1]),
      isBodyweight: true,
    };
  }

  return null;
}

/**
 * Parse multiple sets from a line like "1m 1m" or "10x20kg 10x25"
 */
function parseSetsFromLine(line: string): ParsedSet[] {
  const sets: ParsedSet[] = [];
  
  // Split by spaces but keep set patterns together
  const parts = line.split(/\s+/).filter(Boolean);
  
  for (const part of parts) {
    const parsed = parseSetString(part);
    if (parsed) {
      sets.push(parsed);
    }
  }
  
  return sets;
}

/**
 * Check if a line looks like an exercise name
 */
function isExerciseName(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  
  // Skip superset markers
  if (trimmed.toLowerCase().includes('superset')) return false;
  
  // Skip lines with dashes only
  if (/^[-—]+$/.test(trimmed)) return false;
  
  // If it contains letters and doesn't parse as a set, it's likely an exercise name
  const hasLetters = /[a-zA-Zа-яА-Я]/.test(trimmed);
  const parsed = parseSetString(trimmed);
  
  return hasLetters && !parsed;
}

/**
 * Main parser function
 */
export function parseWorkoutText(text: string): ParsedWorkout {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const exercises: ParsedExercise[] = [];
  
  let currentExercise: ParsedExercise | null = null;
  let currentSupersetGroup = 0;
  let inSuperset = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for superset marker
    if (line.toLowerCase().includes('superset')) {
      currentSupersetGroup++;
      inSuperset = true;
      continue;
    }
    
    // Check for separator (end of superset)
    if (/^[-—]+$/.test(line)) {
      inSuperset = false;
      continue;
    }
    
    // Check if this is an exercise name
    if (isExerciseName(line)) {
      // Save previous exercise
      if (currentExercise && currentExercise.sets.length > 0) {
        exercises.push(currentExercise);
      }
      
      currentExercise = {
        name: line,
        sets: [],
        supersetGroup: inSuperset ? currentSupersetGroup : undefined,
      };
      continue;
    }
    
    // Try to parse as sets
    const sets = parseSetsFromLine(line);
    if (sets.length > 0 && currentExercise) {
      currentExercise.sets.push(...sets);
    } else if (sets.length > 0 && !currentExercise) {
      // Sets without exercise name - use generic name
      currentExercise = {
        name: 'Упражнение',
        sets: sets,
        supersetGroup: inSuperset ? currentSupersetGroup : undefined,
      };
    }
  }
  
  // Don't forget the last exercise
  if (currentExercise && currentExercise.sets.length > 0) {
    exercises.push(currentExercise);
  }
  
  // Calculate volumes
  let totalVolume = 0;
  let totalSets = 0;
  
  for (const exercise of exercises) {
    let exerciseVolume = 0;
    for (const set of exercise.sets) {
      totalSets++;
      if (set.reps && set.weight) {
        exerciseVolume += set.reps * set.weight;
      }
    }
    exercise.totalVolume = exerciseVolume;
    totalVolume += exerciseVolume;
  }
  
  return {
    exercises,
    totalVolume,
    totalSets,
  };
}

/**
 * Format a set for display
 */
export function formatSet(set: ParsedSet): string {
  if (set.duration_seconds) {
    if (set.duration_seconds >= 60) {
      const mins = Math.floor(set.duration_seconds / 60);
      const secs = set.duration_seconds % 60;
      return secs > 0 ? `${mins}м ${secs}с` : `${mins}м`;
    }
    return `${set.duration_seconds}с`;
  }
  
  if (set.weight && set.reps) {
    return `${set.reps}×${set.weight}кг`;
  }
  
  if (set.reps) {
    return `${set.reps} повт.`;
  }
  
  return '';
}

/**
 * Format all sets of an exercise for display
 */
export function formatExerciseSets(exercise: ParsedExercise): string {
  return exercise.sets.map(formatSet).join(', ');
}
