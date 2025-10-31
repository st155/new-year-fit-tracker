import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, Send, Loader2, AtSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIChat } from './useAIChat';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AIInputProps {
  selectedClient?: {
    id: string;
    user_id: string;
    username: string;
    full_name: string;
  } | null;
}

interface ClientSuggestion {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
}

export function AIInput({ selectedClient }: AIInputProps) {
  const { user } = useAuth();
  const { sendMessage, sending } = useAIChat();
  const [input, setInput] = useState('');
  const [mentionsOpen, setMentionsOpen] = useState(false);
  const [clients, setClients] = useState<ClientSuggestion[]>([]);
  const [mentionedClients, setMentionedClients] = useState<string[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load clients for @mentions
  useEffect(() => {
    if (!user) return;
    
    const loadClients = async () => {
      const { data } = await supabase
        .rpc('get_trainer_clients_summary', { p_trainer_id: user.id });
      
      if (data) {
        setClients(data.map((c: any) => ({
          id: c.client_id,
          user_id: c.client_id,
          username: c.username || '',
          full_name: c.full_name || '',
        })));
      }
    };
    
    loadClients();
  }, [user]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  // Detect @ symbol for mentions
  useEffect(() => {
    const lastChar = input[cursorPosition - 1];
    if (lastChar === '@') {
      setMentionsOpen(true);
    }
  }, [input, cursorPosition]);

  const handleSelectClient = (client: ClientSuggestion) => {
    // Replace @ with client mention
    const beforeAt = input.substring(0, cursorPosition - 1);
    const afterAt = input.substring(cursorPosition);
    const newInput = `${beforeAt}@${client.full_name || client.username} ${afterAt}`;
    
    setInput(newInput);
    setMentionedClients(prev => [...prev, client.user_id]);
    setMentionsOpen(false);
    
    // Focus back on textarea
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    
    // Update cursor position
    setCursorPosition((e.target as HTMLTextAreaElement).selectionStart || 0);
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    
    const messageToSend = input.trim();
    setInput('');
    setMentionedClients([]);
    
    await sendMessage(
      messageToSend,
      selectedClient ? 'client_specific' : 'general',
      mentionedClients,
      [],
      selectedClient?.user_id
    );
  };

  return (
    <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
      <div className="max-w-4xl mx-auto relative">
        {/* Mentions popup */}
        {mentionsOpen && (
          <div className="absolute bottom-full mb-2 left-0 right-0 z-50">
            <Command className="rounded-lg border shadow-lg bg-popover">
              <CommandInput placeholder="Search clients..." />
              <CommandList>
                <CommandEmpty>No clients found.</CommandEmpty>
                <CommandGroup heading="Your Clients">
                  {clients.map((client) => (
                    <CommandItem
                      key={client.user_id}
                      value={client.full_name || client.username}
                      onSelect={() => handleSelectClient(client)}
                      className="cursor-pointer"
                    >
                      <AtSign className="h-4 w-4 mr-2" />
                      <span>{client.full_name || client.username}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        )}
        
        {/* Input area */}
        <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-muted/30 px-4 py-2 focus-within:border-primary/50 transition-colors">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setCursorPosition(e.target.selectionStart || 0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Message AI Assistant... (use @ to mention clients)"
            className="resize-none border-0 bg-transparent focus-visible:ring-0 min-h-[24px] max-h-[200px] placeholder:text-muted-foreground/60"
            rows={1}
            disabled={sending}
          />
          
          <div className="flex items-center gap-1 shrink-0 pb-1">
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8 hover:bg-muted"
              disabled
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            
            <Button
              size="icon"
              disabled={!input.trim() || sending}
              onClick={handleSend}
              className={cn(
                "h-8 w-8 rounded-full transition-all",
                input.trim() && !sending
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/25"
                  : "bg-muted"
              )}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        {/* Quick tips */}
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground px-1">
          <div className="flex items-center gap-1">
            <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono">Shift</kbd>
            <span>+</span>
            <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono">Enter</kbd>
            <span>new line</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono">@</kbd>
            <span>mention client</span>
          </div>
        </div>
      </div>
    </div>
  );
}
