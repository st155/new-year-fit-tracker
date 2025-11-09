import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Generate demo teams for testing social features
 */
export async function generateDemoTeams(userId: string) {
  try {
    const demoTeams = [
      {
        name: '🏃 Беговой клуб',
        description: 'Ежедневные пробежки и тренировки',
        is_public: true,
        member_limit: 10,
        created_by: userId,
      },
      {
        name: '📚 Книжный челлендж',
        description: 'Читаем по книге в месяц',
        is_public: true,
        member_limit: 20,
        created_by: userId,
      },
      {
        name: '🧘 Медитация и йога',
        description: 'Практикуем mindfulness вместе',
        is_public: true,
        member_limit: 15,
        created_by: userId,
      },
    ];

    for (const team of demoTeams) {
      const { data: newTeam, error: teamError } = await supabase
        .from('habit_teams' as any)
        .insert(team)
        .select()
        .single();

      if (teamError || !newTeam) {
        console.error('Error creating team:', teamError);
        continue;
      }

      // Add creator as team member
      const { error: memberError } = await supabase
        .from('team_members' as any)
        .insert({
          team_id: (newTeam as any).id,
          user_id: userId,
          role: 'owner',
        });
        
      if (memberError) {
        console.error('Error adding team member:', memberError);
      }
    }

    toast.success('✅ Демо команды созданы!');
    return true;
  } catch (error) {
    console.error('Error generating demo teams:', error);
    toast.error('Ошибка создания демо команд');
    return false;
  }
}

/**
 * Generate demo feed events for testing social feed
 */
export async function generateDemoFeedEvents(userId: string, habitId: string, habitName: string) {
  try {
    const events = [
      {
        user_id: userId,
        habit_id: habitId,
        event_type: 'habit_completion',
        event_data: {
          habit_name: habitName,
          habit_icon: '✅',
          streak: 1,
          xp_earned: 10,
        },
        visibility: 'public',
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
      },
      {
        user_id: userId,
        habit_id: habitId,
        event_type: 'habit_completion',
        event_data: {
          habit_name: habitName,
          habit_icon: '✅',
          streak: 2,
          xp_earned: 10,
        },
        visibility: 'public',
        created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      },
      {
        user_id: userId,
        habit_id: habitId,
        event_type: 'streak_milestone',
        event_data: {
          habit_name: habitName,
          habit_icon: '🔥',
          streak: 7,
          xp_earned: 20,
        },
        visibility: 'public',
        created_at: new Date().toISOString(), // today
      },
    ];

    const { error } = await supabase
      .from('habit_feed_events' as any)
      .insert(events);

    if (error) throw error;

    toast.success('✅ Демо события созданы!');
    return true;
  } catch (error) {
    console.error('Error generating demo events:', error);
    toast.error('Ошибка создания демо событий');
    return false;
  }
}
