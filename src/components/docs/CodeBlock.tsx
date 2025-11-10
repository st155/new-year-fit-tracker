/**
 * Code Block Component
 * Syntax highlighted code display
 */

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

export function CodeBlock({ code, language = 'tsx', className }: CodeBlockProps) {
  return (
    <Card className={cn('bg-slate-950 text-slate-50 p-4 overflow-x-auto', className)}>
      <pre className="text-sm">
        <code className={`language-${language}`}>{code.trim()}</code>
      </pre>
    </Card>
  );
}
