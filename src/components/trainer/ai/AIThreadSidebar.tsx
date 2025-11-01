import { useState } from 'react';
import { Plus, MessageSquare, Trash2, Settings as SettingsIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAIChat } from './useAIChat';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function AIThreadSidebar() {
  const { 
    conversations, 
    currentConversation, 
    selectConversation, 
    startNewConversation,
    deleteConversation
  } = useAIChat();
  const [loadingConversation, setLoadingConversation] = useState<string | null>(null);

  const handleSelectConversation = async (convId: string) => {
    console.log('🖱️ [AIThreadSidebar] Conversation clicked:', convId);
    console.log('🖱️ [AIThreadSidebar] Current conversation ID:', currentConversation?.id);
    
    // Prevent switching if already loading this conversation
    if (loadingConversation === convId) {
      console.log('⚠️ [AIThreadSidebar] Already loading this conversation');
      return;
    }
    
    // Prevent switching if already selected
    if (currentConversation?.id === convId) {
      console.log('⚠️ [AIThreadSidebar] Already selected');
      return;
    }
    
    setLoadingConversation(convId);
    console.log('🔄 [AIThreadSidebar] Switching to conversation:', convId);
    
    try {
      await selectConversation(convId);
      console.log('✅ [AIThreadSidebar] Conversation selected successfully');
    } catch (error) {
      console.error('❌ [AIThreadSidebar] Failed to select conversation:', error);
    } finally {
      setLoadingConversation(null);
    }
  };

  return (
    <div className="w-[280px] border-r bg-muted/30 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <Button 
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/25" 
          onClick={() => startNewConversation()}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>
      
      {/* Threads List */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-1">
          {conversations.length === 0 ? (
            <div className="text-center py-8 px-4">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No conversations yet</p>
              <p className="text-xs text-muted-foreground mt-1">Start a new chat to begin</p>
            </div>
          ) : (
            conversations.map(conv => {
              const isActive = currentConversation?.id === conv.id;
              
              return (
                <div
                  key={conv.id}
                  className={cn(
                    "group relative rounded-lg transition-all",
                    isActive && "bg-accent ring-2 ring-primary/20"
                  )}
                >
                  <button
                    onClick={() => handleSelectConversation(conv.id)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-lg transition-all relative",
                      "hover:bg-accent/50",
                      isActive && "bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 ring-2 ring-purple-500/50 shadow-md",
                      loadingConversation === conv.id && "opacity-50"
                    )}
                  >
                    {/* Loading spinner */}
                    {loadingConversation === conv.id && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-3 w-3 animate-spin text-primary" />
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <MessageSquare className={cn(
                        "h-4 w-4 shrink-0",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )} />
                      <span className={cn(
                        "flex-1 truncate text-sm",
                        isActive ? "font-bold text-primary" : "font-medium"
                      )}>
                        {conv.title || 'Untitled Conversation'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {conv.last_message_at && formatDistanceToNow(new Date(conv.last_message_at), { 
                        addSuffix: true,
                        locale: ru 
                      })}
                    </p>
                  </button>
                  
                  {/* Delete button - only for non-active conversations */}
                  {!isActive && (
                    <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete this conversation and all its messages.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteConversation(conv.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
      
      {/* Footer - Settings removed (low priority feature) */}
    </div>
  );
}
