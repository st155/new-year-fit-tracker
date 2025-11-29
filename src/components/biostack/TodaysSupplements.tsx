import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTodaysSupplements } from "@/hooks/biostack/useTodaysSupplements";
import { Sunrise, Sun, Moon, Pill, CheckCircle2, Camera, Sparkles, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { BulkPhotoUploader } from "./BulkPhotoUploader";
import { AIStackGenerator } from "./AIStackGenerator";
import { CompactSupplementChip } from "./CompactSupplementChip";
import { ProtocolManagementModal } from "./ProtocolManagementModal";
import { ProductPhotoUploader } from "./ProductPhotoUploader";

const TIME_GROUPS = [
  { 
    key: 'morning', 
    label: 'Morning', 
    icon: Sunrise, 
    color: 'text-amber-500' 
  },
  { 
    key: 'afternoon', 
    label: 'Afternoon', 
    icon: Sun, 
    color: 'text-orange-500' 
  },
  { 
    key: 'evening', 
    label: 'Evening', 
    icon: Moon, 
    color: 'text-indigo-500' 
  },
  { 
    key: 'before_sleep', 
    label: 'Before Sleep', 
    icon: Moon, 
    color: 'text-purple-500' 
  },
];

export function TodaysSupplements() {
  const { groupedSupplements, logIntakeMutation } = useTodaysSupplements();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isBulkUploaderOpen, setIsBulkUploaderOpen] = useState(false);
  const [isAIGeneratorOpen, setIsAIGeneratorOpen] = useState(false);
  const [isManageProtocolsOpen, setIsManageProtocolsOpen] = useState(false);
  const [photoUploaderProduct, setPhotoUploaderProduct] = useState<{ id: string; name: string } | null>(null);

  const handleToggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    const allIds = Object.values(groupedSupplements)
      .flat()
      .filter(item => !item.takenToday)
      .map(item => item.id);
    setSelectedItems(new Set(allIds));
  };

  const handleDeselectAll = () => {
    setSelectedItems(new Set());
  };

  const handleLogSelected = () => {
    const items = Object.values(groupedSupplements)
      .flat()
      .filter(item => selectedItems.has(item.id));
    
    logIntakeMutation.mutate(items);
    setSelectedItems(new Set());
  };

  const handleTakeAllTime = (timeKey: string) => {
    const items = groupedSupplements[timeKey as keyof typeof groupedSupplements]
      .filter(item => !item.takenToday);
    
    logIntakeMutation.mutate(items);
  };

  const totalPending = Object.values(groupedSupplements)
    .flat()
    .filter(item => !item.takenToday).length;

  if (totalPending === 0) {
    return (
      <Card className="p-8 bg-neutral-950 border border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.1)]">
        <div className="text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
          <h3 className="text-xl font-bold text-green-500">All Done for Today! 🎉</h3>
          <p className="text-muted-foreground">
            You've logged all your scheduled supplements
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Quick Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Pill className="h-6 w-6 text-green-500" />
            Today's Supplements
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {totalPending} pending supplements
          </p>
        </div>
        
        {/* Quick Actions */}
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            size="sm"
            onClick={() => setIsManageProtocolsOpen(true)}
            className="border-green-500/30 hover:border-green-500/50 hover:bg-green-500/10"
          >
            <Settings className="h-4 w-4 mr-2" />
            Manage Protocols
          </Button>
          
          <Button 
            variant="outline"
            size="sm"
            onClick={() => setIsBulkUploaderOpen(true)}
            className="border-blue-500/30 hover:border-blue-500/50 hover:bg-blue-500/10"
          >
            <Camera className="h-4 w-4 mr-2" />
            Scan Bottle
          </Button>
          
          <Button 
            variant="outline"
            size="sm"
            onClick={() => setIsAIGeneratorOpen(true)}
            className="border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/10"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            AI Generator
          </Button>
        </div>
      </div>

      {/* Time Groups */}
      <div className="space-y-6">
        {TIME_GROUPS.map(timeGroup => {
          const items = groupedSupplements[timeGroup.key as keyof typeof groupedSupplements];
          const pendingItems = items.filter(item => !item.takenToday);
          
          if (items.length === 0) return null;

          const Icon = timeGroup.icon;

          return (
            <motion.div
              key={timeGroup.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-neutral-950 border border-border/50 overflow-hidden">
                {/* Time Header */}
                <div className="px-6 py-4 border-b border-border/50 bg-neutral-900/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${timeGroup.color}`} />
                    <h3 className="font-bold text-foreground uppercase tracking-wider text-sm">
                      {timeGroup.label}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {items.length}
                    </Badge>
                  </div>
                  {pendingItems.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTakeAllTime(timeGroup.key)}
                      className="text-xs border-green-500/30 hover:bg-green-500/10 hover:border-green-500/50"
                    >
                      Take All {timeGroup.label}
                    </Button>
                  )}
                </div>

                {/* Items Grid */}
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {items.map((item) => (
                    <CompactSupplementChip
                      key={item.id}
                      item={item}
                      isSelected={selectedItems.has(item.id)}
                      onToggle={() => handleToggleItem(item.id)}
                      onAddPhoto={(productId, productName) => setPhotoUploaderProduct({ id: productId, name: productName })}
                    />
                  ))}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Floating Action Bar */}
      {selectedItems.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50"
        >
          <Card className="px-6 py-4 bg-neutral-950 border border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.3)] flex items-center gap-4">
            <span className="text-sm font-medium text-foreground">
              {selectedItems.size} selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleDeselectAll}
                className="border-border/50"
              >
                Deselect All
              </Button>
              <Button
                size="sm"
                onClick={handleLogSelected}
                disabled={logIntakeMutation.isPending}
                className="bg-green-500 hover:bg-green-600 text-white shadow-[0_0_20px_rgba(34,197,94,0.4)]"
              >
                {logIntakeMutation.isPending ? 'Logging...' : `Log Selected (${selectedItems.size})`}
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Quick Actions */}
      {totalPending > 0 && selectedItems.size === 0 && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={handleSelectAll}
            className="border-green-500/30 hover:bg-green-500/10 hover:border-green-500/50"
          >
            Select All Pending
          </Button>
        </div>
      )}

      {/* Modals */}
      <ProtocolManagementModal
        isOpen={isManageProtocolsOpen}
        onClose={() => setIsManageProtocolsOpen(false)}
      />
      
      <BulkPhotoUploader 
        open={isBulkUploaderOpen}
        onOpenChange={setIsBulkUploaderOpen}
        onComplete={() => {
          // Queries will auto-refresh via useTodaysSupplements hook
        }}
      />
      
      <AIStackGenerator
        open={isAIGeneratorOpen}
        onOpenChange={setIsAIGeneratorOpen}
      />
      
      {photoUploaderProduct && (
        <ProductPhotoUploader
          isOpen={!!photoUploaderProduct}
          onClose={() => setPhotoUploaderProduct(null)}
          productId={photoUploaderProduct.id}
          productName={photoUploaderProduct.name}
        />
      )}
    </div>
  );
}
