import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  RefreshCw, 
  Loader2, 
  Unlink, 
  AlertCircle, 
  Copy,
  Settings2
} from "lucide-react";
import { 
  useGetTerraUsers, 
  useDeauthTerraUser, 
  useDeauthAllTerraUsers,
  TerraApiUser 
} from "@/hooks/admin/useTerraTokenAdmin";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ru, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";

interface TerraClientDiagnosticsProps {
  clientId: string;
  clientName: string;
}

export function TerraClientDiagnostics({ clientId, clientName }: TerraClientDiagnosticsProps) {
  const { t, i18n } = useTranslation('trainer');
  const dateLocale = i18n.language === 'ru' ? ru : enUS;
  
  const [open, setOpen] = useState(false);
  const [terraUsers, setTerraUsers] = useState<TerraApiUser[]>([]);
  const [referenceId, setReferenceId] = useState<string>("");
  const [hasLoaded, setHasLoaded] = useState(false);

  const getTerraUsers = useGetTerraUsers();
  const deauthTerraUser = useDeauthTerraUser();
  const deauthAllTerraUsers = useDeauthAllTerraUsers();

  const handleFetchTerraUsers = async () => {
    try {
      const result = await getTerraUsers.mutateAsync(clientId);
      setTerraUsers(result.users || []);
      setReferenceId(result.reference_id);
      setHasLoaded(true);
    } catch (error) {
      console.error("Error fetching Terra users:", error);
    }
  };

  const handleDeauthSingle = async (terraUserId: string, provider: string) => {
    try {
      await deauthTerraUser.mutateAsync({ terraUserId, provider });
      // Refetch after deauth
      await handleFetchTerraUsers();
    } catch (error) {
      console.error("Error deauthing Terra user:", error);
    }
  };

  const handleDeauthAll = async () => {
    try {
      await deauthAllTerraUsers.mutateAsync({ targetUserId: clientId });
      // Refetch after deauth
      await handleFetchTerraUsers();
    } catch (error) {
      console.error("Error deauthing all Terra users:", error);
    }
  };

  const copyReferenceId = () => {
    navigator.clipboard.writeText(clientId);
    toast.success(t('terraDiag.copied'));
  };

  const isLoading = getTerraUsers.isPending;
  const isDeauthing = deauthTerraUser.isPending || deauthAllTerraUsers.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 gap-1">
          <Settings2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Terra</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('terraDiag.title', { name: clientName })}</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            {t('terraDiag.referenceId')}: 
            <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">
              {clientId}
            </code>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyReferenceId}>
              <Copy className="h-3 w-3" />
            </Button>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Action buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={handleFetchTerraUsers} 
              disabled={isLoading}
              variant="outline"
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {t('terraDiag.fetchUsers')}
            </Button>

            {terraUsers.length > 0 && (
              <Button 
                onClick={handleDeauthAll}
                disabled={isDeauthing}
                variant="destructive"
                className="gap-2"
              >
                {isDeauthing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Unlink className="h-4 w-4" />
                )}
                {t('terraDiag.deauthAll', { count: terraUsers.length })}
              </Button>
            )}
          </div>

          {/* Results */}
          {hasLoaded && (
            <div className="border rounded-lg">
              {terraUsers.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>{t('terraDiag.noConnections')}</p>
                  <p className="text-xs mt-1">{t('terraDiag.noActiveConnections')}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('terraDiag.provider')}</TableHead>
                      <TableHead>{t('terraDiag.terraUserId')}</TableHead>
                      <TableHead>{t('terraDiag.lastWebhook')}</TableHead>
                      <TableHead>{t('terraDiag.scopes')}</TableHead>
                      <TableHead className="w-[100px]">{t('terraDiag.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {terraUsers.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell>
                          <Badge variant="secondary" className="uppercase">
                            {user.provider}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">
                            {user.user_id.substring(0, 8)}...
                          </code>
                        </TableCell>
                        <TableCell>
                          {user.last_webhook_update ? (
                            <span className="text-sm">
                              {formatDistanceToNow(new Date(user.last_webhook_update), {
                                addSuffix: true,
                                locale: dateLocale
                              })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground truncate max-w-[150px] block">
                            {user.scopes || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-destructive hover:text-destructive"
                            onClick={() => handleDeauthSingle(user.user_id, user.provider)}
                            disabled={isDeauthing}
                          >
                            {isDeauthing ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Unlink className="h-3 w-3" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}

          {/* Help text */}
          {!hasLoaded && (
            <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
              <p className="font-medium mb-2">{t('terraDiag.helpTitle')}</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>{t('terraDiag.helpFetch')}</li>
                <li>{t('terraDiag.helpDeauth')}</li>
                <li>{t('terraDiag.helpSupport')}</li>
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
