import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Activity, 
  Moon, 
  Dumbbell, 
  Watch,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  AlertTriangle,
  User
} from "lucide-react";
import { TerraClientDiagnostics } from "./integrations/TerraClientDiagnostics";
import { WhoopDirectClientDiagnostics } from "./integrations/WhoopDirectClientDiagnostics";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface Client {
  client_id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  connected_sources: string[];
  last_activity_date?: string;
  days_since_last_data: number;
}

interface IntegrationsMonitorProps {
  clients: Client[];
  loading?: boolean;
}

export function IntegrationsMonitor({ clients, loading = false }: IntegrationsMonitorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const sources = ["whoop", "oura", "garmin", "withings"];

  const getSourceIcon = (source: string) => {
    switch (source.toLowerCase()) {
      case "whoop": return Activity;
      case "oura": return Moon;
      case "garmin": return Dumbbell;
      case "withings": return Watch;
      default: return Activity;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source.toLowerCase()) {
      case "whoop": return "text-orange-500";
      case "oura": return "text-purple-500";
      case "garmin": return "text-blue-500";
      case "withings": return "text-green-500";
      default: return "text-muted-foreground";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Statistics
  const stats = useMemo(() => {
    const totalClients = clients.length;
    const withIntegrations = clients.filter(c => c.connected_sources && c.connected_sources.length > 0).length;
    const staleData = clients.filter(c => c.days_since_last_data > 7).length;
    const activeToday = clients.filter(c => c.days_since_last_data === 0).length;

    const integrationCounts = sources.reduce((acc, source) => {
      acc[source] = clients.filter(c => 
        c.connected_sources?.some(s => s.toLowerCase() === source.toLowerCase())
      ).length;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalClients,
      withIntegrations,
      withoutIntegrations: totalClients - withIntegrations,
      staleData,
      activeToday,
      integrationCounts
    };
  }, [clients]);

  // Filtered clients
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      // Search filter
      const matchesSearch = searchQuery === "" || 
        client.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.username.toLowerCase().includes(searchQuery.toLowerCase());

      // Source filter
      const matchesSource = filterSource === "all" || 
        client.connected_sources?.some(s => s.toLowerCase() === filterSource.toLowerCase());

      // Status filter
      let matchesStatus = true;
      if (filterStatus === "connected") {
        matchesStatus = client.connected_sources && client.connected_sources.length > 0;
      } else if (filterStatus === "disconnected") {
        matchesStatus = !client.connected_sources || client.connected_sources.length === 0;
      } else if (filterStatus === "stale") {
        matchesStatus = client.days_since_last_data > 7;
      }

      return matchesSearch && matchesSource && matchesStatus;
    });
  }, [clients, searchQuery, filterSource, filterStatus]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/3" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Всего клиентов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClients}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.withIntegrations} с интеграциями
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Активны сегодня</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeToday}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((stats.activeToday / stats.totalClients) * 100)}% клиентов
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Устаревшие данные</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.staleData}</div>
            <p className="text-xs text-muted-foreground mt-1">
              &gt;7 дней без данных
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Без интеграций</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{stats.withoutIntegrations}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Требуют настройки
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Integration Sources Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Статистика по источникам</CardTitle>
          <CardDescription>Количество подключений к каждому устройству</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {sources.map(source => {
              const SourceIcon = getSourceIcon(source);
              const count = stats.integrationCounts[source] || 0;
              const percentage = stats.totalClients > 0 
                ? Math.round((count / stats.totalClients) * 100) 
                : 0;

              return (
                <div key={source} className="flex items-center gap-3 p-3 border rounded-lg">
                  <SourceIcon className={`h-8 w-8 ${getSourceColor(source)}`} />
                  <div className="flex-1">
                    <p className="font-semibold capitalize">{source}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold">{count}</span>
                      <span className="text-xs text-muted-foreground">({percentage}%)</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Мониторинг подключений</CardTitle>
          <CardDescription>Отслеживайте статус интеграций ваших клиентов</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по имени или username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все источники</SelectItem>
                <SelectItem value="whoop">Whoop</SelectItem>
                <SelectItem value="oura">Oura</SelectItem>
                <SelectItem value="garmin">Garmin</SelectItem>
                <SelectItem value="withings">Withings</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="connected">Подключено</SelectItem>
                <SelectItem value="disconnected">Не подключено</SelectItem>
                <SelectItem value="stale">Устаревшие данные</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clients Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Клиент</TableHead>
                  <TableHead>Whoop</TableHead>
                  <TableHead>Oura</TableHead>
                  <TableHead>Garmin</TableHead>
                  <TableHead>Withings</TableHead>
                  <TableHead>Последняя активность</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="w-[80px]">Terra</TableHead>
                  <TableHead className="w-[80px]">Whoop Direct</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Клиенты не найдены
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map(client => {
                    const connectedSources = client.connected_sources || [];
                    const isStale = client.days_since_last_data > 7;

                    return (
                      <TableRow key={client.client_id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={client.avatar_url} />
                              <AvatarFallback>
                                <User className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{client.full_name}</p>
                              <p className="text-xs text-muted-foreground">@{client.username}</p>
                            </div>
                          </div>
                        </TableCell>

                        {sources.map(source => {
                          const isConnected = connectedSources.some(
                            s => s.toLowerCase() === source.toLowerCase()
                          );

                          return (
                            <TableCell key={source}>
                              {isConnected ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : (
                                <XCircle className="h-5 w-5 text-muted-foreground/30" />
                              )}
                            </TableCell>
                          );
                        })}

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {client.last_activity_date ? (
                                formatDistanceToNow(new Date(client.last_activity_date), {
                                  addSuffix: true,
                                  locale: ru
                                })
                              ) : (
                                "Нет данных"
                              )}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          {isStale ? (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Устарело
                            </Badge>
                          ) : connectedSources.length === 0 ? (
                            <Badge variant="outline" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              Не подключено
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Активно
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell>
                          <TerraClientDiagnostics 
                            clientId={client.client_id} 
                            clientName={client.full_name}
                          />
                        </TableCell>

                        <TableCell>
                          <WhoopDirectClientDiagnostics 
                            clientId={client.client_id} 
                            clientName={client.full_name}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {filteredClients.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground text-center">
              Показано {filteredClients.length} из {clients.length} клиентов
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}