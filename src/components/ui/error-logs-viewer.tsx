import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertTriangle, Bug, FileX, Wifi, Clock, ChevronDown, ChevronUp, Copy, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ErrorLog {
  id: string;
  error_type: string;
  error_message: string;
  error_details: any;
  source: string;
  stack_trace?: string;
  user_agent?: string;
  url?: string;
  created_at: string;
}

export function ErrorLogsViewer() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchErrorLogs();
    }
  }, [user, selectedSource]);

  const fetchErrorLogs = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('error_logs')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (selectedSource !== 'all') {
        query = query.eq('source', selectedSource);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить логи ошибок',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'whoop': return <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">W</div>;
      case 'apple_health': return <div className="w-4 h-4 bg-gray-800 rounded flex items-center justify-center text-white text-xs">🍎</div>;
      case 'garmin': return <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">G</div>;
      case 'file_upload': return <FileX className="w-4 h-4 text-orange-600" />;
      case 'api': return <Wifi className="w-4 h-4 text-purple-600" />;
      case 'ui': return <Bug className="w-4 h-4 text-yellow-600" />;
      default: return <AlertTriangle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getErrorTypeColor = (errorType: string) => {
    switch (errorType) {
      case 'integration_error': return 'destructive';
      case 'file_upload_error': return 'secondary';
      case 'api_error': return 'outline';
      case 'ui_error': return 'default';
      default: return 'secondary';
    }
  };

  const toggleExpanded = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Скопировано',
      description: 'Информация скопирована в буфер обмена'
    });
  };

  const exportLogs = () => {
    const filteredLogs = selectedSource === 'all' 
      ? logs 
      : logs.filter(log => log.source === selectedSource);
    
    const exportData = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-logs-${selectedSource}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const sources = Array.from(new Set(logs.map(log => log.source)));

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          Логи ошибок
        </CardTitle>
        <CardDescription>
          История ошибок и проблем с интеграциями
        </CardDescription>
        <div className="flex items-center gap-4">
          <Select value={selectedSource} onValueChange={setSelectedSource}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Источник" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все источники</SelectItem>
              {sources.map(source => (
                <SelectItem key={source} value={source}>
                  <div className="flex items-center gap-2">
                    {getSourceIcon(source)}
                    {source}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Экспорт
          </Button>
          <Button variant="outline" size="sm" onClick={fetchErrorLogs}>
            Обновить
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8">
            <Bug className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Нет ошибок</h3>
            <p className="text-muted-foreground">
              Отлично! Ошибок для выбранного фильтра не найдено.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {logs.map((log) => {
                const isExpanded = expandedLogs.has(log.id);
                return (
                  <Card key={log.id} className="border-l-4 border-l-destructive">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getSourceIcon(log.source)}
                            <Badge variant={getErrorTypeColor(log.error_type) as any}>
                              {log.error_type}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {log.source}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(log.created_at)}
                            </span>
                          </div>
                          <p className="text-sm font-medium mb-2">
                            {log.error_message}
                          </p>
                          {isExpanded && (
                            <div className="space-y-3 mt-3 pt-3 border-t">
                              {log.error_details && (
                                <div>
                                  <h4 className="text-xs font-medium text-muted-foreground mb-1">
                                    Детали ошибки:
                                  </h4>
                                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                    {JSON.stringify(log.error_details, null, 2)}
                                  </pre>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(JSON.stringify(log.error_details, null, 2))}
                                    className="mt-1"
                                  >
                                    <Copy className="h-3 w-3 mr-1" />
                                    Копировать
                                  </Button>
                                </div>
                              )}
                              {log.url && (
                                <div>
                                  <h4 className="text-xs font-medium text-muted-foreground mb-1">URL:</h4>
                                  <p className="text-xs font-mono bg-muted p-1 rounded">{log.url}</p>
                                </div>
                              )}
                              {log.user_agent && (
                                <div>
                                  <h4 className="text-xs font-medium text-muted-foreground mb-1">User Agent:</h4>
                                  <p className="text-xs text-muted-foreground">{log.user_agent}</p>
                                </div>
                              )}
                              {log.stack_trace && (
                                <div>
                                  <h4 className="text-xs font-medium text-muted-foreground mb-1">Stack Trace:</h4>
                                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-32">
                                    {log.stack_trace}
                                  </pre>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(log.stack_trace || '')}
                                    className="mt-1"
                                  >
                                    <Copy className="h-3 w-3 mr-1" />
                                    Копировать
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpanded(log.id)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}