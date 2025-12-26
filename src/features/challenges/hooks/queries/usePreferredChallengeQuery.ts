/**
 * Preferred Challenge Query Hook
 * Gets the user's currently preferred/active challenge with full challenge list
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { challengeKeys } from '../keys';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'preferred_challenge_id';

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  isParticipant: boolean;
}

async function getChallengesForUser(userId: string) {
  // Get all active challenges where user is a participant
  const { data: participations, error: partError } = await supabase
    .from('challenge_participants')
    .select(`
      challenge_id,
      joined_at,
      challenges (
        id,
        title,
        description,
        start_date,
        end_date,
        is_active
      )
    `)
    .eq('user_id', userId);

  if (partError) throw partError;

  // Map to challenges, filtering active ones and adding isParticipant
  const challenges = participations
    ?.map(p => ({ ...(p.challenges as unknown as Omit<Challenge, 'isParticipant'>), isParticipant: true }))
    .filter(c => c && c.is_active) || [];

  return challenges as Challenge[];
}

export function usePreferredChallengeQuery(userId?: string) {
  const [preferredChallengeId, setPreferredChallengeId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY);
    }
    return null;
  });

  const { data: challenges = [], isLoading, error, refetch } = useQuery({
    queryKey: challengeKeys.list(userId || ''),
    queryFn: () => getChallengesForUser(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Auto-select preferred challenge
  useEffect(() => {
    if (challenges.length === 0) return;

    // If we have a stored preference and it's valid, keep it
    if (preferredChallengeId) {
      const found = challenges.find(c => c.id === preferredChallengeId);
      if (found) return;
    }

    // Prioritize "Six Pack" challenge
    const sixPackChallenge = challenges.find(c => 
      c.title.toLowerCase().includes('six pack')
    );
    if (sixPackChallenge) {
      setPreferredChallengeId(sixPackChallenge.id);
      localStorage.setItem(STORAGE_KEY, sixPackChallenge.id);
      return;
    }

    // Default to first challenge
    if (challenges.length > 0) {
      setPreferredChallengeId(challenges[0].id);
      localStorage.setItem(STORAGE_KEY, challenges[0].id);
    }
  }, [challenges, preferredChallengeId]);

  const setPreferredChallenge = useCallback((challengeId: string) => {
    setPreferredChallengeId(challengeId);
    localStorage.setItem(STORAGE_KEY, challengeId);
  }, []);

  return {
    challengeId: preferredChallengeId,
    title: challenges.find(c => c.id === preferredChallengeId)?.title || null,
    challenges,
    isLoading,
    error,
    refetch,
    setPreferredChallenge,
  };
}
