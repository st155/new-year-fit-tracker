/**
 * Parser for converting notebook-style workout text to structured data
 * Supports formats:
 * - 10x20kg, 10x20 (reps x weight)
 * - 60x10 (weight x reps when first number is significantly larger)
 * - 60x10x3 (weight x reps x sets)
 * - 10 (reps only, bodyweight)
 * - 7x, 6x (reps only, inherit weight from previous)
 * - 3x45sec, 45sec (duration sets)
 * - 1m, 2m (duration in minutes)
 * - left/right suffix for unilateral exercises
 * - superset: (marks start of superset group)
 */

import { normalizeExerciseName, isBodyweightExercise, type NormalizedExercise } from './exercises-aliases';

export interface ParsedSet {
  reps?: number;
  weight?: number;
  duration_seconds?: number;
  isBodyweight?: boolean;
  side?: 'left' | 'right';
  setCount?: number;
}

export interface ParsedExercise {
  name: string;
  displayName: string;
  displayNameRu: string;
  wasNormalized: boolean;
  sets: ParsedSet[];
  supersetGroup?: number;
  totalVolume?: number;
  isBodyweight?: boolean;
}

export interface ParsedWorkout {
  exercises: ParsedExercise[];
  totalVolume: number;
  totalSets: number;
}

/**
 * Extract side indicator from string
 */
function extractSide(str: string): { cleaned: string; side?: 'left' | 'right' } {
  const sideMatch = str.match(/\s*(left|right|лев\w*|прав\w*)\s*$/i);
  if (sideMatch) {
    const sideStr = sideMatch[1].toLowerCase();
    const side = sideStr.startsWith('l') || sideStr.startsWith('л') ? 'left' : 'right';
    return {
      cleaned: str.replace(/\s*(left|right|лев\w*|прав\w*)\s*$/i, '').trim(),
      side
    };
  }
  return { cleaned: str };
}

/**
 * Parse a single set string like "10x20kg", "10", "45sec", "1m", "60x10x3"
 * @param setStr - The set string to parse
 * @param isBodyweightExercise - If true, interpret "NxM" as "N reps x M sets" for small M
 */
