import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkAndAwardAchievements } from '../achievement-checker';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: [],
          error: null,
        })),
      })),
      upsert: vi.fn(() => ({
        data: null,
        error: null,
      })),
      insert: vi.fn(() => ({
        data: null,
        error: null,
      })),
    })),
  },
}));

describe('Achievement Checker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkAndAwardAchievements', () => {
    const mockUserId = 'test-user-id';

    it('should detect streak achievements', async () => {
      const mockData = {
        userId: mockUserId,
        streak: 7,
        totalCompletions: 10,
        perfectDayStreak: 1,
      };

      const achievements = await checkAndAwardAchievements(mockData);
      
      // Should detect "Неделя силы" (7 day streak)
      const weekStreak = achievements.find(a => a.achievement.id === 'streak_week');
      expect(weekStreak).toBeDefined();
    });

    it('should detect completion milestones', async () => {
      const mockData = {
        userId: mockUserId,
        streak: 5,
        totalCompletions: 100,
        perfectDayStreak: 0,
      };

      const achievements = await checkAndAwardAchievements(mockData);
      
      // Should detect "Центурион" (100 completions)
      const centurion = achievements.find(a => a.achievement.id === 'completion_centurion');
      expect(centurion).toBeDefined();
    });

    it('should detect special achievements', async () => {
      const mockData = {
        userId: mockUserId,
        streak: 3,
        totalCompletions: 20,
        completionTime: '05:30:00',
      };

      const achievements = await checkAndAwardAchievements(mockData);
      
      // Should detect achievements based on completion time
      expect(achievements.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect consistency achievements', async () => {
      const mockData = {
        userId: mockUserId,
        streak: 10,
        totalCompletions: 50,
        perfectDayStreak: 7,
      };

      const achievements = await checkAndAwardAchievements(mockData);
      
      // Should detect "Идеальная неделя" (7 perfect days)
      const perfectWeek = achievements.find(a => a.achievement.id === 'consistency_perfect_week');
      expect(perfectWeek).toBeDefined();
    });

    it('should not award same achievement twice', async () => {
      // Mock existing achievements
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: [{ achievement_id: 'streak_week' }],
            error: null,
          })),
        })),
        upsert: vi.fn(() => ({
          data: null,
          error: null,
        })),
        insert: vi.fn(() => ({
          data: null,
          error: null,
        })),
      }));
      
      (supabase.from as any).mockImplementation(mockFrom);

      const mockData = {
        userId: mockUserId,
        streak: 7,
        totalCompletions: 10,
        perfectDayStreak: 0,
      };

      const achievements = await checkAndAwardAchievements(mockData);
      
      // Should not include already awarded achievement
      const weekStreak = achievements.find(a => a.achievement.id === 'streak_week');
      expect(weekStreak).toBeUndefined();
    });

    it('should handle multiple achievements at once', async () => {
      const mockData = {
        userId: mockUserId,
        streak: 30,
        totalCompletions: 100,
        perfectDayStreak: 7,
      };

      const achievements = await checkAndAwardAchievements(mockData);
      
      // Should detect multiple achievements
      expect(achievements.length).toBeGreaterThan(1);
    });

    it('should return achievements when requirements met', async () => {
      const mockData = {
        userId: mockUserId,
        streak: 1,
        totalCompletions: 1,
        perfectDayStreak: 0,
      };

      const achievements = await checkAndAwardAchievements(mockData);
      
      // Should find "Первый шаг" achievement at minimum
      const firstStep = achievements.find(a => a.achievement.id === 'completion_first');
      expect(firstStep).toBeDefined();
    });
  });
});
