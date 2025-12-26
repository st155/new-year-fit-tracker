/**
 * Challenge Hooks
 * Re-exports all challenge hooks
 */

// Query keys
export { challengeKeys } from './keys';

// Query hooks
export {
  useChallengesQuery,
  useChallengeDetailQuery,
  useTrainerChallengesQuery,
  useParticipantQuery,
  useChallengeReportQuery,
  useChallengeProgressQuery,
  usePreferredChallengeQuery,
} from './queries';

// Mutation hooks
export { useChallengeMutations } from './mutations';
