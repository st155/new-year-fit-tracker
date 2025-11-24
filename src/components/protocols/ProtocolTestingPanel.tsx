import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRunProtocolTests, useCleanProtocolTests } from '@/hooks/useProtocolTests';
import { Loader2, Play, Trash2 } from 'lucide-react';

export function ProtocolTestingPanel() {
  const runTests = useRunProtocolTests();
  const cleanTests = useCleanProtocolTests();

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
                Run Automated Tests
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

        <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/30 rounded-md">
          <p className="font-semibold">Test creates:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>4 test protocols with different completion stages</li>
            <li>Triggers check-completed-protocols edge function</li>
            <li>Verifies alerts and status updates</li>
            <li>Check browser console for detailed results</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}