function parseSetString(setStr: string, isBodyweightExercise: boolean = false): ParsedSet | null {
  // Extract side indicator first
  const { cleaned, side } = extractSide(setStr);
  let trimmed = cleaned.trim().toLowerCase();
  if (!trimmed) return null;

  // Remove trailing suffixes like "подхода", "подходов", "раз", "sets"
  trimmed = trimmed.replace(/\s*(подход|подхода|подходов|sets?)\s*$/i, '');

  // Format: "N подходов по Xсек" (e.g., "3 подхода по 30сек")
  const setsOfDurationMatch = trimmed.match(/^(\d+)\s*(подход|подхода|подходов)\s*по\s*(\d+)\s*(сек|sec|s|мин|min|м)$/i);
  if (setsOfDurationMatch) {
    const sets = parseInt(setsOfDurationMatch[1]);
    const duration = parseInt(setsOfDurationMatch[3]);
    const unit = setsOfDurationMatch[4].toLowerCase();
    const seconds = (unit === 'мин' || unit === 'min' || unit === 'м') ? duration * 60 : duration;
    return { duration_seconds: seconds, setCount: sets, isBodyweight: true, side };
  }

  // Format: "N раз" (e.g., "13 раз", "20 раз")
  const razOnlyMatch = trimmed.match(/^(\d+)\s*раз$/i);
  if (razOnlyMatch) {
    return { reps: parseInt(razOnlyMatch[1]), isBodyweight: true, side };
  }

  // Format: "N разхM" or "N раз x M" (e.g., "10 разх3", "10 раз x 3")
  const razTimesMatch = trimmed.match(/^(\d+)\s*раз\s*[xх×]\s*(\d+)$/i);
  if (razTimesMatch) {
    return { reps: parseInt(razTimesMatch[1]), setCount: parseInt(razTimesMatch[2]), isBodyweight: true, side };
  }

  // Format: "N раз в каждую сторону" (e.g., "20 раз в каждую сторону")
  const razEachSideMatch = trimmed.match(/^(\d+)\s*раз\s*(в каждую сторону|each side)$/i);
  if (razEachSideMatch) {
    return { reps: parseInt(razEachSideMatch[1]), setCount: 2, isBodyweight: true, side };
  }

  // Duration with multiplier: 40sec x 4, 30s x 3, 60сек x 2
  const durationMultiplierMatch = trimmed.match(/^(\d+)\s*(sec|s|сек|с)\s*[xх×]\s*(\d+)$/i);
  if (durationMultiplierMatch) {
    return { 
      duration_seconds: parseInt(durationMultiplierMatch[1]), 
      setCount: parseInt(durationMultiplierMatch[3]),
      isBodyweight: true,
      side 
    };
  }

  // Duration format: 45sec, 45s, 3x45sec
  const secMatch = trimmed.match(/^(\d+)x?(\d+)?\s*(sec|s|сек)$/i);
  if (secMatch) {
    const count = secMatch[2] ? parseInt(secMatch[1]) : 1;
    const seconds = secMatch[2] ? parseInt(secMatch[2]) : parseInt(secMatch[1]);
    return { duration_seconds: seconds, reps: count, side };
  }

  // Duration format: 1m, 2m (minutes)
  const minMatch = trimmed.match(/^(\d+)\s*(m|min|мин)$/i);
  if (minMatch) {
    return { duration_seconds: parseInt(minMatch[1]) * 60, side };
  }

  // Triple format: 60x10x3 (weight x reps x sets) - common notebook format
  const tripleMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*[xх×]\s*(\d+)\s*[xх×]\s*(\d+)\s*(kg|кг)?$/i);
  if (tripleMatch) {
    const a = parseFloat(tripleMatch[1]);
    const b = parseInt(tripleMatch[2]);
    const c = parseInt(tripleMatch[3]);
    
    // AxBxC ALWAYS means weight x reps x sets
    // Even for bodyweight exercises - if user specified 3 numbers, they added weight
    // Heuristic: if a > b, format is weight x reps x sets, otherwise reps x weight x sets
    if (a > b) {
      return { weight: a, reps: Math.round(b), setCount: c, side };
    } else {
      return { reps: Math.round(a), weight: b, setCount: c, side };
    }
  }

  // Reps only with x suffix: 7x, 6x (inherit weight from previous)
  const repsOnlyXMatch = trimmed.match(/^(\d+)\s*[xх×]$/i);
  if (repsOnlyXMatch) {
    return {
      reps: parseInt(repsOnlyXMatch[1]),
      weight: undefined, // will inherit from previous
      isBodyweight: isBodyweightExercise,
      side
    };
  }

  // Weight format with explicit kg: 10x20kg, 10x20кг, 17.5x12kg (decimal weight)
  const explicitKgMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*[xх×]\s*(\d+(?:\.\d+)?)\s*(kg|кг)$/i);
  if (explicitKgMatch) {
    const a = parseFloat(explicitKgMatch[1]);
    const b = parseFloat(explicitKgMatch[2]);
    // If first number is decimal, it's weight (17.5x12kg = 17.5kg x 12 reps)
    // Otherwise first is reps (10x20kg = 10 reps x 20kg)
    if (a % 1 !== 0) {
      return { weight: a, reps: Math.round(b), side };
    }
    return { reps: Math.round(a), weight: b, side };
  }

  // Two number format without kg: use heuristic
  const twoNumMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*[xх×]\s*(\d+(?:\.\d+)?)$/i);
  if (twoNumMatch) {
    const a = parseFloat(twoNumMatch[1]);
    const b = parseFloat(twoNumMatch[2]);
    
    // For bodyweight exercises: "12x3" = 12 reps x 3 sets (when second number is small)
    if (isBodyweightExercise && b <= 10) {
      return { reps: Math.round(a), setCount: Math.round(b), isBodyweight: true, side };
    }
    
    // If first number is decimal, it's likely weight (17.5x12 = 17.5kg x 12 reps)
    if (a % 1 !== 0) {
      return { weight: a, reps: Math.round(b), side };
    }
    
    if (a > b * 1.5) {
      // First number much larger: weight x reps (60x10)
      return { weight: a, reps: Math.round(b), side };
    } else if (b > a * 1.5) {
      // Second number much larger: reps x weight (10x60)
      return { reps: Math.round(a), weight: b, side };
    } else {
      // Numbers are similar - could be reps x sets for bodyweight
      // or reps x weight for light weights
      if (b <= 5) {
        // Small second number likely means sets, not weight
        return { reps: Math.round(a), setCount: Math.round(b), isBodyweight: true, side };
      }
      return { reps: Math.round(a), weight: b, side };
    }
  }

  // Reverse format with kg: 75x8kg (weight x reps) - explicit kg at end
  const reverseMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*[xх×]\s*(\d+)\s*(kg|кг)$/i);
  if (reverseMatch) {
    return {
      weight: parseFloat(reverseMatch[1]),
      reps: parseInt(reverseMatch[2]),
      side
    };
  }

  // Bodyweight format: just "10" (reps only)
  const bwMatch = trimmed.match(/^(\d+)$/);
  if (bwMatch) {
    return {
      reps: parseInt(bwMatch[1]),
      isBodyweight: true,
      side
    };
  }

  // Special: "10 push ups" or similar - extract the number
  const textMatch = trimmed.match(/^(\d+)\s+\w+/i);
  if (textMatch) {
    return {
      reps: parseInt(textMatch[1]),
      isBodyweight: true,
      side
    };
  }

  return null;
}

