/**
 * Services barrel export
 * Re-exports from feature modules for convenience
 */

// Local services
export * from './habits.service';
export * from './biostack.service';

// Feature services (re-export for convenience)
export * as GoalsService from '@/features/goals/services/goals.service';
export * as challengesService from '@/features/challenges/services/challenges.service';
