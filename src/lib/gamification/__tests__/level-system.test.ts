import { describe, it, expect } from 'vitest';
import {
  calculateLevel,
  getXPForLevel,
  getUserLevelInfo,
  calculateStreakXPMultiplier,
  calculateHabitXP,
} from '../level-system';

describe('Level System', () => {
  describe('calculateLevel', () => {
    it('should return level 1 for 0 XP', () => {
      expect(calculateLevel(0)).toBe(1);
    });

    it('should calculate correct level for various XP amounts', () => {
      expect(calculateLevel(100)).toBe(2);
      expect(calculateLevel(400)).toBe(3);
      expect(calculateLevel(900)).toBe(4);
      expect(calculateLevel(1600)).toBe(5);
      expect(calculateLevel(10000)).toBe(11);
    });

    it('should handle negative XP as level 1', () => {
      expect(calculateLevel(-100)).toBe(1);
    });
  });

  describe('getXPForLevel', () => {
    it('should return 0 XP for level 1', () => {
      expect(getXPForLevel(1)).toBe(0);
    });

    it('should calculate correct XP requirements for levels', () => {
      expect(getXPForLevel(2)).toBe(100);
      expect(getXPForLevel(3)).toBe(400);
      expect(getXPForLevel(4)).toBe(900);
      expect(getXPForLevel(5)).toBe(1600);
      expect(getXPForLevel(10)).toBe(8100);
    });

    it('should handle level 1 or lower', () => {
      expect(getXPForLevel(0)).toBe(0);
      expect(getXPForLevel(-1)).toBe(0);
    });
  });

  describe('getUserLevelInfo', () => {
    it('should return correct info for level 1', () => {
      const info = getUserLevelInfo(0);
      expect(info.level).toBe(1);
      expect(info.totalXP).toBe(0);
      expect(info.currentLevelXP).toBe(0);
      expect(info.nextLevelXP).toBe(100);
      expect(info.progressPercent).toBe(0);
      expect(info.xpToNext).toBe(100);
    });

    it('should calculate correct progress percentage', () => {
      const info = getUserLevelInfo(150); // Level 2, 50% to level 3
      expect(info.level).toBe(2);
      expect(info.progressPercent).toBe(17); // (150-100)/(400-100) = 16.67% ≈ 17%
    });

    it('should handle mid-level XP correctly', () => {
      const info = getUserLevelInfo(650); // Level 3, mid-way to 4
      expect(info.level).toBe(3);
      expect(info.currentLevelXP).toBe(650);
      expect(info.nextLevelXP).toBe(900);
      expect(info.xpToNext).toBe(250);
    });
  });

  describe('calculateStreakXPMultiplier', () => {
    it('should return 0 for 0 streak', () => {
      expect(calculateStreakXPMultiplier(0)).toBe(0);
    });

    it('should calculate correct multiplier for various streaks', () => {
      expect(calculateStreakXPMultiplier(1)).toBe(1);
      expect(calculateStreakXPMultiplier(7)).toBe(7);
      expect(calculateStreakXPMultiplier(30)).toBe(30);
    });

    it('should cap at 50 XP bonus', () => {
      expect(calculateStreakXPMultiplier(50)).toBe(50);
      expect(calculateStreakXPMultiplier(100)).toBe(50);
      expect(calculateStreakXPMultiplier(365)).toBe(50);
    });
  });

  describe('calculateHabitXP', () => {
    it('should calculate base XP correctly', () => {
      const xp = calculateHabitXP({
        baseXP: 10,
      });
      expect(xp).toBe(10);
    });

    it('should add streak multiplier', () => {
      const xp = calculateHabitXP({
        baseXP: 10,
        streakBonus: 10,
      });
      expect(xp).toBe(20);
    });

    it('should add first completion bonus', () => {
      const xp = calculateHabitXP({
        baseXP: 10,
        firstCompletionBonus: 5,
      });
      expect(xp).toBe(15);
    });

    it('should add perfect day bonus', () => {
      const xp = calculateHabitXP({
        baseXP: 10,
        perfectDayBonus: 20,
      });
      expect(xp).toBe(30);
    });

    it('should combine all bonuses correctly', () => {
      const xp = calculateHabitXP({
        baseXP: 15,
        streakBonus: 25,
        firstCompletionBonus: 5,
        perfectDayBonus: 20,
      });
      expect(xp).toBe(65);
    });

    it('should add difficulty bonus', () => {
      const xp = calculateHabitXP({
        baseXP: 10,
        difficultyBonus: 5,
      });
      expect(xp).toBe(15);
    });
  });
});
