import { useState, useEffect, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';

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
  loading?: boolean;
}

export const MentionAutocomplete = ({
  clients,
  query,
  onSelect,
  onClose,
  position,
  loading = false,
}: MentionAutocompleteProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // No filtering here - clients are already filtered in parent component
  const filteredClients = clients;

  // Clamp within viewport to avoid overflow
  const minWidth = 260;
  const safeLeft = Math.min(Math.max(8, position.left), (typeof window !== 'undefined' ? window.innerWidth : 1200) - minWidth - 8);
  const safeTop = Math.min(Math.max(8, position.top), (typeof window !== 'undefined' ? window.innerHeight : 800) - 8);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredClients]);

useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' && filteredClients.length > 0) {
      e.preventDefault();
      setSelectedIndex(i => (i + 1) % filteredClients.length);
    } else if (e.key === 'ArrowUp' && filteredClients.length > 0) {
      e.preventDefault();
      setSelectedIndex(i => (i - 1 + filteredClients.length) % filteredClients.length);
    } else if (e.key === 'Enter' && filteredClients[selectedIndex]) {
      e.preventDefault();
      e.stopPropagation(); // Prevent event bubbling to parent textarea
      onSelect(filteredClients[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [filteredClients, selectedIndex, onSelect, onClose]);

if (loading) {
  return (
    <div
      className="fixed z-[100000] bg-background dark:bg-slate-900 border-2 border-primary/20 rounded-md shadow-2xl p-3 min-w-[250px] pointer-events-auto"
      style={{ top: `${safeTop}px`, left: `${safeLeft}px` }}
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Загрузка клиентов…</span>
      </div>
    </div>
  );
}

if (filteredClients.length === 0) {
  return (
    <div
      className="fixed z-[100000] bg-background dark:bg-slate-900 border-2 border-primary/20 rounded-md shadow-2xl p-3 min-w-[250px] pointer-events-auto"
      style={{ top: `${safeTop}px`, left: `${safeLeft}px` }}
    >
      <p className="text-sm text-muted-foreground">
        {query ? 'Клиент не найден' : 'Нет доступных клиентов'}
      </p>
    </div>
  );
}

  return (
    <div
      className="fixed z-[100000] bg-background dark:bg-slate-900 border-2 border-primary/20 rounded-md shadow-2xl max-h-60 overflow-auto min-w-[250px] pointer-events-auto"
      style={{ top: `${safeTop}px`, left: `${safeLeft}px` }}
    >
      <div className="sticky top-0 bg-background dark:bg-slate-900 border-b border-border px-3 py-2">
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
