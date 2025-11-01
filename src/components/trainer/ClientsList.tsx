import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Plus, 
  Search, 
  User, 
  Target, 
  ArrowUpDown, 
  Filter, 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  Moon, 
  Heart, 
  Dumbbell
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TrainerClientCard } from "./ui/TrainerClientCard";
import { TrainerStatCard } from "./ui/TrainerStatCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Client {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  assigned_at: string;
  active: boolean;
  goals_count?: number;
  last_measurement?: string;
}

interface ClientsListProps {
  clients: Client[];
  onSelectClient: (client: Client) => void;
  onAddClient: (clientUserId: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

export function ClientsList({ clients, onSelectClient, onAddClient, onRefresh, loading }: ClientsListProps) {
  const [searchEmail, setSearchEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [foundUsers, setFoundUsers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'activity'>('activity');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive' | 'at_risk' | 'high_performers' | 'new'>('all');
  const [groupBy, setGroupBy] = useState<'none' | 'health_score' | 'challenges' | 'activity'>('none');

  const loadAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, username, full_name, avatar_url')
        .order('username');

      if (error) throw error;

      const existingClientIds = clients.map(c => c.user_id);
      const availableUsers = profiles?.filter(p => !existingClientIds.includes(p.user_id)) || [];

      setAllUsers(availableUsers);
      setShowAllUsers(true);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast.error('Ошибка загрузки пользователей');
    } finally {
      setLoadingUsers(false);
    }
  };

  const searchUsers = async () => {
    if (!searchEmail.trim()) {
      setFoundUsers([]);
      return;
    }

    setSearching(true);
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, username, full_name, avatar_url')
        .ilike('username', `%${searchEmail}%`);

      if (error) throw error;

      const existingClientIds = clients.map(c => c.user_id);
      const availableUsers = profiles?.filter(p => !existingClientIds.includes(p.user_id)) || [];

      setFoundUsers(availableUsers);
      setShowAllUsers(false);
    } catch (error: any) {
      console.error('Error searching users:', error);
      toast.error('Ошибка поиска пользователей');
    } finally {
      setSearching(false);
    }
  };

  const handleAddClient = async (user: any) => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (user.user_id === currentUser?.id) {
        toast.error('Вы не можете добавить себя как клиента');
        return;
      }

      setIsAdding(true);
      await onAddClient(user.user_id);
      toast.success(`${user.username || user.full_name} добавлен как клиент`);
      
      setFoundUsers([]);
      setAllUsers([]);
      setSearchEmail("");
      setShowAllUsers(false);
    } catch (error: any) {
      console.error('Error adding client:', error);
      toast.error(error.message || 'Ошибка при добавлении клиента');
    } finally {
      setIsAdding(false);
    }
  };

  const resetSearch = () => {
    setSearchEmail("");
    setFoundUsers([]);
    setShowAllUsers(false);
  };

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const totalClients = clients.length;
    const activeClients = clients.filter(c => {
      const lastActivity = c.last_measurement ? new Date(c.last_measurement) : null;
      const daysSince = lastActivity ? Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)) : 999;
      return daysSince <= 7;
    }).length;
    
    const clientsAtRisk = clients.filter(c => {
      const lastActivity = c.last_measurement ? new Date(c.last_measurement) : null;
      const daysSince = lastActivity ? Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)) : 999;
      const clientEnhanced = c as any;
      return daysSince > 7 || clientEnhanced.low_recovery_alert || clientEnhanced.poor_sleep_alert || clientEnhanced.has_overdue_tasks;
    }).length;
    
    const avgHealthScore = clients.length > 0 
      ? Math.round(clients.reduce((sum, c) => sum + ((c as any).health_score || 0), 0) / clients.length)
      : 0;
    
    return {
      totalClients,
      activeClients,
      clientsAtRisk,
      avgHealthScore
    };
  }, [clients]);

  // Filter and sort clients
  const filteredClients = useMemo(() => {
    return clients
      .filter(client => {
        const lastActivity = client.last_measurement ? new Date(client.last_measurement) : null;
        const daysSince = lastActivity ? Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)) : 999;
        const healthScore = (client as any).health_score || 0;
        const assignedDate = new Date(client.assigned_at);
        const daysSinceAssigned = Math.floor((Date.now() - assignedDate.getTime()) / (1000 * 60 * 60 * 24));
        const clientEnhanced = client as any;
        
        if (filterActive === 'active') return daysSince <= 7;
        if (filterActive === 'inactive') return daysSince > 7;
        if (filterActive === 'at_risk') {
          return daysSince > 7 || clientEnhanced.low_recovery_alert || clientEnhanced.poor_sleep_alert || clientEnhanced.has_overdue_tasks;
        }
        if (filterActive === 'high_performers') return healthScore >= 80;
        if (filterActive === 'new') return daysSinceAssigned <= 30;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return a.full_name.localeCompare(b.full_name);
        } else if (sortBy === 'date') {
          return new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime();
        } else {
          // Sort by activity (last_measurement date)
          const aDate = a.last_measurement ? new Date(a.last_measurement).getTime() : 0;
          const bDate = b.last_measurement ? new Date(b.last_measurement).getTime() : 0;
          return bDate - aDate;
        }
      });
  }, [clients, filterActive, sortBy]);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <TrainerStatCard
          title="Всего подопечных"
          value={summaryStats.totalClients}
          icon={<Users className="h-6 w-6" />}
          color="blue"
        />
        <TrainerStatCard
          title="Активных (7д)"
          value={summaryStats.activeClients}
          icon={<Activity className="h-6 w-6" />}
          color="green"
          subtitle={`${Math.round((summaryStats.activeClients / (summaryStats.totalClients || 1)) * 100)}% клиентов`}
        />
        <TrainerStatCard
          title="Требуют внимания"
          value={summaryStats.clientsAtRisk}
          icon={<AlertTriangle className="h-6 w-6" />}
          color="orange"
        />
        <TrainerStatCard
          title="Средний Health Score"
          value={`${summaryStats.avgHealthScore}%`}
          icon={<TrendingUp className="h-6 w-6" />}
          color="purple"
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Список клиентов</h2>
          <p className="text-muted-foreground">
            {filteredClients.length} из {clients.length} клиентов
          </p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Добавить подопечного
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Добавить нового подопечного</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Поиск по email или имени..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                />
                <Button onClick={searchUsers} disabled={searching}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={loadAllUsers} 
                  disabled={loadingUsers}
                  className="flex-1"
                >
                  {loadingUsers ? "Загрузка..." : "Показать всех пользователей"}
                </Button>
                {(foundUsers.length > 0 || showAllUsers) && (
                  <Button variant="outline" onClick={resetSearch}>
                    Сбросить
                  </Button>
                )}
              </div>

              {foundUsers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Результаты поиска ({foundUsers.length}):
                  </p>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {foundUsers.map((user) => (
                      <div key={user.user_id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback>
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.full_name || user.username}</p>
                            <p className="text-sm text-muted-foreground">{user.username}</p>
                          </div>
                        </div>
                        <Button size="sm" onClick={() => handleAddClient(user)} disabled={isAdding}>
                          {isAdding ? "Добавление..." : "Добавить"}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showAllUsers && allUsers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Все доступные пользователи ({allUsers.length}):
                  </p>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {allUsers.map((user) => (
                      <div key={user.user_id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback>
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.full_name || user.username}</p>
                            <p className="text-sm text-muted-foreground">{user.username}</p>
                          </div>
                        </div>
                        <Button size="sm" onClick={() => handleAddClient(user)} disabled={isAdding}>
                          {isAdding ? "Добавление..." : "Добавить"}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!loadingUsers && !searching && searchEmail && foundUsers.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    Пользователи не найдены
                  </p>
                </div>
              )}

              {showAllUsers && allUsers.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    Все пользователи уже добавлены как подопечные
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <ArrowUpDown className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="activity">По активности</SelectItem>
            <SelectItem value="name">По имени</SelectItem>
            <SelectItem value="date">По дате добавления</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={filterActive} onValueChange={(value: any) => setFilterActive(value)}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все клиенты</SelectItem>
            <SelectItem value="active">Активные (&lt; 7 дней)</SelectItem>
            <SelectItem value="inactive">Неактивные (&gt; 7 дней)</SelectItem>
            <SelectItem value="at_risk">⚠️ Требуют внимания</SelectItem>
            <SelectItem value="high_performers">⭐ Лучшие результаты</SelectItem>
            <SelectItem value="new">🆕 Новые (&lt; 30 дней)</SelectItem>
          </SelectContent>
        </Select>

        <Select value={groupBy} onValueChange={(value: any) => setGroupBy(value)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Группировка" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Без группировки</SelectItem>
            <SelectItem value="health_score">По Health Score</SelectItem>
            <SelectItem value="challenges">По челленджам</SelectItem>
            <SelectItem value="activity">По активности</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Client Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse h-48" />
          ))}
        </div>
      ) : filteredClients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {clients.length === 0 ? 'Нет подопечных' : 'Нет результатов'}
            </h3>
            <p className="text-muted-foreground text-center">
              {clients.length === 0 
                ? 'Добавьте первого подопечного, чтобы начать отслеживать их прогресс'
                : 'Попробуйте изменить фильтры'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client: any) => {
            const healthScore = client.health_score || 0;
            const daysSinceData = client.days_since_last_data || 999;
            const isActive = daysSinceData <= 7;
            
            const metrics = [
              { 
                name: 'Измерений', 
                value: client.recent_measurements_count || 0,
                trend: client.measurements_trend,
                icon: <Dumbbell className="h-3 w-3" />, 
                color: 'blue' as const
              },
              client.sleep_hours_avg && {
                name: 'Сон',
                value: client.sleep_hours_avg.toFixed(1),
                unit: 'ч',
                trend: client.sleep_trend,
                alert: client.poor_sleep_alert,
                icon: <Moon className="h-3 w-3" />,
                color: 'purple' as const
              },
              client.whoop_recovery_avg && {
                name: 'Recovery',
                value: Math.round(client.whoop_recovery_avg),
                unit: '%',
                trend: client.recovery_trend,
                alert: client.low_recovery_alert,
                icon: <Heart className="h-3 w-3" />,
                color: 'green' as const
              },
            ].filter(Boolean) as any[];

            const hasAlerts = client.low_recovery_alert || client.poor_sleep_alert || daysSinceData > 7;
            
            return (
              <TrainerClientCard
                key={client.id}
                client={{
                  id: client.id,
                  username: client.username,
                  full_name: client.full_name,
                  avatar_url: client.avatar_url,
                  goals_count: client.active_goals_count
                }}
                healthScore={healthScore}
                metrics={metrics}
                isActive={isActive}
                lastActivity={client.last_activity_date ? 
                  `Активность: ${new Date(client.last_activity_date).toLocaleDateString('ru-RU')}` : 
                  'Нет активности'
                }
                goalsOnTrack={client.goals_on_track || 0}
                goalsAtRisk={client.goals_at_risk || 0}
                activeChallenges={client.active_challenges_count || 0}
                hasAlerts={hasAlerts}
                hasOverdueTasks={client.has_overdue_tasks || false}
                topGoals={client.top_3_goals || []}
                onViewDetails={() => onSelectClient(client)}
                onAskAI={() => onSelectClient(client)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
