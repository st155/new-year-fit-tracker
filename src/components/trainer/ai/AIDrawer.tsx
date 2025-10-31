import { Drawer } from 'vaul';
import { motion } from 'framer-motion';
import { Sparkles, X, History, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AIMessageList } from './AIMessageList';
import { AIInput } from './AIInput';
import { AIThreadSidebar } from './AIThreadSidebar';
import { useIsMobile } from '@/hooks/use-mobile';

interface AIDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedClient?: {
    id: string;
    user_id: string;
    username: string;
    full_name: string;
  } | null;
}

export function AIDrawer({ open, onOpenChange, selectedClient }: AIDrawerProps) {
  const isMobile = useIsMobile();

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        {/* Overlay with gradient blur */}
        <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
        
        {/* Main Drawer */}
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mt-24 flex h-full max-h-[95%] flex-col rounded-t-[24px] bg-background border-t-2 border-primary/20 shadow-2xl">
          
          {/* Drag handle */}
          <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 blur-lg opacity-50" />
                <motion.div 
                  className="relative h-10 w-10 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
                  animate={{ 
                    boxShadow: [
                      '0 0 20px rgba(168, 85, 247, 0.4)',
                      '0 0 40px rgba(236, 72, 153, 0.6)',
                      '0 0 20px rgba(168, 85, 247, 0.4)',
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles className="h-5 w-5 text-white" />
                </motion.div>
              </div>
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  AI Assistant
                </h2>
                <p className="text-xs text-muted-foreground">
                  Powered by Gemini 2.5 Flash
                </p>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                className="h-9 w-9 rounded-full"
              >
                <History className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-9 w-9 rounded-full"
              >
                <SettingsIcon className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onOpenChange(false)}
                className="h-9 w-9 rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          {/* Chat Area - 2 columns on desktop */}
          <div className="flex flex-1 overflow-hidden">
            {/* Thread Sidebar (hidden on mobile) */}
            {!isMobile && <AIThreadSidebar />}
            
            {/* Main Chat */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <AIMessageList selectedClient={selectedClient} />
              <AIInput selectedClient={selectedClient} />
            </div>
          </div>
          
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
