import { AlertTriangle, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { LanguageIssue } from '../types';

interface LanguageIssuesPanelProps {
  issues: LanguageIssue[];
}

export function LanguageIssuesPanel({ issues }: LanguageIssuesPanelProps) {
  if (issues.length === 0) return null;

  // Group by namespace
  const groupedByNamespace = issues.reduce((acc, issue) => {
    if (!acc[issue.namespace]) {
      acc[issue.namespace] = [];
    }
    acc[issue.namespace].push(issue);
    return acc;
  }, {} as Record<string, LanguageIssue[]>);

  return (
    <Card className="border-orange-500/50 bg-orange-500/5 mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-orange-500">
          <Globe className="h-5 w-5" />
          Language Mismatches ({issues.length})
          <Badge variant="outline" className="ml-2 border-orange-500/50 text-orange-500">
            Cyrillic in EN files
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Found Russian text in English localization files. These should be translated to English.
        </p>
        <ScrollArea className="h-[300px]">
          <div className="space-y-4">
            {Object.entries(groupedByNamespace).map(([namespace, nsIssues]) => (
              <div key={namespace} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{namespace}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {nsIssues.length} issue{nsIssues.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="pl-4 space-y-1">
                  {nsIssues.map((issue, idx) => (
                    <div 
                      key={`${issue.key}-${idx}`}
                      className="flex items-start gap-2 text-sm p-2 rounded bg-background/50"
                    >
                      <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <code className="text-xs bg-muted px-1 py-0.5 rounded break-all">
                          {issue.key}
                        </code>
                        <p className="text-muted-foreground mt-1 break-all">
                          "{issue.value}"
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
