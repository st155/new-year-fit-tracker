import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MessageSquare, Star, AlertCircle, CheckCircle, Edit2, Trash2, Save, X } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TrainerNote {
  id: string;
  trainer_id: string;
  client_id: string;
  note_text: string;
  is_private: boolean;
  created_at: string;
}

interface TrainerNotesProps {
  clientId: string;
  clientName: string;
}

type NoteType = 'important' | 'attention' | 'progress' | 'note';

export function TrainerNotes({ clientId, clientName }: TrainerNotesProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<TrainerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState<NoteType>('note');

  useEffect(() => {
    loadNotes();
  }, [clientId]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trainer_notes')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error loading notes:', error);
      toast.error('Ошибка загрузки заметок');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !user) return;

    try {
      const { data, error } = await supabase
        .from('trainer_notes')
        .insert({
          trainer_id: user.id,
          client_id: clientId,
          note_text: newNote.trim(),
          is_private: noteType === 'important'
        })
        .select()
        .single();

      if (error) throw error;

      setNotes([data, ...notes]);
      setNewNote('');
      setNoteType('note');
      setIsAdding(false);
      toast.success('Заметка добавлена');
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Ошибка добавления заметки');
    }
  };

  const handleUpdateNote = async (noteId: string, updatedText: string) => {
    try {
      const { error } = await supabase
        .from('trainer_notes')
        .update({ note_text: updatedText })
        .eq('id', noteId);

      if (error) throw error;

      setNotes(notes.map(n => n.id === noteId ? { ...n, note_text: updatedText } : n));
      setEditingId(null);
      toast.success('Заметка обновлена');
    } catch (error) {
      console.error('Error updating note:', error);
      toast.error('Ошибка обновления заметки');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('trainer_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      setNotes(notes.filter(n => n.id !== noteId));
      toast.success('Заметка удалена');
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Ошибка удаления заметки');
    }
  };

  const getNoteIcon = (note: TrainerNote) => {
    if (note.is_private) return <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />;
    return <MessageSquare className="h-4 w-4 text-blue-500" />;
  };

  const getNoteLabel = (note: TrainerNote) => {
    if (note.is_private) return 'Важно';
    return 'Заметка';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Заметки тренера
          </CardTitle>
          <Button 
            size="sm" 
            onClick={() => setIsAdding(!isAdding)}
            variant={isAdding ? "outline" : "default"}
          >
            {isAdding ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            {isAdding ? 'Отмена' : 'Добавить'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Note Form */}
        {isAdding && (
          <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={noteType === 'note' ? 'default' : 'outline'}
                onClick={() => setNoteType('note')}
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                Заметка
              </Button>
              <Button
                size="sm"
                variant={noteType === 'important' ? 'default' : 'outline'}
                onClick={() => setNoteType('important')}
              >
                <Star className="h-3 w-3 mr-1" />
                Важно
              </Button>
              <Button
                size="sm"
                variant={noteType === 'attention' ? 'default' : 'outline'}
                onClick={() => setNoteType('attention')}
              >
                <AlertCircle className="h-3 w-3 mr-1" />
                Внимание
              </Button>
              <Button
                size="sm"
                variant={noteType === 'progress' ? 'default' : 'outline'}
                onClick={() => setNoteType('progress')}
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Прогресс
              </Button>
            </div>
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Введите заметку..."
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setIsAdding(false)}>
                Отмена
              </Button>
              <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim()}>
                <Save className="h-4 w-4 mr-2" />
                Сохранить
              </Button>
            </div>
          </div>
        )}

        {/* Notes List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">Нет заметок о клиенте</p>
            <p className="text-xs">Добавьте первую заметку о {clientName}</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {notes.map(note => (
                <div
                  key={note.id}
                  className={cn(
                    "p-4 border rounded-lg space-y-2 hover:shadow-sm transition-shadow",
                    note.is_private && "border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getNoteIcon(note)}
                      <Badge variant="outline" className="text-xs">
                        {getNoteLabel(note)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(note.created_at), 'dd MMM yyyy, HH:mm', { locale: ru })}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => setEditingId(editingId === note.id ? null : note.id)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDeleteNote(note.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {editingId === note.id ? (
                    <div className="space-y-2">
                      <Textarea
                        defaultValue={note.note_text}
                        rows={3}
                        id={`edit-${note.id}`}
                      />
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                          Отмена
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            const textarea = document.getElementById(`edit-${note.id}`) as HTMLTextAreaElement;
                            handleUpdateNote(note.id, textarea.value);
                          }}
                        >
                          Сохранить
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{note.note_text}</p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
