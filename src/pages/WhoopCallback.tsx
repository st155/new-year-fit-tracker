import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function WhoopCallback() {
  useEffect(() => {
    // Legacy Whoop direct callback: safely forward to Terra or Integrations
    const search = window.location.search || "";
    const params = new URLSearchParams(search);
    const hasOAuthParams = ["code", "state", "scope", "user_id", "provider"].some((k) => params.has(k));
    const target = hasOAuthParams ? `/terra-callback${search}` : "/integrations";
    // Use replace to avoid polluting history and prevent back-button loops
    window.location.replace(target);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Перенаправляем на Terra…</span>
      </div>
    </div>
  );
}
