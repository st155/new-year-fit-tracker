/**
 * Component Section
 * Template for documenting a component variant/feature
 */

import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lightbulb } from 'lucide-react';
import { CodeBlock } from './CodeBlock';

interface ComponentSectionProps {
  title: string;
  description?: string;
  examples: Array<{
    label: string;
    component: ReactNode;
    props?: Record<string, any>;
  }>;
  code: string;
  bestPractices?: string[];
}

export function ComponentSection({
  title,
  description,
  examples,
  code,
  bestPractices,
}: ComponentSectionProps) {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Live Examples */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {examples.map((example, i) => (
            <div key={i} className="space-y-2">
              <Label className="text-sm font-medium">{example.label}</Label>
              <div className="p-4 border rounded-lg bg-muted/20 flex items-center justify-center min-h-[100px]">
                {example.component}
              </div>
            </div>
          ))}
        </div>

        {/* Code Example */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Code</Label>
          <CodeBlock code={code} language="tsx" />
        </div>

        {/* Best Practices */}
        {bestPractices && bestPractices.length > 0 && (
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertTitle>Best Practices</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1 mt-2">
                {bestPractices.map((practice, i) => (
                  <li key={i}>{practice}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
