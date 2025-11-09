import { useEffect, useState } from 'react';
import { useChallenges } from './useChallenges';

const STORAGE_KEY = 'preferred_challenge_id';

interface PreferredChallenge {
  challengeId: string | null;
  title: string | null;
  challenges: any[];
  isLoading: boolean;
  setPreferredChallenge: (challengeId: string) => void;
}

/**
 * Hook to manage preferred challenge selection with "Six Pack" priority
 */
export function usePreferredChallenge(userId?: string): PreferredChallenge {
  const { challenges, isLoading } = useChallenges(userId);
  const [preferredChallengeId, setPreferredChallengeId] = useState<string | null>(null);

  useEffect(() => {
    // Wait for challenges to load before determining preferred challenge
    if (isLoading) {
      console.log('[usePreferredChallenge] Still loading challenges...');
      return;
    }

    if (!challenges || challenges.length === 0 || !userId) {
      console.log('[usePreferredChallenge] No challenges available');
      setPreferredChallengeId(null);
      return;
    }

    // Get user's participated challenges
    const userChallenges = challenges.filter(c => c.isParticipant);
    
    if (userChallenges.length === 0) {
      console.log('[usePreferredChallenge] User not participating in any challenges');
      setPreferredChallengeId(null);
      return;
    }

    // Check localStorage for saved preference
    const savedId = localStorage.getItem(STORAGE_KEY);
    if (savedId && userChallenges.some(c => c.id === savedId)) {
      console.log('[usePreferredChallenge] Using saved preference:', savedId);
      setPreferredChallengeId(savedId);
      return;
    }

    // Priority 1: Find "Six Pack" challenge (case-insensitive, flexible matching)
    const sixPackChallenge = userChallenges.find(c => 
      c.title && (
        c.title.toLowerCase().includes('six pack') ||
        c.title.toLowerCase().includes('six-pack') ||
        c.title.toLowerCase().includes('sixpack')
      )
    );

    if (sixPackChallenge) {
      console.log('[usePreferredChallenge] Found Six Pack challenge:', sixPackChallenge.title);
      setPreferredChallengeId(sixPackChallenge.id);
      localStorage.setItem(STORAGE_KEY, sixPackChallenge.id);
      return;
    }

    // Priority 2: Use most recently joined challenge
    const latestChallenge = userChallenges[0]; // Already sorted by start_date desc
    console.log('[usePreferredChallenge] Using latest challenge:', latestChallenge.title);
    setPreferredChallengeId(latestChallenge.id);
    localStorage.setItem(STORAGE_KEY, latestChallenge.id);
  }, [challenges, userId, isLoading]);

  const setPreferred = (challengeId: string) => {
    console.log('[usePreferredChallenge] Manually setting preferred challenge:', challengeId);
    setPreferredChallengeId(challengeId);
    localStorage.setItem(STORAGE_KEY, challengeId);
  };

  const preferredChallenge = challenges?.find(c => c.id === preferredChallengeId);

  return {
    challengeId: preferredChallengeId,
    title: preferredChallenge?.title || null,
    challenges: challenges || [],
    isLoading,
    setPreferredChallenge: setPreferred,
  };
}
