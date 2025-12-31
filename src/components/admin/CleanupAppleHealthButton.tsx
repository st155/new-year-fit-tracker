import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useCleanupAppleHealth } from "@/hooks/useCleanupAppleHealth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export function CleanupAppleHealthButton() {
  const { t } = useTranslation('admin');
  const [userId, setUserId] = useState<string | null>(null);
  const cleanup = useCleanupAppleHealth();

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  const handleCleanup = () => {
    if (!userId) return;
    if (window.confirm(t('appleHealth.confirmDelete'))) {
      cleanup.mutate(userId);
    }
  };

  if (!userId) return null;

  return (
    <Button
      onClick={handleCleanup}
      variant="destructive"
      disabled={cleanup.isPending}
      className="gap-2"
    >
      <Trash2 className="h-4 w-4" />
      {cleanup.isPending ? t('appleHealth.deleting') : t('appleHealth.deleteButton')}
    </Button>
  );
}
