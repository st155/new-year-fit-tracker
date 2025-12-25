import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Send, Mail, Users, Calendar, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { adminApi } from "@/lib/api/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface TrainerBroadcast {
  id: string;
  subject: string;
  message: string;
  recipient_type: 'all_clients' | 'challenge_participants' | 'specific_clients';
  challenge_id?: string;
  specific_clients?: string[];
  sent_at?: string;
  sent_count: number;
  created_at: string;
  status: 'draft' | 'sending' | 'sent' | 'failed';
}

interface Challenge {
  id: string;
  title: string;
}

interface Client {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
}

export function TrainerBroadcasts() {
  const { user } = useAuth();
  const [broadcasts, setBroadcasts] = useState<TrainerBroadcast[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const [newBroadcast, setNewBroadcast] = useState({
    subject: "",
    message: "",
    recipient_type: "all_clients" as 'all_clients' | 'challenge_participants' | 'specific_clients',
    challenge_id: "",
    specific_clients: [] as string[]
  });

  useEffect(() => {
    if (user) {
      loadBroadcasts();
      loadChallenges();
      loadClients();
    }
  }, [user]);

  const loadBroadcasts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('trainer_broadcasts')
        .select('*')
        .eq('trainer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBroadcasts(data as TrainerBroadcast[] || []);
    } catch (error: any) {
      console.error('Error loading broadcasts:', error);
      toast.error('Ошибка загрузки рассылок');
    } finally {
      setLoading(false);
    }
  };

  const loadChallenges = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('id, title')
        .eq('created_by', user.id)
        .eq('is_active', true);

      if (error) throw error;
      setChallenges(data || []);
    } catch (error: any) {
      console.error('Error loading challenges:', error);
    }
  };

  const loadClients = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('trainer_clients')
        .select(`
          id,
          client_id,
          profiles!trainer_clients_client_id_fkey (
            user_id,
            username,
            full_name
          )
        `)
        .eq('trainer_id', user.id)
        .eq('active', true);

      if (error) throw error;

      const clientsData = (data || []).map((tc: any) => ({
        id: tc.id,
        user_id: tc.profiles.user_id,
        username: tc.profiles.username,
        full_name: tc.profiles.full_name
      }));

      setClients(clientsData);
    } catch (error: any) {
      console.error('Error loading clients:', error);
    }
  };

  const handleCreateBroadcast = async () => {
    if (!user || !newBroadcast.subject.trim() || !newBroadcast.message.trim()) {
      toast.error('Заполните все обязательные поля');
      return;
    }

    try {
      const broadcastData = {
        trainer_id: user.id,
        subject: newBroadcast.subject,
        message: newBroadcast.message,
        recipient_type: newBroadcast.recipient_type,
        challenge_id: newBroadcast.recipient_type === 'challenge_participants' ? newBroadcast.challenge_id || null : null,
        specific_clients: newBroadcast.recipient_type === 'specific_clients' ? newBroadcast.specific_clients : null,
        status: 'draft'
      };

      const { error } = await supabase
        .from('trainer_broadcasts')
        .insert(broadcastData);

      if (error) throw error;

      toast.success('Рассылка создана');
      setIsCreateDialogOpen(false);
      resetForm();
      loadBroadcasts();
    } catch (error: any) {
      console.error('Error creating broadcast:', error);
      toast.error('Ошибка создания рассылки');
    }
  };

  const handleSendBroadcast = async (broadcastId: string) => {
    setSending(true);
    
    try {
      // Здесь можно вызвать edge function для отправки email
      const { data, error } = await adminApi.sendBroadcast(broadcastId);

      if (error) throw error;

      // Обновляем статус рассылки
      await supabase
        .from('trainer_broadcasts')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString(),
          sent_count: data?.sent_count || 0
        })
        .eq('id', broadcastId);

      toast.success(`Рассылка отправлена ${data?.sent_count || 0} получателям`);
      loadBroadcasts();
    } catch (error: any) {
      console.error('Error sending broadcast:', error);
      toast.error('Ошибка отправки рассылки');
      
      // Обновляем статус на failed
      await supabase
        .from('trainer_broadcasts')
        .update({ status: 'failed' })
        .eq('id', broadcastId);
    } finally {
      setSending(false);
    }
  };

  const resetForm = () => {
    setNewBroadcast({
      subject: "",
      message: "",
      recipient_type: "all_clients",
      challenge_id: "",
      specific_clients: []
    });
  };

  const getRecipientText = (broadcast: TrainerBroadcast) => {
    switch (broadcast.recipient_type) {
      case 'all_clients':
        return 'Все подопечные';
      case 'challenge_participants':
        const challenge = challenges.find(c => c.id === broadcast.challenge_id);
        return `Участники: ${challenge?.title || 'Неизвестный челлендж'}`;
      case 'specific_clients':
        return `Выбранные клиенты (${broadcast.specific_clients?.length || 0})`;
      default:
        return 'Неизвестно';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Черновик</Badge>;
      case 'sending':
        return <Badge variant="default">Отправляется</Badge>;
      case 'sent':
        return <Badge variant="default" className="bg-green-100 text-green-800">Отправлено</Badge>;
      case 'failed':
        return <Badge variant="destructive">Ошибка</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Email-рассылки</h2>
          <p className="text-muted-foreground">Отправляйте уведомления и сообщения группе подопечных</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Создать рассылку
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Создать email-рассылку</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="subject">Тема письма *</Label>
                <Input
                  id="subject"
                  value={newBroadcast.subject}
                  onChange={(e) => setNewBroadcast({ ...newBroadcast, subject: e.target.value })}
                  placeholder="Например: Важное сообщение от тренера"
                />
              </div>

              <div>
                <Label htmlFor="message">Сообщение *</Label>
                <Textarea
                  id="message"
                  value={newBroadcast.message}
                  onChange={(e) => setNewBroadcast({ ...newBroadcast, message: e.target.value })}
                  placeholder="Введите текст сообщения..."
                  className="min-h-32"
                />
              </div>

              <div>
                <Label htmlFor="recipient_type">Получатели</Label>
                <Select
                  value={newBroadcast.recipient_type}
                  onValueChange={(value: any) => setNewBroadcast({ ...newBroadcast, recipient_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_clients">Все подопечные</SelectItem>
                    <SelectItem value="challenge_participants">Участники челленджа</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newBroadcast.recipient_type === 'challenge_participants' && (
                <div>
                  <Label htmlFor="challenge_id">Челлендж</Label>
                  <Select
                    value={newBroadcast.challenge_id}
                    onValueChange={(value) => setNewBroadcast({ ...newBroadcast, challenge_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите челлендж" />
                    </SelectTrigger>
                    <SelectContent>
                      {challenges.map((challenge) => (
                        <SelectItem key={challenge.id} value={challenge.id}>
                          {challenge.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Примечание:</p>
                    <p>После создания рассылки вы сможете отправить её всем получателям одним кликом.</p>
                  </div>
                </div>
              </div>

              <Button onClick={handleCreateBroadcast} className="w-full">
                Создать рассылку
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : broadcasts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Нет рассылок</h3>
            <p className="text-muted-foreground text-center">
              Создайте первую email-рассылку для ваших подопечных
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {broadcasts.map((broadcast) => (
            <Card key={broadcast.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-lg">{broadcast.subject}</CardTitle>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(broadcast.status)}
                      <Badge variant="outline">
                        <Users className="h-3 w-3 mr-1" />
                        {getRecipientText(broadcast)}
                      </Badge>
                      {broadcast.sent_count > 0 && (
                        <Badge variant="outline">
                          Отправлено: {broadcast.sent_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {broadcast.status === 'draft' && (
                    <Button 
                      size="sm"
                      onClick={() => handleSendBroadcast(broadcast.id)}
                      disabled={sending}
                      className="flex items-center gap-2"
                    >
                      <Send className="h-4 w-4" />
                      Отправить
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{broadcast.message}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    <Calendar className="h-3 w-3 inline mr-1" />
                    Создано: {new Date(broadcast.created_at).toLocaleDateString()}
                  </span>
                  {broadcast.sent_at && (
                    <span>
                      <Mail className="h-3 w-3 inline mr-1" />
                      Отправлено: {new Date(broadcast.sent_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}