import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  RefreshCw, 
  Search,
  CheckCircle2,
  XCircle,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  useTerraTokens,
  useUsersList,
  useCreateTerraToken,
  useUpdateTerraToken,
  useDeleteTerraToken
} from '@/hooks/admin/useTerraTokenAdmin';

const PROVIDERS = [
  { value: 'WHOOP', label: 'Whoop' },
  { value: 'GARMIN', label: 'Garmin' },
  { value: 'OURA', label: 'Oura' },
  { value: 'WITHINGS', label: 'Withings' },
  { value: 'FITBIT', label: 'Fitbit' },
  { value: 'POLAR', label: 'Polar' },
  { value: 'APPLE', label: 'Apple Health' },
];

export function TerraTokenAdmin() {
  const { data: tokens, isLoading, refetch } = useTerraTokens();
  const { data: users } = useUsersList();
  const createToken = useCreateTerraToken();
  const updateToken = useUpdateTerraToken();
  const deleteToken = useDeleteTerraToken();

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedToken, setSelectedToken] = useState<typeof tokens extends (infer T)[] ? T : never | null>(null);

  // Create form state
  const [newUserId, setNewUserId] = useState('');
  const [newTerraUserId, setNewTerraUserId] = useState('');
  const [newProvider, setNewProvider] = useState('WHOOP');

  // Edit form state
  const [editTerraUserId, setEditTerraUserId] = useState('');
  const [editProvider, setEditProvider] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);

  const filteredTokens = tokens?.filter(token => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      token.profile?.full_name?.toLowerCase().includes(query) ||
      token.terra_user_id?.toLowerCase().includes(query) ||
      token.provider.toLowerCase().includes(query) ||
      token.user_id.toLowerCase().includes(query)
    );
  });

  const filteredUsers = users?.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(query) ||
      user.user_id.toLowerCase().includes(query)
    );
  });

  const handleCreate = async () => {
    if (!newUserId || !newTerraUserId || !newProvider) return;
    
    await createToken.mutateAsync({
      user_id: newUserId,
      terra_user_id: newTerraUserId,
      provider: newProvider
    });
    
    setShowCreateDialog(false);
    setNewUserId('');
    setNewTerraUserId('');
    setNewProvider('WHOOP');
  };

  const handleEdit = async () => {
    if (!selectedToken) return;
    
    await updateToken.mutateAsync({
      id: selectedToken.id,
      terra_user_id: editTerraUserId,
      provider: editProvider,
      is_active: editIsActive
    });
    
    setShowEditDialog(false);
    setSelectedToken(null);
  };

  const handleDelete = async () => {
    if (!selectedToken) return;
    
    await deleteToken.mutateAsync(selectedToken.id);
    
    setShowDeleteDialog(false);
    setSelectedToken(null);
  };

  const openEditDialog = (token: NonNullable<typeof tokens>[0]) => {
    setSelectedToken(token);
    setEditTerraUserId(token.terra_user_id || '');
    setEditProvider(token.provider);
    setEditIsActive(token.is_active);
    setShowEditDialog(true);
  };

  const openDeleteDialog = (token: NonNullable<typeof tokens>[0]) => {
    setSelectedToken(token);
    setShowDeleteDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Terra Token Management</h2>
          <p className="text-muted-foreground">
            Управление токенами интеграций (Whoop, Garmin, etc.)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Обновить
          </Button>
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Создать токен
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по имени, Terra ID или провайдеру..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tokens Table */}
      <Card>
        <CardHeader>
          <CardTitle>Активные токены ({tokens?.length || 0})</CardTitle>
          <CardDescription>
            Связи между пользователями и их Terra User ID
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Пользователь</TableHead>
                <TableHead>Terra User ID</TableHead>
                <TableHead>Провайдер</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Последняя синхр.</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTokens?.map((token) => (
                <TableRow key={token.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={token.profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {token.profile?.full_name || 'Без имени'}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {token.user_id.substring(0, 8)}...
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {token.terra_user_id ? (
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {token.terra_user_id.substring(0, 16)}...
                      </code>
                    ) : (
                      <Badge variant="outline" className="text-destructive">
                        Отсутствует
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{token.provider}</Badge>
                  </TableCell>
                  <TableCell>
                    {token.is_active ? (
                      <div className="flex items-center gap-1 text-success">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-sm">Активен</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-destructive">
                        <XCircle className="h-4 w-4" />
                        <span className="text-sm">Неактивен</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {token.last_sync_date ? (
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(token.last_sync_date), 'dd MMM yyyy HH:mm', { locale: ru })}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(token)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(token)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!filteredTokens || filteredTokens.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Токены не найдены
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать новый токен</DialogTitle>
            <DialogDescription>
              Свяжите пользователя с его Terra User ID из Terra Dashboard
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Пользователь</Label>
              <Select value={newUserId} onValueChange={setNewUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите пользователя" />
                </SelectTrigger>
                <SelectContent>
                  {users?.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>
                            <User className="h-3 w-3" />
                          </AvatarFallback>
                        </Avatar>
                        <span>{user.full_name || user.user_id.substring(0, 8)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Terra User ID</Label>
              <Input
                placeholder="Вставьте из Terra Dashboard"
                value={newTerraUserId}
                onChange={(e) => setNewTerraUserId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Найдите в Terra Dashboard → Users → нужный пользователь → User ID
              </p>
            </div>

            <div className="space-y-2">
              <Label>Провайдер</Label>
              <Select value={newProvider} onValueChange={setNewProvider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Отмена
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={!newUserId || !newTerraUserId || createToken.isPending}
            >
              {createToken.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать токен</DialogTitle>
            <DialogDescription>
              Обновите Terra User ID или статус токена
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Avatar>
                <AvatarImage src={selectedToken?.profile?.avatar_url || undefined} />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {selectedToken?.profile?.full_name || 'Без имени'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedToken?.user_id}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Terra User ID</Label>
              <Input
                value={editTerraUserId}
                onChange={(e) => setEditTerraUserId(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Провайдер</Label>
              <Select value={editProvider} onValueChange={setEditProvider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Статус</Label>
              <Select 
                value={editIsActive ? 'active' : 'inactive'} 
                onValueChange={(v) => setEditIsActive(v === 'active')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Активен</SelectItem>
                  <SelectItem value="inactive">Неактивен</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Отмена
            </Button>
            <Button 
              onClick={handleEdit}
              disabled={updateToken.isPending}
            >
              {updateToken.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить токен?</AlertDialogTitle>
            <AlertDialogDescription>
              Токен для {selectedToken?.profile?.full_name || 'пользователя'} ({selectedToken?.provider}) будет удалён. 
              Пользователю придётся переподключить интеграцию.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteToken.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
