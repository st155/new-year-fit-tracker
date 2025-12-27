import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, Send, Loader2, AtSign, Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIChat } from './useAIChat';
import { Popover, PopoverContent } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('trainer');
  const { user } = useAuth();
  const { sendMessage, sending } = useAIChat();
  const [input, setInput] = useState('');
  const [mentionsOpen, setMentionsOpen] = useState(false);
  const [clients, setClients] = useState<ClientSuggestion[]>([]);
  const [mentionedClients, setMentionedClients] = useState<string[]>([]);
  const [mentionSearch, setMentionSearch] = useState('');
  const [requireConfirmation, setRequireConfirmation] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isListening, setIsListening] = useState(false);
  
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  // Sync transcript to input
  useEffect(() => {
    if (transcript && listening) {
      setInput(transcript);
    }
  }, [transcript, listening]);

  const handleStartVoice = () => {
    resetTranscript();
    setIsListening(true);
    SpeechRecognition.startListening({ 
      continuous: true,
      language: 'ru-RU' // Russian language
    });
  };

  const handleStopVoice = () => {
    SpeechRecognition.stopListening();
    setIsListening(false);
    // Transcript is already in input, user can edit or send
  };

  // Load clients for @mentions
  useEffect(() => {
    if (!user) return;
    
    const loadClients = async () => {
      console.log('🔍 Loading clients for @mentions...');
      
      const { data, error } = await supabase
        .from('trainer_clients')
        .select(`
          client_id,
          profiles!trainer_clients_client_id_fkey (
            user_id,
            username,
            full_name
          )
        `)
        .eq('trainer_id', user.id)
        .eq('active', true);
      
      if (data && !error) {
        const clientsList = data
          .filter((tc: any) => tc.profiles)
          .map((tc: any) => ({
            id: tc.profiles.user_id,
            user_id: tc.profiles.user_id,
            username: tc.profiles.username || '',
            full_name: tc.profiles.full_name || tc.profiles.username || 'Unknown',
          }));
        
        setClients(clientsList);
        console.log('✅ Loaded clients for mentions:', clientsList.length, clientsList);
      } else {
        console.error('❌ Error loading clients:', error);
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

  // Close mentions on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mentionsOpen && containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setMentionsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mentionsOpen]);

  // Detect @ for mentions
  const handleInputChange = (value: string) => {
    setInput(value);
    
    const cursorPos = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const searchTerm = textBeforeCursor.substring(lastAtIndex + 1);
      if (searchTerm.length <= 20 && !/\s/.test(searchTerm)) {
        setMentionSearch(searchTerm);
        setMentionsOpen(true);
        return;
      }
    }
    
    setMentionsOpen(false);
  };

  const handleSelectClient = (client: ClientSuggestion) => {
    const cursorPos = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = input.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const beforeAt = input.substring(0, lastAtIndex);
      const afterCursor = input.substring(cursorPos);
      const newInput = `${beforeAt}@${client.full_name || client.username} ${afterCursor}`;
      
      setInput(newInput);
      setMentionedClients(prev => [...new Set([...prev, client.user_id])]);
      setMentionsOpen(false);
      setMentionSearch('');
      
      setTimeout(() => {
        textareaRef.current?.focus();
        const newPos = lastAtIndex + (client.full_name || client.username).length + 2;
        textareaRef.current?.setSelectionRange(newPos, newPos);
      }, 0);
    }
  };

  const filteredClients = clients.filter(c => {
    const searchLower = mentionSearch.toLowerCase();
    return (
      c.full_name.toLowerCase().includes(searchLower) ||
      c.username.toLowerCase().includes(searchLower)
    );
  });

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape' && mentionsOpen) {
      e.preventDefault();
      setMentionsOpen(false);
      return;
    }
    
    if (e.key === 'Enter' && !e.shiftKey && !mentionsOpen) {
      e.preventDefault();
      handleSend();
    }
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
      selectedClient?.user_id,
      !requireConfirmation // autoExecute is opposite of requireConfirmation
    );
  };

  return (
    <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
      <div className="max-w-4xl mx-auto relative" ref={containerRef}>
        
        {/* Mentions Dropdown */}
        {mentionsOpen && (
          <div 
            className="absolute bottom-full mb-2 left-0 w-[400px] z-50 bg-popover border border-border rounded-lg shadow-lg"
            style={{ transform: 'translateY(-8px)' }}
          >
            <Command>
              <CommandInput 
                placeholder={t('aiInput.searchClients')}
                value={mentionSearch}
                onValueChange={setMentionSearch}
                autoFocus
              />
              <CommandList>
                <CommandEmpty>{t('aiInput.clientsNotFound')}</CommandEmpty>
                <CommandGroup heading={t('aiInput.yourClients')}>
                  {filteredClients.map((client) => (
                    <CommandItem
                      key={client.user_id}
                      value={client.full_name || client.username}
                      onSelect={() => handleSelectClient(client)}
                      className="cursor-pointer"
                    >
                      <AtSign className="h-4 w-4 mr-2 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="font-medium">{client.full_name || client.username}</span>
                        <span className="text-xs text-muted-foreground">@{client.username}</span>
                      </div>
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
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('aiInput.placeholder')}
            className="resize-none border-0 bg-transparent focus-visible:ring-0 min-h-[24px] max-h-[200px] placeholder:text-muted-foreground/60"
            rows={1}
            disabled={sending}
          />
          
          <div className="flex items-center gap-1 shrink-0 pb-1">
            {/* Voice Input Button */}
            {browserSupportsSpeechRecognition && (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 hover:bg-muted transition-all",
                  isListening && "bg-red-500/20 text-red-500 animate-pulse"
                )}
                onClick={isListening ? handleStopVoice : handleStartVoice}
                disabled={sending}
              >
                {isListening ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
            )}

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
        
        {/* Quick tips and Settings */}
        <div className="flex items-center justify-between gap-3 mt-2 text-xs px-1">
          <div className="flex items-center gap-3 text-muted-foreground">
            {isListening && (
              <div className="flex items-center gap-2 text-red-500 animate-pulse">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <span>{t('aiInput.listening')}</span>
              </div>
            )}
            
            {!isListening && (
              <>
                <div className="flex items-center gap-1">
                  <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono">Shift</kbd>
                  <span>+</span>
                  <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono">Enter</kbd>
                  <span>{t('aiInput.newLine')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono">@</kbd>
                  <span>{t('aiInput.mentionClient')}</span>
                </div>
                {browserSupportsSpeechRecognition && (
                  <div className="flex items-center gap-1">
                    <Mic className="h-3 w-3" />
                    <span>{t('aiInput.voiceInput')}</span>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Auto-execute setting */}
          <div className="flex items-center gap-2">
            <Checkbox 
              id="require-confirmation" 
              checked={requireConfirmation}
              onCheckedChange={(checked) => setRequireConfirmation(checked as boolean)}
            />
            <Label 
              htmlFor="require-confirmation" 
              className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
            >
              {t('aiInput.requireConfirmation')}
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
}
