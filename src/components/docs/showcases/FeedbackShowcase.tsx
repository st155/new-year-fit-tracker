/**
 * Feedback Components Showcase
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { Spinner, InlineLoading, CardSkeleton } from '@/components/ui/loading-states';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export function FeedbackShowcase() {
  const [progress, setProgress] = useState(33);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Feedback Components</h2>
        <p className="text-muted-foreground">Toasts, alerts, loading states, and progress indicators</p>
      </div>

      {/* Toast Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Toast Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => toast.success('Success!', { description: 'Operation completed successfully' })}>
              Success Toast
            </Button>
            <Button variant="destructive" onClick={() => toast.error('Error!', { description: 'Something went wrong' })}>
              Error Toast
            </Button>
            <Button variant="secondary" onClick={() => toast.warning('Warning!', { description: 'Please be careful' })}>
              Warning Toast
            </Button>
            <Button variant="outline" onClick={() => toast.info('Info', { description: 'Here is some information' })}>
              Info Toast
            </Button>
            <Button onClick={() => toast.loading('Loading...', { description: 'Please wait' })}>
              Loading Toast
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alert Variants */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Variants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Info</AlertTitle>
            <AlertDescription>
              This is an informational alert with some helpful content.
            </AlertDescription>
          </Alert>

          <Alert variant="default" className="border-success bg-success/10">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <AlertTitle className="text-success">Success</AlertTitle>
            <AlertDescription className="text-success/80">
              Your changes have been saved successfully.
            </AlertDescription>
          </Alert>

          <Alert variant="default" className="border-warning bg-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertTitle className="text-warning">Warning</AlertTitle>
            <AlertDescription className="text-warning/80">
              Please review your input before continuing.
            </AlertDescription>
          </Alert>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              An error occurred while processing your request.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Loading States */}
      <Card>
        <CardHeader>
          <CardTitle>Loading States</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Spinners */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Spinners</h3>
            <div className="flex items-center gap-6">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Small</p>
                <Spinner size="sm" />
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Medium</p>
                <Spinner size="md" />
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Large</p>
                <Spinner size="lg" />
              </div>
            </div>
          </div>

          {/* Inline Loading */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Inline Loading</h3>
            <div className="space-y-3">
              <InlineLoading text="Loading data..." size="sm" />
              <InlineLoading text="Processing..." size="md" />
            </div>
          </div>

          {/* Button Loading States */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Button Loading States</h3>
            <div className="flex gap-3">
              <Button disabled>
                <Spinner size="sm" className="mr-2" />
                Loading...
              </Button>
              <Button variant="secondary" disabled>
                <Spinner size="sm" className="mr-2" />
                Saving...
              </Button>
            </div>
          </div>

          {/* Skeleton */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Skeleton Loader</h3>
            <CardSkeleton />
          </div>
        </CardContent>
      </Card>

      {/* Progress Indicators */}
      <Card>
        <CardHeader>
          <CardTitle>Progress Indicators</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span className="text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setProgress(Math.max(0, progress - 10))}>
                Decrease
              </Button>
              <Button size="sm" onClick={() => setProgress(Math.min(100, progress + 10))}>
                Increase
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Color variants</p>
            <Progress value={75} className="[&>div]:bg-success" />
            <Progress value={50} className="[&>div]:bg-warning" />
            <Progress value={25} className="[&>div]:bg-destructive" />
          </div>
        </CardContent>
      </Card>

      {/* Badges */}
      <Card>
        <CardHeader>
          <CardTitle>Status Badges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge className="bg-success text-success-foreground">Success</Badge>
            <Badge className="bg-warning text-warning-foreground">Warning</Badge>
            <Badge className="bg-info text-info-foreground">Info</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}