import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, User, Loader2, AlertCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIChat } from './useAIChat';
import { AIToolCard } from './AIToolCard';

interface AIMessageListProps {
  selectedClient?: {
    id: string;
    user_id: string;
    username: string;
    full_name: string;
  } | null;
}

export function AIMessageList({ selectedClient }: AIMessageListProps) {
  const { messages, sending, sendingState, loading, currentConversation } = useAIChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <ScrollArea className="flex-1 px-4 md:px-6 py-4" ref={scrollRef}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Loading state when switching conversations */}
        {loading && messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center py-12"
          >
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              <p className="text-sm text-muted-foreground">Загружаем историю...</p>
            </div>
          </motion.div>
        )}
        
        <AnimatePresence mode="popLayout">
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const isSystem = msg.role === 'system';
            const isOptimistic = msg.metadata?.isOptimistic;
            const isFailed = msg.metadata?.status === 'failed';
            
            // NEW: Detect if message looks like a plan but has no pending action
            const looksLikePlan = msg.role === 'assistant' && 
              !msg.metadata?.pendingActionId &&
              !msg.metadata?.autoExecuted &&
              !msg.metadata?.preparingPlan &&
              (
                msg.content.includes('План тренировок') || 
                msg.content.includes('Training Plan') ||
                msg.content.includes('Готовы реализовать') ||
                msg.content.includes('Ready to implement') ||
                /понедельник|вторник|среда|четверг|пятница/i.test(msg.content)
              );
            
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "flex gap-3 md:gap-4",
                  isUser ? "justify-end" : "justify-start"
                )}
              >
                {!isUser && (
                  <Avatar className="h-8 w-8 md:h-9 md:w-9 shrink-0 ring-2 ring-purple-500/20">
                    <div className="h-full w-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                  </Avatar>
                )}
                
                <div className={cn(
                  "rounded-2xl px-4 py-3 max-w-[85%] md:max-w-[75%] break-words",
                  isUser 
                    ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25" 
                    : isSystem
                    ? "bg-muted/50 border border-border"
                    : "bg-muted shadow-sm",
                  isOptimistic && "opacity-60",
                  isFailed && "opacity-40 border-2 border-destructive"
                )}>
                  {/* Show preparing indicator for assistant messages */}
                  {!isUser && (msg.metadata?.preparingPlan || msg.metadata?.status === 'preparing') && (
                    <div className="flex items-center gap-2 py-1 mb-2">
                      <Sparkles className="h-4 w-4 animate-pulse text-purple-500" />
                      <span className="text-sm text-muted-foreground">
                        Готовлю структурированный план...
                      </span>
                    </div>
                  )}
                  
                  {/* Show tool results if available */}
                  {msg.metadata?.autoExecuted && msg.metadata?.results && (
                    <div className="space-y-2 mb-3">
                      {msg.metadata.results.map((result: any, idx: number) => (
                        <AIToolCard
                          key={idx}
                          action={{
                            type: result.action || result.action_type || 'Unknown',
                            description: result.message || JSON.stringify(result.data || {}),
                            status: result.success ? 'success' : 'failed',
                            result: result.data
                          }}
                        />
                      ))}
                    </div>
                  )}
                  
                  {/* NEW: Warning for text-only plans */}
                  {looksLikePlan && (
                    <Alert className="mb-3 border-yellow-500/50 bg-yellow-500/10">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <AlertDescription className="text-xs">
                        <strong>AI создал план в виде текста.</strong> Для автоматического создания используйте 
                        более конкретную формулировку (например: "создай план тренировок для @client") 
                        или скопируйте план вручную.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {/* Message content - hide for preparing messages that are just loading */}
                  {!(msg.metadata?.preparingPlan || msg.metadata?.status === 'preparing') && (
                    <div className={cn(
                      "prose prose-sm dark:prose-invert max-w-none",
                      isUser && "prose-invert"
                    )}>
                      <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          const isInline = !match;
                          
                          return !isInline ? (
                            <SyntaxHighlighter
                              style={oneDark as any}
                              language={match[1]}
                              PreTag="div"
                              className="rounded-lg my-2 text-xs"
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          ) : (
                            <code 
                              className={cn(
                                "rounded px-1.5 py-0.5 text-xs font-mono",
                                isUser ? "bg-white/20" : "bg-black/10 dark:bg-white/10"
                              )} 
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        },
                        p({ children }) {
                          return <p className="mb-2 last:mb-0">{children}</p>;
                        },
                        ul({ children }) {
                          return <ul className="my-2 ml-4 space-y-1">{children}</ul>;
                        },
                        ol({ children }) {
                          return <ol className="my-2 ml-4 space-y-1">{children}</ol>;
                        },
                        a({ href, children }) {
                          return (
                            <a 
                              href={href} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className={cn(
                                "underline underline-offset-2",
                                isUser ? "text-white/90 hover:text-white" : "text-primary hover:text-primary/80"
                              )}
                            >
                              {children}
                            </a>
                          );
                        }
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                  
                  {/* Status indicators */}
                  {isOptimistic && !isFailed && (
                    <div className="flex items-center gap-2 mt-2 text-xs opacity-70">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Sending...</span>
                    </div>
                  )}
                  
                  {isFailed && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      <span>Failed to send</span>
                    </div>
                  )}
                </div>
                
                {isUser && (
                  <Avatar className="h-8 w-8 md:h-9 md:w-9 shrink-0 ring-2 ring-primary/20">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {/* Loading states */}
        {sending && sendingState === 'sending' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-4 justify-start"
          >
            <Avatar className="h-9 w-9 shrink-0 ring-2 ring-purple-500/20">
              <div className="h-full w-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Loader2 className="h-4 w-4 text-white animate-spin" />
              </div>
            </Avatar>
            <div className="rounded-2xl px-4 py-3 bg-muted shadow-sm">
              <span className="text-sm text-muted-foreground">Отправка сообщения...</span>
            </div>
          </motion.div>
        )}
        
        {sending && sendingState === 'processing' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-4 justify-start"
          >
            <Avatar className="h-9 w-9 shrink-0 ring-2 ring-purple-500/20">
              <div className="h-full w-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white animate-pulse" />
              </div>
            </Avatar>
            <div className="rounded-2xl px-4 py-3 bg-muted shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <motion.div
                    className="w-2 h-2 rounded-full bg-purple-500"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                  />
                  <motion.div
                    className="w-2 h-2 rounded-full bg-purple-500"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                  />
                  <motion.div
                    className="w-2 h-2 rounded-full bg-purple-500"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                  />
                </div>
                <span className="text-sm text-muted-foreground">AI думает...</span>
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
