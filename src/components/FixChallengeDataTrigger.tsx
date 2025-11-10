import { useEffect, useState } from "react";
import { useFixChallengeData } from "@/hooks/useFixChallengeData";
import { Loader2 } from "lucide-react";

const FIX_KEY = 'challenge_data_fix_2025_11_10';

export const FixChallengeDataTrigger = () => {
  const [executed, setExecuted] = useState(() => {
    // Check if fix was already executed
    return localStorage.getItem(FIX_KEY) === 'completed';
  });
  const { mutate, isPending, isSuccess } = useFixChallengeData();

  useEffect(() => {
    // Execute only once if not already done
    if (!executed && !isPending) {
      console.log('🔧 Executing one-time data fix...');
      mutate(undefined, {
        onSuccess: () => {
          localStorage.setItem(FIX_KEY, 'completed');
          setExecuted(true);
          console.log('✅ Data fix completed and marked in localStorage');
        }
      });
    }
  }, [executed, isPending, mutate]);

  if (isPending) {
    return (
      <div className="fixed bottom-4 right-4 bg-background border border-border rounded-lg p-4 shadow-lg z-50">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Исправление данных...</span>
        </div>
      </div>
    );
  }

  return null;
};
