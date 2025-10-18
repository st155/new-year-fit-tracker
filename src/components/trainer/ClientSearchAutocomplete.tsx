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
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (search.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      if (!user) return;

      const { data } = await supabase
        .from('trainer_clients')
        .select(`
          profiles!trainer_clients_client_id_fkey (
            user_id, username, full_name, avatar_url
          )
        `)
        .eq('trainer_id', user.id)
        .eq('active', true)
        .or(`username.ilike.%${search}%,full_name.ilike.%${search}%`, { 
          foreignTable: 'profiles' 
        })
        .limit(10);

      const clients = (data || [])
        .map((tc: any) => tc.profiles)
        .filter(Boolean);
      
      setResults(clients);
      setIsOpen(clients.length > 0);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, user]);

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
