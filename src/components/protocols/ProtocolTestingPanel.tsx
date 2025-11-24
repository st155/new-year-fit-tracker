import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRunProtocolTests, useCleanProtocolTests } from '@/hooks/useProtocolTests';
import { useRunLifecycleTests } from '@/hooks/useProtocolLifecycleTests';
import { Loader2, Play, Trash2, FlaskConical } from 'lucide-react';

export function ProtocolTestingPanel() {
  const runTests = useRunProtocolTests();
  const cleanTests = useCleanProtocolTests();
  const lifecycleTests = useRunLifecycleTests();

  return (
    <Card className="p-6 border-2 border-dashed border-yellow-500/30 bg-background/50">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            🧪 Protocol Testing Console
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Automated end-to-end testing for protocol completion system
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => runTests.mutate()}
              disabled={runTests.isPending}
              className="flex-1"
              variant="default"
            >
              {runTests.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Run Data Tests
                </>
              )}
            </Button>

            <Button
              onClick={() => cleanTests.mutate()}
              disabled={cleanTests.isPending}
              className="flex-1"
              variant="outline"
            >
              {cleanTests.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cleaning...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clean Test Data
                </>
              )}
            </Button>
          </div>

          <Button
            onClick={() => lifecycleTests.mutate()}
            disabled={lifecycleTests.isPending}
            className="w-full"
            variant="secondary"
          >
            {lifecycleTests.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Lifecycle Tests...
              </>
            ) : (
              <>
                <FlaskConical className="mr-2 h-4 w-4" />
                🧬 Run Advanced Tests (Triggers + Edge Cases + RLS)
              </>
            )}
          </Button>
        </div>

        <div className="space-y-2">
          <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-md">
            <p className="font-semibold flex items-center gap-2">
              <Play className="h-3 w-3" />
              Data Tests:
            </p>
            <ul className="list-disc list-inside space-y-0.5 ml-2 mt-1">
              <li>Creates 4 test protocols with different completion stages</li>
              <li>Triggers check-completed-protocols edge function</li>
              <li>Verifies alerts and status updates</li>
            </ul>
          </div>

          <div className="text-xs text-muted-foreground p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
            <p className="font-semibold flex items-center gap-2">
              <FlaskConical className="h-3 w-3" />
              Advanced Lifecycle Tests:
            </p>
            <ul className="list-disc list-inside space-y-0.5 ml-2 mt-1">
              <li>✅ Database trigger validation (auto_update_protocol_status)</li>
              <li>✅ Edge cases (no planned_end_date, duplicate runs)</li>
              <li>✅ RLS security policies (user isolation)</li>
              <li>✅ Idempotency checks (no duplicate alerts)</li>
              <li>🎯 Check browser console for detailed pass/fail results</li>
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
}
