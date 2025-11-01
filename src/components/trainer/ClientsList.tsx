import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, User, Target, Calendar, ArrowUpDown, Filter, Activity, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TrainerClientCard } from "./ui/TrainerClientCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

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
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'activity'>('name');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

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

  // Filter and sort clients
  let filteredClients = [...clients];

  // Apply activity filter
  if (filterActive !== 'all') {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    filteredClients = filteredClients.filter(client => {
      const isActive = client.last_measurement && new Date(client.last_measurement) > weekAgo;
      return filterActive === 'active' ? isActive : !isActive;
    });
  }

  // Sort clients
  filteredClients.sort((a, b) => {
    if (sortBy === 'name') {
      return a.full_name.localeCompare(b.full_name);
    } else if (sortBy === 'date') {
      return new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime();
    } else if (sortBy === 'activity') {
      const aDate = a.last_measurement ? new Date(a.last_measurement).getTime() : 0;
      const bDate = b.last_measurement ? new Date(b.last_measurement).getTime() : 0;
      return bDate - aDate;
    }
    return 0;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Мои подопечные ({clients.length})</h2>
          
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

        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">По имени</SelectItem>
              <SelectItem value="date">По дате добавления</SelectItem>
              <SelectItem value="activity">По активности</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterActive} onValueChange={(value: any) => setFilterActive(value)}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все клиенты</SelectItem>
              <SelectItem value="active">Активные (&lt; 7 дней)</SelectItem>
              <SelectItem value="inactive">Неактивные (&gt; 7 дней)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-muted rounded-full" />
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-24" />
                    <div className="h-3 bg-muted rounded w-16" />
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : filteredClients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">
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
            const isActive = client.last_activity_date && 
              new Date(client.last_activity_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            
            const metrics = [];
            if (client.weight_latest) {
              metrics.push({
                name: 'Weight',
                value: Math.round(client.weight_latest),
                unit: 'kg',
                icon: <Target className="h-4 w-4" />,
                color: 'blue' as const
              });
            }
            if (client.whoop_recovery_avg) {
              metrics.push({
                name: 'Recovery',
                value: Math.round(client.whoop_recovery_avg),
                unit: '%',
                icon: <Activity className="h-4 w-4" />,
                color: 'green' as const
              });
            }
            if (client.recent_measurements_count) {
              metrics.push({
                name: 'Measurements',
                value: client.recent_measurements_count,
                unit: '',
                icon: <TrendingUp className="h-4 w-4" />,
                color: 'purple' as const
              });
            }
            
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
                onViewDetails={() => onSelectClient(client)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
