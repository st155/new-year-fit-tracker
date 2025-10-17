import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Client {
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface AddParticipantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challengeId: string;
  onSuccess: () => void;
}

export function AddParticipantDialog({ open, onOpenChange, challengeId, onSuccess }: AddParticipantDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [existingParticipants, setExistingParticipants] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      loadClients();
      loadExistingParticipants();
    }
  }, [open, challengeId]);

  const loadClients = async () => {
    setSearching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("trainer_clients")
        .select(`
          client_id,
          profiles!trainer_clients_client_id_fkey (
            user_id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq("trainer_id", user.id)
        .eq("active", true);

      if (error) throw error;

      const clientsList = data?.map(tc => ({
        user_id: tc.profiles.user_id,
        username: tc.profiles.username,
        full_name: tc.profiles.full_name,
        avatar_url: tc.profiles.avatar_url,
      })) || [];

      setClients(clientsList);
    } catch (error) {
      console.error("Error loading clients:", error);
    } finally {
      setSearching(false);
    }
  };

  const loadExistingParticipants = async () => {
    const { data, error } = await supabase
      .from("challenge_participants")
      .select("user_id")
      .eq("challenge_id", challengeId);

    if (error) {
      console.error("Error loading participants:", error);
      return;
    }

    setExistingParticipants(data?.map(p => p.user_id) || []);
  };

  const handleAddParticipant = async (clientId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("challenge_participants")
        .insert({
          challenge_id: challengeId,
          user_id: clientId,
        });

      if (error) throw error;

      toast({
        title: "Успех",
        description: "Участник добавлен в челлендж",
      });

      setExistingParticipants([...existingParticipants, clientId]);
      onSuccess();
    } catch (error: any) {
      console.error("Error adding participant:", error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось добавить участника",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client => {
    const query = searchQuery.toLowerCase();
    return (
      client.username?.toLowerCase().includes(query) ||
      client.full_name?.toLowerCase().includes(query)
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить участника</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск клиента..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {searching ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredClients.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {searchQuery ? "Клиенты не найдены" : "Нет доступных клиентов"}
                </p>
              ) : (
                filteredClients.map((client) => {
                  const isParticipant = existingParticipants.includes(client.user_id);
                  
                  return (
                    <div
                      key={client.user_id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={client.avatar_url || undefined} />
                          <AvatarFallback>
                            {(client.full_name || client.username || "U").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {client.full_name || client.username || "Unnamed User"}
                          </p>
                          {client.username && client.full_name && (
                            <p className="text-sm text-muted-foreground">@{client.username}</p>
                          )}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleAddParticipant(client.user_id)}
                        disabled={loading || isParticipant}
                        variant={isParticipant ? "secondary" : "default"}
                      >
                        {isParticipant ? (
                          "Уже участвует"
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-1" />
                            Добавить
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
