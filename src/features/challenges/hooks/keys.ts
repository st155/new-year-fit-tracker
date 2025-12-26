/**
 * Challenge Query Keys
 * Centralized query key management for challenges
 */

export const challengeKeys = {
  all: ['challenges'] as const,
  
  // Lists
  lists: () => [...challengeKeys.all, 'list'] as const,
  list: (userId: string) => [...challengeKeys.lists(), userId] as const,
  
  // Trainer challenges
  trainer: (trainerId: string) => [...challengeKeys.all, 'trainer', trainerId] as const,
  
  // Details
  details: () => [...challengeKeys.all, 'detail'] as const,
  detail: (challengeId: string) => [...challengeKeys.details(), challengeId] as const,
  
  // Reports
  reports: () => [...challengeKeys.all, 'report'] as const,
  report: (challengeId: string, userId: string, isPreview: boolean = false) => 
    [...challengeKeys.reports(), challengeId, userId, isPreview] as const,
  
  // Participants
  participants: () => [...challengeKeys.all, 'participant'] as const,
  participant: (challengeId: string, userId: string) => 
    [...challengeKeys.participants(), challengeId, userId] as const,
  
  // Progress
  progress: (userId: string) => [...challengeKeys.all, 'progress', userId] as const,
  
  // Preferred challenge
  preferred: (userId: string) => [...challengeKeys.all, 'preferred', userId] as const,
  
  // Points/Leaderboard
  leaderboard: (challengeId: string) => [...challengeKeys.all, 'leaderboard', challengeId] as const,
};
