import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { migrateExistingHabits } from "@/lib/migrate-habits";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";

export function HabitMigrationButton({ onComplete }: { onComplete?: () => void }) {
  const { user } = useAuth();
  const [isMigrating, setIsMigrating] = useState(false);

  const handleMigrate = async () => {
    if (!user) return;

    setIsMigrating(true);
    try {
      const result = await migrateExistingHabits(user.id);
      
      if (result.success) {
        toast.success(`Обновлено ${result.migrated} привычек! 🎉`);
        onComplete?.();
      } else {
        toast.error("Ошибка при обновлении привычек");
      }
    } catch (error) {
      console.error("Migration error:", error);
      toast.error("Произошла ошибка");
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleMigrate}
      disabled={isMigrating}
      className="gap-2"
    >
      {isMigrating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Обновление...
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4" />
          Обновить привычки с AI мотивацией
        </>
      )}
    </Button>
  );
}
