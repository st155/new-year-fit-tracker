import { useState, useEffect } from 'react';
import TrainingPlan from '@/components/workout/TrainingPlan';
import ShortcutsPanel from '@/components/workout/ShortcutsPanel';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export default function WorkoutPlan() {
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Global keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: '?',
      shift: true,
      action: () => setShowShortcuts(true),
      description: 'Show keyboard shortcuts'
    },
    {
      key: 'Escape',
      action: () => setShowShortcuts(false),
      description: 'Close shortcuts panel'
    }
  ]);

  return (
    <>
      <TrainingPlan />
      <ShortcutsPanel open={showShortcuts} onOpenChange={setShowShortcuts} />
    </>
  );
}
