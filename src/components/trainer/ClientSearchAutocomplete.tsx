import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Client {
  user_id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
}

interface ClientSearchAutocompleteProps {
  onSelect: (client: Client) => void;
  placeholder?: string;
}

export const ClientSearchAutocomplete = ({ onSelect, placeholder = "Найти клиента: имя, логин..." }: ClientSearchAutocompleteProps) => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Client[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Load all clients once for caching
  useEffect(() => {
    const loadAllClients = async () => {
      if (!user) return;

      // Используем RPC вместо JOIN через foreign key для обхода проблем с RLS
      const { data, error } = await supabase
        .rpc('get_trainer_clients_summary', { p_trainer_id: user.id });

      if (error) {
        console.error('❌ [ClientSearchAutocomplete] Error loading clients:', error);
        return;
      }

      const clients = (data || []).map((tc: any) => ({
        user_id: tc.client_id,
        username: tc.username,
        full_name: tc.full_name,
        avatar_url: tc.avatar_url
      }));
      
      console.log('✅ [ClientSearchAutocomplete] Loaded clients:', clients.length);
      setAllClients(clients);
    };

    loadAllClients();
  }, [user]);

  // Filter locally from cache
  useEffect(() => {
    if (search.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const searchLower = search.toLowerCase();
    const filtered = allClients.filter(client =>
      client.username?.toLowerCase().includes(searchLower) ||
      client.full_name?.toLowerCase().includes(searchLower)
    ).slice(0, 10);

    setResults(filtered);
    setIsOpen(filtered.length > 0);
  }, [search, allClients]);

  const handleSelect = (client: Client) => {
    onSelect(client);
    setSearch('');
    setIsOpen(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="max-h-80 overflow-y-auto">
          {results.map(client => (
            <div
              key={client.user_id}
              onClick={() => handleSelect(client)}
              className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer transition-colors"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={client.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(client.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{client.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">@{client.username}</p>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
