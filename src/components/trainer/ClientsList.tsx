import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, User, Target, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

  const searchUsers = async () => {
    if (!searchEmail.trim()) return;

    setSearching(true);
    try {
      // Ищем пользователей по email через auth.users (только админы могут это делать)
      // Поэтому ищем через profiles
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, username, full_name, avatar_url')
        .ilike('username', `%${searchEmail}%`);

      if (error) throw error;

      // Фильтруем тех, кто уже не является подопечным
      const existingClientIds = clients.map(c => c.user_id);
      const availableUsers = profiles?.filter(p => !existingClientIds.includes(p.user_id)) || [];

      setFoundUsers(availableUsers);
    } catch (error: any) {
      console.error('Error searching users:', error);
      toast.error('Ошибка поиска пользователей');
    } finally {
      setSearching(false);
    }
  };

  const handleAddClient = async (user: any) => {
    await onAddClient(user.user_id);
    setFoundUsers([]);
    setSearchEmail("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Мои подопечные</h2>
        
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
                  placeholder="Введите email или имя пользователя..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                />
                <Button onClick={searchUsers} disabled={searching}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              {foundUsers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Найденные пользователи:</p>
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
                          <p className="text-sm text-muted-foreground">@{user.username}</p>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => handleAddClient(user)}>
                        Добавить
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
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
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Нет подопечных</h3>
            <p className="text-muted-foreground text-center">
              Добавьте первого подопечного, чтобы начать отслеживать их прогресс
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <Card 
              key={client.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onSelectClient(client)}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={client.avatar_url} />
                    <AvatarFallback>
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-base">{client.full_name || client.username}</CardTitle>
                    <CardDescription>@{client.username}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{client.goals_count || 0} целей</span>
                  </div>
                  {client.last_measurement && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Измерение: {new Date(client.last_measurement).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <Badge variant="secondary" className="w-fit">
                    Активен с {new Date(client.assigned_at).toLocaleDateString()}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}