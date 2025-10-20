import { useState, useEffect } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Activity } from "lucide-react";
import { format } from "date-fns";

interface Client {
  client_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  last_activity?: string;
}

interface GlobalClientSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GlobalClientSearch = ({ open, onOpenChange }: GlobalClientSearchProps) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      loadClients();
    }
  }, [open]);

  // CMD+K shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const loadClients = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("trainer_clients")
      .select(`
        client_id,
        profiles!trainer_clients_client_id_fkey (
          username,
          full_name,
          avatar_url
        )
      `)
      .eq("trainer_id", user.id)
      .eq("active", true);

    if (data) {
      const clientsData = data.map((tc: any) => ({
        client_id: tc.client_id,
        username: tc.profiles?.username,
        full_name: tc.profiles?.full_name,
        avatar_url: tc.profiles?.avatar_url,
      }));
      setClients(clientsData);
    }
    setLoading(false);
  };

  const handleSelectClient = (clientId: string) => {
    navigate(`/trainer-dashboard?tab=clients&clientId=${clientId}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-2xl">
        <Command className="rounded-lg border-0">
          <CommandInput placeholder="Search clients..." />
          <CommandList>
            <CommandEmpty>
              {loading ? "Loading..." : "No clients found."}
            </CommandEmpty>
            <CommandGroup heading="Your Clients">
              {clients.map((client) => (
                <CommandItem
                  key={client.client_id}
                  onSelect={() => handleSelectClient(client.client_id)}
                  className="flex items-center gap-3 p-3 cursor-pointer"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={client.avatar_url || undefined} />
                    <AvatarFallback>
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">
                      {client.full_name || client.username || "Unknown"}
                    </p>
                    {client.last_activity && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        Last active: {format(new Date(client.last_activity), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
};