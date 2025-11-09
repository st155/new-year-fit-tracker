-- Phase 6: Part 3 - Team System

CREATE TABLE public.habit_teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_limit INTEGER DEFAULT 10,
  is_public BOOLEAN DEFAULT true,
  total_xp BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.habit_teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  contribution_xp BIGINT DEFAULT 0,
  UNIQUE(team_id, user_id),
  CHECK (role IN ('owner', 'admin', 'member'))
);

CREATE TABLE public.team_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.habit_teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  goal_type TEXT NOT NULL,
  goal_target INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reward_description TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (status IN ('active', 'completed', 'failed')),
  CHECK (goal_type IN ('total_xp', 'total_completions', 'avg_streak'))
);

CREATE INDEX idx_team_members_team ON public.team_members(team_id);
CREATE INDEX idx_team_members_user ON public.team_members(user_id);
CREATE INDEX idx_team_challenges_team ON public.team_challenges(team_id, status);

ALTER TABLE public.habit_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_challenges ENABLE ROW LEVEL SECURITY;

-- Team policies
CREATE POLICY "Anyone can view public teams"
ON public.habit_teams FOR SELECT
USING (is_public = true);

CREATE POLICY "Team members can view their teams"
ON public.habit_teams FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = habit_teams.id AND tm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create teams"
ON public.habit_teams FOR INSERT
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Team owners and admins can update"
ON public.habit_teams FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = habit_teams.id 
    AND tm.user_id = auth.uid()
    AND tm.role IN ('owner', 'admin')
  )
);

-- Team members policies
CREATE POLICY "Team members can view members"
ON public.team_members FOR SELECT
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid()
  )
);

CREATE POLICY "Team owners can manage members"
ON public.team_members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = team_members.team_id 
    AND tm.user_id = auth.uid()
    AND tm.role = 'owner'
  )
);

-- Team challenges policies
CREATE POLICY "Team members can view challenges"
ON public.team_challenges FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = team_challenges.team_id AND tm.user_id = auth.uid()
  )
);

CREATE POLICY "Team admins can create challenges"
ON public.team_challenges FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = team_challenges.team_id 
    AND tm.user_id = auth.uid()
    AND tm.role IN ('owner', 'admin')
  )
);