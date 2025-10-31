import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sparkles, User, Loader2, AlertCircle } from 'lucide-react';
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
  const { messages, sending, sendingState } = useAIChat();
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
        <AnimatePresence mode="popLayout">
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const isSystem = msg.role === 'system';
            const isOptimistic = msg.metadata?.isOptimistic;
            const isFailed = msg.metadata?.status === 'failed';
            
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
                  {/* Tool execution results */}
                  {msg.metadata?.pendingAction && (
                    <AIToolCard action={msg.metadata.pendingAction} />
                  )}
                  
                  {/* Message content */}
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
        
        {/* Loading state */}
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
