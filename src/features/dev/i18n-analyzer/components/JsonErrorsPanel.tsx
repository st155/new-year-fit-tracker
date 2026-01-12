import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Copy, Check, FileWarning, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import type { JsonValidationError } from '../types';

interface JsonErrorsPanelProps {
  errors: JsonValidationError[];
  brokenNamespaces: string[];
}

export function JsonErrorsPanel({ errors, brokenNamespaces }: JsonErrorsPanelProps) {
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  if (errors.length === 0) {
    return null;
  }

  const copyPath = async (namespace: string, language: string) => {
    const path = `public/locales/${language}/${namespace}.json`;
    await navigator.clipboard.writeText(path);
    setCopiedPath(`${language}/${namespace}`);
    toast.success('Путь скопирован', { description: path });
    setTimeout(() => setCopiedPath(null), 2000);
  };

  // Group errors by namespace
  const errorsByNamespace = new Map<string, JsonValidationError[]>();
  for (const error of errors) {
    const existing = errorsByNamespace.get(error.namespace) || [];
    existing.push(error);
    errorsByNamespace.set(error.namespace, existing);
  }

  return (
    <div className="space-y-4 mb-6">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle className="font-semibold">
          {errors.length} синтаксических ошибок в JSON файлах!
        </AlertTitle>
        <AlertDescription>
          {brokenNamespaces.length} namespace(s) не загружаются: <strong>{brokenNamespaces.join(', ')}</strong>. 
          Все ключи из этих файлов показываются как есть.
        </AlertDescription>
      </Alert>

      <Card className="border-destructive/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-destructive">
            <FileWarning className="h-5 w-5" />
            JSON Validation Errors
            <Badge variant="destructive">{errors.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[600px] pr-4">
            <div className="space-y-4">
              {Array.from(errorsByNamespace.entries()).map(([namespace, nsErrors]) => (
                <div key={namespace} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{namespace}.json</h3>
                    <Badge variant="outline" className="text-xs">
                      {nsErrors.length} error(s)
                    </Badge>
                  </div>
                  
                  {nsErrors.map((error, idx) => {
                    const pathKey = `${error.language}/${error.namespace}`;
                    const isCopied = copiedPath === pathKey;
                    
                    return (
                      <Card 
                        key={`${error.namespace}-${error.language}-${idx}`}
                        className="border-destructive/30 bg-destructive/5"
                      >
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Badge variant={error.language === 'en' ? 'secondary' : 'default'}>
                                {error.language === 'en' ? '🇺🇸 EN' : '🇷🇺 RU'}
                              </Badge>
                              {error.line > 0 && (
                                <span className="text-sm text-muted-foreground">
                                  Line {error.line}, Column {error.column}
                                </span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2"
                              onClick={() => copyPath(error.namespace, error.language)}
                            >
                              {isCopied ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                              <span className="ml-1 text-xs">Copy path</span>
                            </Button>
                          </div>
                          
                          <div className="bg-muted/70 rounded-md p-3 overflow-x-auto">
                            <pre className="text-xs font-mono whitespace-pre text-foreground">
                              {error.preview}
                            </pre>
                          </div>
                          
                          <p className="text-sm text-destructive font-medium">
                            {error.message}
                          </p>
                          
                          <div className="text-xs text-muted-foreground">
                            <code className="bg-muted px-1 py-0.5 rounded">
                              public/locales/{error.language}/{error.namespace}.json
                            </code>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
