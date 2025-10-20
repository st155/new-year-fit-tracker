import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Парсинг "4:10" → 4.1667 (десятичные минуты)
export function parseTimeInput(input: string): number {
  if (input.includes(':')) {
    const [minutes, seconds] = input.split(':').map(s => parseInt(s) || 0);
    return minutes + seconds / 60;
  }
  // Fallback: если введено как "4.10" (старый формат)
  const minutes = Math.floor(parseFloat(input));
  const seconds = Math.round((parseFloat(input) - minutes) * 100);
  return minutes + seconds / 60;
}

// Форматирование 4.1667 → "4:10"
export function formatTimeDisplay(decimalMinutes: number): string {
  const minutes = Math.floor(decimalMinutes);
  const seconds = Math.round((decimalMinutes - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
