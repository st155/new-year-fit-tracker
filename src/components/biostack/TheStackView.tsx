import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { StackItemCard } from "./StackItemCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Camera, Zap, Sparkles, Clock, Sun, Sunset, Moon, Pill } from "lucide-react";
import { toast } from "sonner";
import { BottleScanner } from "./BottleScanner";
import { AIStackGenerator } from "./AIStackGenerator";
import { useLowStockAlerts } from "@/hooks/biostack/useLowStockAlerts";

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

  // Take All mutation (for a specific time)
  const takeAllMutation = useMutation({
    mutationFn: async (intakeTime: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const itemsToLog = stackItems?.filter(item => 
        item.intake_times.includes(intakeTime)
      ) || [];

      for (const item of itemsToLog) {
        await supabase
          .from('intake_logs')
          .insert({
            user_id: user.id,
            stack_item_id: item.id,
            taken_at: new Date().toISOString(),
            servings_taken: 1,
          });
      }

      return itemsToLog.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['user-stack'] });
      toast.success(`✅ Logged ${count} supplement(s)`);
    },
    onError: (error) => {
      console.error('Error taking all:', error);
      toast.error('Failed to log all supplements');
    },
  });

  if (isLoading) {
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
      <div className="flex flex-wrap items-center gap-3">
        <Button 
          variant="default"
          size="lg"
          onClick={() => takeAllMutation.mutate('morning')}
          disabled={takeAllMutation.isPending}
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold shadow-[0_0_15px_rgba(34,197,94,0.4)]"
        >
          <Zap className="h-5 w-5 mr-2" />
          Take All Morning Stack
        </Button>
        
        <Button 
          variant="outline"
          size="lg"
          onClick={() => setIsScannerOpen(true)}
          className="border-neutral-700 hover:border-blue-500 hover:shadow-[0_0_10px_rgba(59,130,246,0.3)] transition-all"
        >
          <Camera className="h-5 w-5 mr-2" />
          Scan Bottle
        </Button>

        <Button 
          variant="outline"
          size="lg"
          onClick={() => setIsAIGeneratorOpen(true)}
          className="border-neutral-700 hover:border-purple-500 hover:shadow-[0_0_10px_rgba(168,85,247,0.3)]"
        >
          <Sparkles className="h-5 w-5 mr-2" />
          AI Stack Generator
        </Button>
      </div>

      {/* Time Filter Pills */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedTime === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedTime(null)}
          className="border-neutral-700"
        >
          All
        </Button>
        {INTAKE_TIME_GROUPS.map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={selectedTime === key ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTime(key)}
            className="border-neutral-700"
          >
            <Icon className="h-3 w-3 mr-1" />
            {label}
          </Button>
        ))}
      </div>

      {/* Stack Groups */}
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
                <div className="flex items-center gap-3 mb-4">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-bold text-foreground">
                    {label}
                  </h3>
                  <span className="text-sm text-muted-foreground">
                    ({items.length})
                  </span>
                  {key !== 'as_needed' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => takeAllMutation.mutate(key)}
                      disabled={takeAllMutation.isPending}
                      className="ml-auto text-xs"
                    >
                      Take All {label}
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

        {(!filteredItems || filteredItems.length === 0) && (
          <div className="text-center py-12">
            <Pill className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No supplements in your stack yet.
            </p>
            <Button variant="outline" className="mt-4">
              <Camera className="h-4 w-4 mr-2" />
              Scan your first bottle
            </Button>
          </div>
        )}
      </div>

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
