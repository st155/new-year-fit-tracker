import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight, Copy, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { SyncIssue, FilterState } from '../types';

interface SyncIssuesPanelProps {
  issues: SyncIssue[];
  filters: FilterState;
}

export function SyncIssuesPanel({ issues, filters }: SyncIssuesPanelProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [openNamespaces, setOpenNamespaces] = useState<Set<string>>(new Set());

  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      if (filters.namespace && issue.namespace !== filters.namespace) return false;
      if (filters.missingIn !== 'all' && issue.missingIn !== filters.missingIn) return false;
      if (filters.searchQuery && !issue.key.toLowerCase().includes(filters.searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [issues, filters]);

  const groupedByNamespace = useMemo(() => {
    const grouped = new Map<string, SyncIssue[]>();
    for (const issue of filteredIssues) {
      const existing = grouped.get(issue.namespace) || [];
      existing.push(issue);
      grouped.set(issue.namespace, existing);
    }
    return Array.from(grouped.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [filteredIssues]);

  const copyToClipboard = async (namespace: string, key: string) => {
    const code = `t('${namespace}:${key}')`;
    await navigator.clipboard.writeText(code);
    setCopiedKey(`${namespace}:${key}`);
    toast.success('Скопировано!', { description: code });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleNamespace = (namespace: string) => {
    const newOpen = new Set(openNamespaces);
    if (newOpen.has(namespace)) {
      newOpen.delete(namespace);
    } else {
      newOpen.add(namespace);
    }
    setOpenNamespaces(newOpen);
  };

  if (filteredIssues.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
          <div className="text-center">
            <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <p>Проблем синхронизации не найдено</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Рассинхронизация EN/RU
          <Badge variant="secondary">{filteredIssues.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-2">
            {groupedByNamespace.map(([namespace, nsIssues]) => (
              <Collapsible 
                key={namespace} 
                open={openNamespaces.has(namespace)}
                onOpenChange={() => toggleNamespace(namespace)}
              >
                <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 hover:bg-accent rounded-lg transition-colors">
                  <ChevronRight className={`h-4 w-4 transition-transform ${openNamespaces.has(namespace) ? 'rotate-90' : ''}`} />
                  <span className="font-medium text-foreground">{namespace}.json</span>
                  <div className="ml-auto flex gap-2">
                    <Badge variant="outline" className="text-xs">
                      🇺🇸 {nsIssues.filter(i => i.missingIn === 'en').length}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      🇷🇺 {nsIssues.filter(i => i.missingIn === 'ru').length}
                    </Badge>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-6 border-l-2 border-border pl-4 py-2 space-y-1">
                    {nsIssues.map(issue => {
                      const fullKey = `${namespace}:${issue.key}`;
                      const isCopied = copiedKey === fullKey;
                      
                      return (
                        <div 
                          key={issue.key} 
                          className="flex items-center gap-2 py-1.5 px-2 hover:bg-muted/50 rounded group"
                        >
                          <Badge 
                            variant={issue.missingIn === 'en' ? 'destructive' : 'secondary'}
                            className="text-xs shrink-0"
                          >
                            {issue.missingIn === 'en' ? '🇺🇸 EN' : '🇷🇺 RU'}
                          </Badge>
                          <code className="text-sm text-muted-foreground flex-1 truncate">
                            {issue.key}
                          </code>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => copyToClipboard(namespace, issue.key)}
                          >
                            {isCopied ? (
                              <Check className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
