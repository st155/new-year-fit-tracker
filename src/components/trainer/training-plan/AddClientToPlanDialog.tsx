import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Loader2, Check, User, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Client {
  user_id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface AddClientToPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  planName: string;
  planDurationWeeks: number;
  existingClientIds: string[];
  onSuccess: () => void;
}

export function AddClientToPlanDialog({
  open,
  onOpenChange,
  planId,
  planName,
  planDurationWeeks,
  existingClientIds,
  onSuccess,
}: AddClientToPlanDialogProps) {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (open && user?.id) {
      loadClients();
    }
  }, [open, user?.id]);

  const loadClients = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Use RPC or simpler query to avoid type issues
      const response = await supabase
        .from('trainer_clients')
        .select('client_id')
        .eq('trainer_id', user.id)
        .eq('status', 'active');
      
      const trainerClients = response.data;
      const tcError = response.error;

      if (tcError) throw tcError;

      const clientIds = (trainerClients || []).map((tc: { client_id: string }) => tc.client_id);
      
      if (clientIds.length === 0) {
        setClients([]);
        setLoading(false);
        return;
      }

      // Then get the profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username, full_name, avatar_url')
        .in('user_id', clientIds);

      if (profilesError) throw profilesError;

      setClients((profiles || []) as Client[]);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error('Не удалось загрузить клиентов');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedClientId || !user?.id) return;

    setAssigning(true);
    try {
      const endDate = new Date(new Date(startDate).getTime() + planDurationWeeks * 7 * 24 * 60 * 60 * 1000);

      const { error } = await supabase.from('assigned_training_plans').insert({
        plan_id: planId,
        client_id: selectedClientId,
        assigned_by: user.id,
        start_date: startDate,
        end_date: format(endDate, 'yyyy-MM-dd'),
        status: 'active',
      });

      if (error) throw error;

      const selectedClient = clients.find((c) => c.user_id === selectedClientId);
      toast.success(`Клиент "${selectedClient?.full_name || selectedClient?.username}" добавлен к плану`);
      onSuccess();
      onOpenChange(false);
      setSelectedClientId(null);
      setSearchQuery('');
    } catch (error: any) {
      console.error('Error assigning client:', error);
      toast.error(error.message || 'Не удалось добавить клиента');
    } finally {
      setAssigning(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredClients = clients.filter((client) => {
    const query = searchQuery.toLowerCase();
    return (
      client.username.toLowerCase().includes(query) ||
      (client.full_name?.toLowerCase() || '').includes(query)
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Добавить клиента к плану</DialogTitle>
          <DialogDescription>
            План: {planName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="start-date" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Дата начала
            </Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-48"
            />
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск клиентов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Clients List */}
          <ScrollArea className="h-[300px] rounded-md border p-2">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>{searchQuery ? 'Клиенты не найдены' : 'У вас пока нет клиентов'}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredClients.map((client) => {
                  const isAlreadyAssigned = existingClientIds.includes(client.user_id);
                  const isSelected = selectedClientId === client.user_id;

                  return (
                    <Card
                      key={client.user_id}
                      className={`cursor-pointer transition-all ${
                        isAlreadyAssigned
                          ? 'opacity-50 cursor-not-allowed'
                          : isSelected
                          ? 'ring-2 ring-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => !isAlreadyAssigned && setSelectedClientId(client.user_id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={client.avatar_url || undefined} />
                            <AvatarFallback className="text-sm">
                              {getInitials(client.full_name || client.username)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {client.full_name || client.username}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              @{client.username}
                            </p>
                          </div>
                          {isAlreadyAssigned ? (
                            <Badge variant="secondary">
                              <Check className="h-3 w-3 mr-1" />
                              Добавлен
                            </Badge>
                          ) : isSelected ? (
                            <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                              <Check className="h-3 w-3 text-primary-foreground" />
                            </div>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button onClick={handleAssign} disabled={!selectedClientId || assigning}>
              {assigning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Добавляю...
                </>
              ) : (
                'Добавить клиента'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
