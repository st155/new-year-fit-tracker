import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Save, Trash2, Edit2, X } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface ClientNotesProps {
  clientId: string;
}

interface Note {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export const ClientNotes = ({ clientId }: ClientNotesProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation('trainer');
  const [newNote, setNewNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['client-notes', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_notes')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Note[];
    },
  });

  const createNote = useMutation({
    mutationFn: async (content: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('client_notes')
        .insert({
          trainer_id: user.id,
          client_id: clientId,
          content,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-notes', clientId] });
      setNewNote('');
      toast({ description: t('notes.noteAdded') });
    },
    onError: () => {
      toast({ variant: 'destructive', description: t('notes.addError') });
    },
  });

  const updateNote = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase
        .from('client_notes')
        .update({ content })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-notes', clientId] });
      setEditingId(null);
      setEditContent('');
      toast({ description: t('notes.noteUpdated') });
    },
    onError: () => {
      toast({ variant: 'destructive', description: t('notes.updateError') });
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('client_notes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-notes', clientId] });
      toast({ description: t('notes.noteDeleted') });
    },
    onError: () => {
      toast({ variant: 'destructive', description: t('notes.deleteError') });
    },
  });

  const handleStartEdit = (note: Note) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <Textarea
          placeholder={t('notes.addNotePlaceholder')}
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          className="mb-2"
        />
        <Button
          onClick={() => newNote.trim() && createNote.mutate(newNote)}
          disabled={!newNote.trim() || createNote.isPending}
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('notes.addNote')}
        </Button>
      </Card>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">{t('notes.loadingNotes')}</p>
      ) : notes.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('notes.noNotes')}</p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <Card key={note.id} className="p-4">
              {editingId === note.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => updateNote.mutate({ id: note.id, content: editContent })}
                      disabled={!editContent.trim() || updateNote.isPending}
                      size="sm"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {t('notes.save')}
                    </Button>
                    <Button onClick={handleCancelEdit} variant="outline" size="sm">
                      <X className="h-4 w-4 mr-2" />
                      {t('notes.cancel')}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm whitespace-pre-wrap mb-2">{note.content}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(note.created_at), 'dd.MM.yyyy HH:mm')}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleStartEdit(note)}
                        variant="ghost"
                        size="sm"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => deleteNote.mutate(note.id)}
                        variant="ghost"
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
