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
  CheckCircle, 
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
import { ru } from "date-fns/locale";

interface TerraClientDiagnosticsProps {
  clientId: string;
  clientName: string;
}

export function TerraClientDiagnostics({ clientId, clientName }: TerraClientDiagnosticsProps) {
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
    toast.success("Reference ID скопирован");
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
          <DialogTitle>Terra диагностика: {clientName}</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            Reference ID: 
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
              Fetch Terra Users
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
                Deauth All ({terraUsers.length})
              </Button>
            )}
          </div>

          {/* Results */}
          {hasLoaded && (
            <div className="border rounded-lg">
              {terraUsers.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Terra подключений не найдено</p>
                  <p className="text-xs mt-1">Нет активных соединений для этого пользователя</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead>Terra User ID</TableHead>
                      <TableHead>Last Webhook</TableHead>
                      <TableHead>Scopes</TableHead>
                      <TableHead className="w-[100px]">Действия</TableHead>
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
                                locale: ru
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
              <p className="font-medium mb-2">Инструменты диагностики:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li><strong>Fetch Terra Users</strong> — получить все активные Terra соединения из API</li>
                <li><strong>Deauth</strong> — отключить соединение в Terra API и удалить локальный токен</li>
                <li>Если после Deauth проблема остаётся — обратитесь в поддержку Terra с Reference ID</li>
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
