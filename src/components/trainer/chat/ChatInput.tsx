import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';
import { MentionAutocomplete, ClientSuggestion } from '../MentionAutocomplete';
import { useDebounce } from '@/hooks/primitive/useDebounce';

interface ChatInputProps {
  onSend: (message: string, mentionedClientIds: string[], mentionedNames: string[]) => void;
  disabled: boolean;
  clients: ClientSuggestion[];
  clientAliases: Array<{
    id: string;
    client_id: string;
    alias_name: string;
  }>;
  loadingClients: boolean;
  mentions: Map<string, string>;
  onMentionsChange: (mentions: Map<string, string>) => void;
}

export const ChatInput = ({
  onSend,
  disabled,
  clients,
  clientAliases,
  loadingClients,
  mentions,
  onMentionsChange
}: ChatInputProps) => {
  const [input, setInput] = useState('');
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [filteredClients, setFilteredClients] = useState<ClientSuggestion[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const debouncedQuery = useDebounce(mentionQuery, 100);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, [input]);

  // Filter clients based on mention query
  useEffect(() => {
    if (!debouncedQuery && !showMentionSuggestions) return;

    const lowerQuery = debouncedQuery.toLowerCase();
    const filtered = clients.filter(c => {
      const hasMatchingAlias = clientAliases.some(
        alias => alias.client_id === c.user_id && 
                 alias.alias_name.toLowerCase().includes(lowerQuery)
      );
      if (hasMatchingAlias) return true;
      
      return c.username.toLowerCase().includes(lowerQuery) ||
             c.full_name.toLowerCase().includes(lowerQuery);
    });
    
    filtered.sort((a, b) => {
      const aExactAlias = clientAliases.find(
        alias => alias.client_id === a.user_id && 
                 alias.alias_name.toLowerCase() === lowerQuery
      );
      const bExactAlias = clientAliases.find(
        alias => alias.client_id === b.user_id && 
                 alias.alias_name.toLowerCase() === lowerQuery
      );
      
      if (aExactAlias && !bExactAlias) return -1;
      if (!aExactAlias && bExactAlias) return 1;
      
      const aUsernameMatch = a.username.toLowerCase().startsWith(lowerQuery);
      const bUsernameMatch = b.username.toLowerCase().startsWith(lowerQuery);
      
      if (aUsernameMatch && !bUsernameMatch) return -1;
      if (!aUsernameMatch && bUsernameMatch) return 1;
      
      return 0;
    });

    setFilteredClients(filtered);
  }, [debouncedQuery, clients, clientAliases, showMentionSuggestions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInput(text);
    
    const caret = e.target.selectionStart ?? text.length;
    const atIndex = text.lastIndexOf('@', Math.max(0, caret - 1));
    const cursorIsAfterAt = atIndex !== -1 && atIndex < caret;
    
    if (cursorIsAfterAt) {
      const afterAt = text.slice(atIndex + 1, caret);
      const queryMatch = afterAt.match(/^(\S*)/);
      const query = queryMatch ? queryMatch[1] : '';

      setMentionQuery(query);
      setShowMentionSuggestions(true);
      
      if (textareaRef.current) {
        const textarea = textareaRef.current;
        const rect = textarea.getBoundingClientRect();
        setMentionPosition({
          top: rect.bottom + 5,
          left: rect.left
        });
      }
    } else {
      setShowMentionSuggestions(false);
    }
  };

  const selectClient = (client: ClientSuggestion) => {
    const lastAtIndex = input.lastIndexOf('@');
    const beforeAt = input.slice(0, lastAtIndex);
    const afterQuery = input.slice(lastAtIndex + 1).replace(/^\S*/, '');
    
    const newInput = `${beforeAt}@${client.username} ${afterQuery}`;
    setInput(newInput);
    
    const newMentions = new Map(mentions);
    newMentions.set(client.username, client.user_id);
    onMentionsChange(newMentions);
    
    setShowMentionSuggestions(false);
    setMentionQuery('');
    
    setTimeout(() => {
      textareaRef.current?.focus();
      const len = newInput.length;
      textareaRef.current?.setSelectionRange(len, len);
    }, 50);
  };

  const handleSend = () => {
    const textToSend = input.trim();
    if (!textToSend || disabled) return;
    
    // Extract mentions
    const findMentions = (text: string): Array<{ full: string; username: string }> => {
      const pattern = /@(\S+)/g;
      const results: Array<{ full: string; username: string }> = [];
      let match: RegExpExecArray | null;
      
      while ((match = pattern.exec(text)) !== null) {
        results.push({ full: match[0], username: match[1] });
        if (pattern.lastIndex === match.index) {
          pattern.lastIndex++;
        }
      }
      return results;
    };
    
    const mentionMatches = findMentions(textToSend);
    
    const clientIds = mentionMatches
      .map(m => mentions.get(m.username))
      .filter(Boolean) as string[];
    
    const names = mentionMatches
      .filter(m => !mentions.has(m.username))
      .map(m => m.username);
    
    onSend(textToSend, clientIds, names);
    setInput('');
    onMentionsChange(new Map());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionSuggestions && e.key === 'Enter') {
      return;
    }
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t bg-background p-4">
      <div className="flex gap-2 items-end">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Напишите сообщение... (@ для упоминания клиента)"
            disabled={disabled}
            className="min-h-[44px] max-h-[200px] resize-none"
            rows={1}
          />
          {showMentionSuggestions && (
            <MentionAutocomplete
              clients={filteredClients}
              query={mentionQuery}
              onSelect={selectClient}
              onClose={() => setShowMentionSuggestions(false)}
              position={mentionPosition}
              loading={loadingClients}
            />
          )}
        </div>
        <Button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          size="icon"
          className="h-[44px] w-[44px] flex-shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
