import { useState, useEffect, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export interface ClientSuggestion {
  user_id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
}

interface MentionAutocompleteProps {
  clients: ClientSuggestion[];
  query: string;
  onSelect: (client: ClientSuggestion) => void;
  onClose: () => void;
  position: { top: number; left: number };
}

export const MentionAutocomplete = ({
  clients,
  query,
  onSelect,
  onClose,
  position
}: MentionAutocompleteProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const filteredClients = useMemo(() => {
    if (!query) return clients;
    const lowerQuery = query.toLowerCase();
    return clients.filter(c => 
      c.username.toLowerCase().includes(lowerQuery) ||
      c.full_name.toLowerCase().includes(lowerQuery)
    );
  }, [clients, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredClients]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => (i + 1) % filteredClients.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => (i - 1 + filteredClients.length) % filteredClients.length);
      } else if (e.key === 'Enter' && filteredClients[selectedIndex]) {
        e.preventDefault();
        onSelect(filteredClients[selectedIndex]);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredClients, selectedIndex, onSelect, onClose]);

  if (filteredClients.length === 0) {
    return (
      <div
        className="fixed z-[9999] bg-popover border border-border rounded-md shadow-lg p-3 min-w-[250px] pointer-events-auto"
        style={{ top: `${position.top}px`, left: `${position.left}px` }}
      >
        <p className="text-sm text-muted-foreground">
          {query ? 'Клиент не найден' : 'Нет доступных клиентов'}
        </p>
      </div>
    );
  }

  return (
    <div
      className="fixed z-[9999] bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto min-w-[250px] pointer-events-auto"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
    >
      <div className="sticky top-0 bg-popover border-b border-border px-3 py-2">
        <p className="text-xs text-muted-foreground">
          {filteredClients.length} {filteredClients.length === 1 ? 'клиент' : 'клиентов'}
          <span className="ml-2 text-[10px]">↑↓ Enter Esc</span>
        </p>
      </div>
      {filteredClients.map((client, index) => (
        <div
          key={client.user_id}
          className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent transition-colors ${
            index === selectedIndex ? 'bg-accent' : ''
          }`}
          onClick={() => onSelect(client)}
        >
          <Avatar className="h-6 w-6">
            <AvatarImage src={client.avatar_url} />
            <AvatarFallback className="text-xs">
              {client.full_name?.[0]?.toUpperCase() || client.username[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{client.full_name}</span>
            <span className="text-xs text-muted-foreground">@{client.username}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
