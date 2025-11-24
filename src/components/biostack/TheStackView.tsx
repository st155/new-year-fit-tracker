import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { StackItemCard } from "./StackItemCard";
import { ProtocolCard } from "./ProtocolCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Camera, Zap, Sparkles, Clock, Sun, Sunset, Moon, Pill, FileText } from "lucide-react";
import { toast } from "sonner";
import { BottleScanner } from "./BottleScanner";
import { AIStackGenerator } from "./AIStackGenerator";
import { useLowStockAlerts } from "@/hooks/biostack/useLowStockAlerts";
import { useProtocolManagement } from "@/hooks/biostack/useProtocolManagement";

const INTAKE_TIME_GROUPS = [
  { key: 'morning', label: 'Morning Stack', icon: Sun },
  { key: 'afternoon', label: 'Afternoon Stack', icon: Sunset },
  { key: 'evening', label: 'Evening Stack', icon: Moon },
  { key: 'as_needed', label: 'As Needed', icon: Clock },
];

export function TheStackView() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isAIGeneratorOpen, setIsAIGeneratorOpen] = useState(false);

  // Protocol management
  const { 
    activeProtocols, 
    isLoading: isProtocolsLoading,
    toggleProtocolMutation,
    deleteProtocolMutation,
    logProtocolItemMutation
  } = useProtocolManagement();

  // Low stock alerts
  const { data: lowStockItems = [] } = useLowStockAlerts(user?.id);

  // Show toast notification on mount if there are low stock items
  useEffect(() => {
    if (lowStockItems.length > 0) {
      const firstItem = lowStockItems[0];
      toast.warning('⚠️ Time to reorder!', {
        description: `Your ${firstItem.supplement_products?.name || firstItem.stack_name} is running low (${firstItem.servings_remaining} servings left)`,
        duration: 5000,
      });
    }
  }, [lowStockItems.length]); // Only trigger when count changes

  // Fetch user's stack with calculated servings remaining
  const { data: stackItems, isLoading } = useQuery({
    queryKey: ['user-stack', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_stack')
        .select(`
          *,
          supplement_products (
            name,
            brand,
            form,
            servings_per_container
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('position', { ascending: true });

      if (error) throw error;

      // Calculate servings remaining for each item
      const itemsWithServings = await Promise.all(
        (data || []).map(async (item) => {
          const { count } = await supabase
            .from('intake_logs')
            .select('*', { count: 'exact', head: true })
            .eq('stack_item_id', item.id);

          const servingsPerContainer = item.supplement_products?.servings_per_container || 0;
          const servingsRemaining = servingsPerContainer - (count || 0);

          return {
            ...item,
            servingsRemaining
          };
        })
      );

      return itemsWithServings;
    },
    enabled: !!user?.id,
  });

  // Log intake mutation
  const logIntakeMutation = useMutation({
    mutationFn: async (stackItemId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('intake_logs')
        .insert({
          user_id: user.id,
          stack_item_id: stackItemId,
          taken_at: new Date().toISOString(),
          servings_taken: 1,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-stack'] });
      toast.success('✅ Intake logged successfully');
    },
    onError: (error) => {
      console.error('Error logging intake:', error);
      toast.error('Failed to log intake');
    },
  });

  // Take All mutation (for manual stack items AND protocol items)
  const takeAllMutation = useMutation({
    mutationFn: async (intakeTime: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      let totalLogged = 0;

      // 1. Log manual stack items
      const manualItems = stackItems?.filter(item => 
        item.intake_times.includes(intakeTime)
      ) || [];

      for (const item of manualItems) {
        await supabase
          .from('intake_logs')
          .insert({
            user_id: user.id,
            stack_item_id: item.id,
            taken_at: new Date().toISOString(),
            servings_taken: 1,
          });
      }
      totalLogged += manualItems.length;

      // 2. Log protocol items
      const protocolItems = activeProtocols?.flatMap(protocol => 
        protocol.protocol_items?.filter(item => 
          item.intake_times?.includes(intakeTime)
        ) || []
      ) || [];

      for (const item of protocolItems) {
        await supabase
          .from('supplement_logs')
          .update({ 
            status: 'taken',
            taken_at: new Date().toISOString(),
            servings_taken: 1
          })
          .eq('protocol_item_id', item.id)
          .eq('status', 'pending')
          .order('scheduled_time', { ascending: true })
          .limit(1);
      }
      totalLogged += protocolItems.length;

      return totalLogged;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['user-stack'] });
      queryClient.invalidateQueries({ queryKey: ['active-protocols'] });
      toast.success(`✅ Logged ${count} supplement(s)`);
    },
    onError: (error) => {
      console.error('Error taking all:', error);
      toast.error('Failed to log all supplements');
    },
  });

  if (isLoading || isProtocolsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-4">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-12 w-32" />
          <Skeleton className="h-12 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  const filteredItems = selectedTime
    ? stackItems?.filter(item => item.intake_times.includes(selectedTime))
    : stackItems;

  return (
    <div className="space-y-6">
      {/* Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
        <Button 
          variant="default"
          size="sm"
          onClick={() => takeAllMutation.mutate('morning')}
          disabled={takeAllMutation.isPending}
          className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold shadow-[0_0_15px_rgba(34,197,94,0.4)]"
        >
          <Zap className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
          <span className="hidden sm:inline">Take All Morning Stack</span>
          <span className="sm:hidden">Morning Stack</span>
        </Button>
        
        <Button 
          variant="outline"
          size="sm"
          onClick={() => setIsScannerOpen(true)}
          className="w-full sm:w-auto border-neutral-700 hover:border-blue-500 hover:shadow-[0_0_10px_rgba(59,130,246,0.3)] transition-all"
        >
          <Camera className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
          <span className="hidden sm:inline">Scan Bottle</span>
          <span className="sm:hidden">Scan</span>
        </Button>

        <Button 
          variant="outline"
          size="sm"
          onClick={() => setIsAIGeneratorOpen(true)}
          className="w-full sm:w-auto border-neutral-700 hover:border-purple-500 hover:shadow-[0_0_10px_rgba(168,85,247,0.3)]"
        >
          <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
          <span className="hidden sm:inline">AI Stack Generator</span>
          <span className="sm:hidden">AI Generator</span>
        </Button>
      </div>

      {/* Time Filter Pills */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedTime === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedTime(null)}
          className="border-neutral-700 text-xs sm:text-sm"
        >
          All
        </Button>
        {INTAKE_TIME_GROUPS.map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={selectedTime === key ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTime(key)}
            className="border-neutral-700 text-xs sm:text-sm"
          >
            <Icon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 shrink-0" />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{key === 'morning' ? 'AM' : key === 'afternoon' ? 'PM' : key === 'evening' ? 'Eve' : 'Need'}</span>
          </Button>
        ))}
      </div>

      {/* Active Protocols Section */}
      {activeProtocols.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <h2 className="text-lg sm:text-xl font-bold text-foreground">
                Active Protocols
              </h2>
            </div>
            <span className="text-sm text-muted-foreground">
              ({activeProtocols.length})
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeProtocols.map(protocol => (
              <ProtocolCard
                key={protocol.id}
                protocol={protocol}
                onToggleActive={() => toggleProtocolMutation.mutate(protocol.id)}
                onDelete={() => deleteProtocolMutation.mutate(protocol.id)}
                onLogItem={(itemId) => logProtocolItemMutation.mutate({ protocolItemId: itemId })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Manual Supplements Section */}
      {stackItems && stackItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <Pill className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <h2 className="text-lg sm:text-xl font-bold text-foreground">
                Manual Supplements
              </h2>
            </div>
            <span className="text-sm text-muted-foreground">
              ({stackItems.length})
            </span>
          </div>

          <div className="space-y-8">
            {!selectedTime ? (
              // Show grouped by time
              INTAKE_TIME_GROUPS.map(({ key, label, icon: Icon }) => {
                const items = stackItems?.filter(item => 
                  item.intake_times.includes(key)
                ) || [];

                if (items.length === 0) return null;

                return (
                  <div key={key}>
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                        <h3 className="text-base sm:text-lg font-semibold text-foreground truncate">
                          {label}
                        </h3>
                        <span className="text-sm text-muted-foreground shrink-0">
                          ({items.length})
                        </span>
                      </div>
                      {key !== 'as_needed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => takeAllMutation.mutate(key)}
                          disabled={takeAllMutation.isPending}
                          className="shrink-0 w-full sm:w-auto mt-2 sm:mt-0 text-xs"
                        >
                          <span className="hidden sm:inline">Take All {label}</span>
                          <span className="sm:hidden">Take All</span>
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {items.map(item => (
                        <StackItemCard
                          key={item.id}
                          item={item}
                          servingsRemaining={item.servingsRemaining}
                          onLogIntake={(id) => logIntakeMutation.mutate(id)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              // Show filtered results
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems?.map(item => (
                  <StackItemCard
                    key={item.id}
                    item={item}
                    servingsRemaining={item.servingsRemaining}
                    onLogIntake={(id) => logIntakeMutation.mutate(id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {activeProtocols.length === 0 && (!stackItems || stackItems.length === 0) && (
        <div className="text-center py-12">
          <Pill className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">
            No supplements in your stack yet.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Import a protocol or scan your first bottle to get started
          </p>
          <div className="flex justify-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => setIsScannerOpen(true)}
            >
              <Camera className="h-4 w-4 mr-2" />
              Scan Bottle
            </Button>
          </div>
        </div>
      )}

      {/* Bottle Scanner Modal */}
      <BottleScanner 
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['user-stack'] });
          toast.success("✅ Supplement added to your stack!");
        }}
      />

      {/* AI Stack Generator Modal */}
      <AIStackGenerator
        open={isAIGeneratorOpen}
        onOpenChange={setIsAIGeneratorOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['user-stack'] });
        }}
      />
    </div>
  );
}
