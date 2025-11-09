import { describe, it, expect } from 'vitest';
import {
  getStreakRewards,
  getNextMilestone,
  getCurrentMilestone,
  getProgressToNextMilestone,
  getStreakStatusMessage,
  isNewMilestone,
  getMilestoneGradient,
} from '../streak-rewards';

describe('Streak Rewards System', () => {
  describe('getStreakRewards', () => {
    it('should return empty array for 0 streak', () => {
      expect(getStreakRewards(0)).toEqual([]);
    });

    it('should return all milestones up to current streak', () => {
      const rewards = getStreakRewards(14);
      expect(rewards).toHaveLength(3); // 3, 7, 14 days
      expect(rewards.map(r => r.days)).toEqual([3, 7, 14]);
    });

    it('should return all milestones for max streak', () => {
      const rewards = getStreakRewards(365);
      expect(rewards).toHaveLength(7); // All milestones
    });
  });

  describe('getNextMilestone', () => {
    it('should return first milestone for 0 streak', () => {
      const next = getNextMilestone(0);
      expect(next?.days).toBe(3);
    });

    it('should return correct next milestone', () => {
      expect(getNextMilestone(5)?.days).toBe(7);
      expect(getNextMilestone(7)?.days).toBe(14);
      expect(getNextMilestone(25)?.days).toBe(30);
    });

    it('should return null when max level reached', () => {
      expect(getNextMilestone(365)).toBeNull();
      expect(getNextMilestone(500)).toBeNull();
    });
  });

  describe('getCurrentMilestone', () => {
    it('should return null for 0 streak', () => {
      expect(getCurrentMilestone(0)).toBeNull();
    });

    it('should return correct current milestone', () => {
      expect(getCurrentMilestone(3)?.days).toBe(3);
      expect(getCurrentMilestone(10)?.days).toBe(7);
      expect(getCurrentMilestone(50)?.days).toBe(50);
    });

    it('should return highest milestone for max streak', () => {
      const current = getCurrentMilestone(365);
      expect(current?.days).toBe(365);
    });
  });

  describe('getProgressToNextMilestone', () => {
    it('should return 0 for 0 streak', () => {
      expect(getProgressToNextMilestone(0)).toBe(0);
    });

    it('should calculate progress correctly', () => {
      // From 3 to 7 days: 4 day range
      // At 5 days: (5-3)/(7-3) = 2/4 = 50%
      expect(getProgressToNextMilestone(5)).toBe(50);
      
      // From 7 to 14 days: 7 day range
      // At 10 days: (10-7)/(14-7) = 3/7 ≈ 43%
      expect(getProgressToNextMilestone(10)).toBe(43);
    });

    it('should return 100 when max level reached', () => {
      expect(getProgressToNextMilestone(365)).toBe(100);
      expect(getProgressToNextMilestone(500)).toBe(100);
    });
  });

  describe('getStreakStatusMessage', () => {
    it('should return correct message for various streaks', () => {
      expect(getStreakStatusMessage(0)).toContain('Еще 3 дней');
      expect(getStreakStatusMessage(6)).toContain('Еще 1 день');
      expect(getStreakStatusMessage(10)).toContain('Еще 4 дней');
    });

    it('should return max level message', () => {
      const message = getStreakStatusMessage(365);
      expect(message).toContain('Максимальный уровень');
    });
  });

  describe('isNewMilestone', () => {
    it('should return null if no new milestone reached', () => {
      expect(isNewMilestone(5, 6)).toBeNull();
      expect(isNewMilestone(10, 11)).toBeNull();
    });

    it('should return milestone when exactly reached', () => {
      const milestone = isNewMilestone(6, 7);
      expect(milestone?.days).toBe(7);
    });

    it('should return milestone when surpassed', () => {
      const milestone = isNewMilestone(5, 10);
      expect(milestone?.days).toBe(7); // First milestone in range
    });

    it('should return null for equal or decreasing streak', () => {
      expect(isNewMilestone(10, 10)).toBeNull();
      expect(isNewMilestone(10, 8)).toBeNull();
    });

    it('should handle multiple milestones in one jump', () => {
      const milestone = isNewMilestone(0, 14);
      expect(milestone?.days).toBe(3); // Returns first milestone in range
    });
  });

  describe('getMilestoneGradient', () => {
    it('should return default gradient for 0 streak', () => {
      expect(getMilestoneGradient(0)).toBe('from-gray-400 to-gray-600');
    });

    it('should return milestone gradient for achieved streak', () => {
      const gradient = getMilestoneGradient(7);
      expect(gradient).toBeTruthy();
      expect(gradient).not.toBe('from-gray-400 to-gray-600');
    });

    it('should return highest achieved milestone gradient', () => {
      const gradient = getMilestoneGradient(100);
      expect(gradient).toBe('from-pink-400 to-pink-600'); // 50 days milestone
    });
  });
});
