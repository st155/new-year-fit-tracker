// Утилиты для расчета streak (серий)

import { differenceInDays, format, parseISO } from 'date-fns';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalDays: number;
  lastActivityDate: string | null;
  streakBroken: boolean;
}

/**
 * Вычисляет streak на основе массива дат активности
 */
export const calculateStreak = (activityDates: string[]): StreakData => {
  if (!activityDates || activityDates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalDays: 0,
      lastActivityDate: null,
      streakBroken: false
    };
  }

  // Сортируем даты по убыванию (новые первыми)
  const sortedDates = [...new Set(activityDates)]
    .map(d => format(parseISO(d), 'yyyy-MM-dd'))
    .sort((a, b) => b.localeCompare(a));

  const today = format(new Date(), 'yyyy-MM-dd');
  const lastActivityDate = sortedDates[0];
  
  // Проверяем, не прервался ли streak (последняя активность не позже вчера)
  const daysSinceLastActivity = differenceInDays(
    parseISO(today),
    parseISO(lastActivityDate)
  );
  const streakBroken = daysSinceLastActivity > 1;

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Вычисляем текущий streak
  if (!streakBroken) {
    for (let i = 0; i < sortedDates.length; i++) {
      const currentDate = sortedDates[i];
      const expectedDate = i === 0 
        ? today 
        : format(parseISO(sortedDates[i - 1]).getTime() - 24 * 60 * 60 * 1000, 'yyyy-MM-dd');
      
      if (i === 0 && currentDate === today) {
        currentStreak = 1;
      } else if (i === 0 && daysSinceLastActivity === 1) {
        currentStreak = 1;
      } else if (currentDate === expectedDate || 
                 differenceInDays(parseISO(sortedDates[i - 1]), parseISO(currentDate)) === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Вычисляем самый длинный streak
  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const daysDiff = differenceInDays(
        parseISO(sortedDates[i - 1]),
        parseISO(sortedDates[i])
      );
      
      if (daysDiff === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return {
    currentStreak,
    longestStreak,
    totalDays: sortedDates.length,
    lastActivityDate,
    streakBroken
  };
};

/**
 * Получает цвет для streak badge в зависимости от длины серии
 */
export const getStreakColor = (streak: number): string => {
  if (streak === 0) return 'text-muted-foreground';
  if (streak < 7) return 'text-blue-500';
  if (streak < 30) return 'text-green-500';
  if (streak < 100) return 'text-yellow-500';
  return 'text-orange-500';
};

/**
 * Получает эмодзи для streak
 */
export const getStreakEmoji = (streak: number): string => {
  if (streak === 0) return '💤';
  if (streak < 7) return '🔥';
  if (streak < 30) return '⚡';
  if (streak < 100) return '🌟';
  return '👑';
};

/**
 * Форматирует текст streak
 */
export const formatStreakText = (streak: number): string => {
  if (streak === 0) return 'Начните серию!';
  if (streak === 1) return '1 день';
  if (streak < 5) return `${streak} дня`;
  return `${streak} дней`;
};
