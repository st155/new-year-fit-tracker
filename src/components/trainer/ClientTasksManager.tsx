import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaskCard } from './TaskCard';
import { CreateTaskDialog } from './CreateTaskDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, ListTodo } from 'lucide-react';

export const ClientTasksManager = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const { toast } = useToast();

  const loadTasks = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('client_tasks')
        .select(`
          *,
          client:profiles!client_tasks_client_id_fkey (
            username,
            full_name
          )
        `)
        .eq('trainer_id', user.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTasks(data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить задачи',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('trainer_clients')
        .select(`
          client_id,
          profiles!trainer_clients_client_id_fkey (
            user_id,
            username,
            full_name
          )
        `)
        .eq('trainer_id', user.user.id)
        .eq('active', true);

      if (error) throw error;

      setClients(data.map((c: any) => c.profiles));
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  useEffect(() => {
    loadTasks();
    loadClients();
  }, []);

  const filterTasks = (status: string) => {
    if (status === 'all') return tasks;
    return tasks.filter(t => t.status === status);
  };

  if (loading) {
    return <div className="text-center py-8">Загрузка...</div>;
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Задачи клиентов</h3>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Создать задачу
          </Button>
        </div>

        <Tabs defaultValue="all">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">
              Все ({tasks.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              В ожидании ({filterTasks('pending').length})
            </TabsTrigger>
            <TabsTrigger value="in_progress">
              В процессе ({filterTasks('in_progress').length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Завершено ({filterTasks('completed').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-3 mt-4">
            {tasks.length === 0 ? (
              <Card className="p-8 text-center">
                <ListTodo className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Нет задач</h3>
                <p className="text-muted-foreground mb-4">
                  Создайте первую задачу для клиентов
                </p>
                <Button onClick={() => setShowCreate(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Создать задачу
                </Button>
              </Card>
            ) : (
              tasks.map(task => (
                <TaskCard key={task.id} task={task} onUpdate={loadTasks} />
              ))
            )}
          </TabsContent>

          {['pending', 'in_progress', 'completed'].map(status => (
            <TabsContent key={status} value={status} className="space-y-3 mt-4">
              {filterTasks(status).map(task => (
                <TaskCard key={task.id} task={task} onUpdate={loadTasks} />
              ))}
              {filterTasks(status).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Нет задач с этим статусом
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <CreateTaskDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={loadTasks}
        clients={clients}
      />
    </>
  );
};