/**
 * Expand sets with setCount into individual sets
 */
function expandSets(sets: ParsedSet[]): ParsedSet[] {
  const expanded: ParsedSet[] = [];
  for (const set of sets) {
    const count = set.setCount || 1;
    for (let i = 0; i < count; i++) {
      expanded.push({
        reps: set.reps,
        weight: set.weight,
        duration_seconds: set.duration_seconds,
        isBodyweight: set.isBodyweight,
        side: set.side
      });
    }
  }
  return expanded;
}

/**
 * Apply weight inheritance for sets without explicit weight
 */
function applyWeightInheritance(sets: ParsedSet[]): void {
  let lastWeight: number | undefined = undefined;
  
  for (const set of sets) {
    if (set.weight !== undefined) {
      lastWeight = set.weight;
    } else if (lastWeight !== undefined && !set.isBodyweight && set.reps !== undefined) {
      // Inherit weight from previous set
      set.weight = lastWeight;
    }
  }
}

/**
 * Parse multiple sets from a line like "1m 1m" or "10x20kg 10x25"
 * @param line - The line containing sets
 * @param isBodyweightExercise - If true, interpret "NxM" as "N reps x M sets" for small M
 */
function parseSetsFromLine(line: string, isBodyweightExercise: boolean = false): ParsedSet[] {
  const sets: ParsedSet[] = [];
  
  // Normalize spaces around x/×/х BEFORE splitting (handles "20 x 8" -> "20x8")
  let normalizedLine = line.replace(/\s*[xх×]\s*/gi, 'x');
  
  // Try to parse the whole line first for complex patterns
  const wholeParsed = parseSetString(normalizedLine, isBodyweightExercise);
  if (wholeParsed) {
    return [wholeParsed];
  }
  
  // Split by spaces but keep set patterns together
  const parts = normalizedLine.split(/\s+/).filter(Boolean);
  
  for (const part of parts) {
    const parsed = parseSetString(part, isBodyweightExercise);
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
        // Expand sets with setCount and apply weight inheritance
        currentExercise.sets = expandSets(currentExercise.sets);
        applyWeightInheritance(currentExercise.sets);
        exercises.push(currentExercise);
      }
      
      // Normalize the exercise name
      const normalized = normalizeExerciseName(line);
      const isBodyweight = isBodyweightExercise(line);
      
      currentExercise = {
        name: normalized.canonicalName,
        displayName: normalized.displayName,
        displayNameRu: normalized.displayNameRu,
        wasNormalized: normalized.matched,
        isBodyweight,
        sets: [],
        supersetGroup: inSuperset ? currentSupersetGroup : undefined,
      };
      continue;
    }
    
    // Try to parse as sets - pass isBodyweight context from current exercise
    const isBodyweight = currentExercise?.isBodyweight ?? false;
    const sets = parseSetsFromLine(line, isBodyweight);
    if (sets.length > 0 && currentExercise) {
      currentExercise.sets.push(...sets);
    } else if (sets.length > 0 && !currentExercise) {
      // Sets without exercise name - use generic name
      currentExercise = {
        name: 'Упражнение',
        displayName: 'Упражнение',
        displayNameRu: 'Упражнение',
        wasNormalized: false,
        sets: sets,
        supersetGroup: inSuperset ? currentSupersetGroup : undefined,
      };
    }
  }
  
  // Don't forget the last exercise
  if (currentExercise && currentExercise.sets.length > 0) {
    currentExercise.sets = expandSets(currentExercise.sets);
    applyWeightInheritance(currentExercise.sets);
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
  const sideStr = set.side ? ` (${set.side === 'left' ? 'лев' : 'прав'})` : '';
  
  if (set.duration_seconds) {
    if (set.duration_seconds >= 60) {
      const mins = Math.floor(set.duration_seconds / 60);
      const secs = set.duration_seconds % 60;
      return (secs > 0 ? `${mins}м ${secs}с` : `${mins}м`) + sideStr;
    }
    return `${set.duration_seconds}с` + sideStr;
  }
  
  if (set.weight && set.reps) {
    return `${set.reps}×${set.weight}кг` + sideStr;
  }
  
  if (set.reps) {
    return `${set.reps} повт.` + sideStr;
  }
  
  return '';
}

/**
 * Format all sets of an exercise for display
 */
export function formatExerciseSets(exercise: ParsedExercise): string {
  return exercise.sets.map(formatSet).join(', ');
}
