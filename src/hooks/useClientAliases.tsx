import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ClientAlias {
  id: string;
  trainer_id: string;
  client_id: string;
  alias_name: string;
  used_count: number;
  created_at: string;
}

export const useClientAliases = (trainerId: string | undefined) => {
  const { t } = useTranslation('trainerDashboard');
  const [aliases, setAliases] = useState<ClientAlias[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadAliases = async () => {
    if (!trainerId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('client_aliases')
        .select('*')
        .eq('trainer_id', trainerId)
        .order('used_count', { ascending: false });

      if (error) throw error;
      setAliases(data || []);
    } catch (error) {
      console.error('Error loading aliases:', error);
      toast({
        title: t('aliases.loadError'),
        description: t('aliases.loadErrorDesc'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveAlias = async (clientId: string, aliasName: string) => {
    if (!trainerId || !aliasName.trim()) return;

    try {
      // Check for conflicts
      const { data: existing } = await supabase
        .from('client_aliases')
        .select('*')
        .eq('trainer_id', trainerId)
        .eq('alias_name', aliasName.trim())
        .neq('client_id', clientId)
        .single();

      if (existing) {
        toast({
          title: t('aliases.conflict'),
          description: t('aliases.conflictDesc', { name: aliasName }),
          variant: "destructive"
        });
        return false;
      }

      const { error } = await supabase
        .from('client_aliases')
        .insert({
          trainer_id: trainerId,
          client_id: clientId,
          alias_name: aliasName.trim()
        });

      if (error) throw error;
      
      await loadAliases();
      return true;
    } catch (error) {
      console.error('Error saving alias:', error);
      toast({
        title: t('aliases.saveError'),
        description: t('aliases.saveErrorDesc'),
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteAlias = async (aliasId: string) => {
    try {
      const { error } = await supabase
        .from('client_aliases')
        .delete()
        .eq('id', aliasId);

      if (error) throw error;
      
      await loadAliases();
      return true;
    } catch (error) {
      console.error('Error deleting alias:', error);
      toast({
        title: t('aliases.deleteError'),
        description: t('aliases.deleteErrorDesc'),
        variant: "destructive"
      });
      return false;
    }
  };

  const updateAlias = async (aliasId: string, newAliasName: string) => {
    if (!newAliasName.trim()) return false;

    try {
      const { error } = await supabase
        .from('client_aliases')
        .update({ alias_name: newAliasName.trim() })
        .eq('id', aliasId);

      if (error) throw error;
      
      await loadAliases();
      return true;
    } catch (error) {
      console.error('Error updating alias:', error);
      toast({
        title: t('aliases.updateError'),
        description: t('aliases.updateErrorDesc'),
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    loadAliases();
  }, [trainerId]);

  return {
    aliases,
    loading,
    saveAlias,
    deleteAlias,
    updateAlias,
    reloadAliases: loadAliases
  };
};
