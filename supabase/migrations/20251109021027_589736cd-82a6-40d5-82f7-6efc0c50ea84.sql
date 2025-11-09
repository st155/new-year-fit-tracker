-- Habit 3.0: Foundation Tables

-- 1. Habit Bundles (morning routine, evening routine, etc.)
CREATE TABLE habit_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  time_of_day TEXT CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'night', 'anytime')),
  estimated_duration_minutes INT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habit Bundle Items (link habits to bundles)
CREATE TABLE habit_bundle_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES habit_bundles(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  position INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bundle_id, habit_id)
);

-- 3. Habit Dependencies (do X before Y)
CREATE TABLE habit_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  depends_on_habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  dependency_type TEXT CHECK (dependency_type IN ('required', 'recommended', 'blocked_by')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(habit_id, depends_on_habit_id)
);

-- 4. Community Habit Templates
CREATE TABLE habit_templates_community (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_user_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  habit_type TEXT NOT NULL,
  category TEXT,
  icon TEXT,
  color TEXT,
  custom_settings JSONB DEFAULT '{}'::jsonb,
  ai_motivation JSONB DEFAULT '[]'::jsonb,
  usage_count INT DEFAULT 0,
  rating_avg DECIMAL(3,2),
  rating_count INT DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Template Ratings
CREATE TABLE habit_template_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES habit_templates_community(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, user_id)
);

-- 6. Habit Streak History (with recovery)
CREATE TABLE habit_streak_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  streak_length INT,
  was_recovered BOOLEAN DEFAULT false,
  recovery_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. AI Insights & Coaching
CREATE TABLE habit_ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('pattern_detected', 'prediction', 'recommendation', 'celebration', 'warning', 'tip')),
  insight_text TEXT NOT NULL,
  confidence_score DECIMAL(3,2),
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Collaborative Habits (trainer-client, accountability partners)
CREATE TABLE habit_collaborations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  collaborator_user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('coach', 'accountability_partner', 'viewer')),
  can_edit BOOLEAN DEFAULT false,
  can_log BOOLEAN DEFAULT false,
  can_view BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(habit_id, collaborator_user_id)
);

-- 9. Habit Journal Entries
CREATE TABLE habit_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  mood TEXT CHECK (mood IN ('great', 'good', 'neutral', 'hard', 'terrible')),
  energy_level INT CHECK (energy_level >= 1 AND energy_level <= 5),
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Habit Achievements
CREATE TABLE habit_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  achievement_description TEXT,
  icon TEXT,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX idx_habit_bundles_user_id ON habit_bundles(user_id);
CREATE INDEX idx_habit_bundles_time_of_day ON habit_bundles(time_of_day);
CREATE INDEX idx_habit_bundle_items_bundle_id ON habit_bundle_items(bundle_id);
CREATE INDEX idx_habit_bundle_items_habit_id ON habit_bundle_items(habit_id);
CREATE INDEX idx_habit_dependencies_habit_id ON habit_dependencies(habit_id);
CREATE INDEX idx_habit_templates_community_creator ON habit_templates_community(creator_user_id);
CREATE INDEX idx_habit_templates_community_rating ON habit_templates_community(rating_avg DESC);
CREATE INDEX idx_habit_templates_community_usage ON habit_templates_community(usage_count DESC);
CREATE INDEX idx_habit_templates_community_tags ON habit_templates_community USING GIN(tags);
CREATE INDEX idx_habit_template_ratings_template ON habit_template_ratings(template_id);
CREATE INDEX idx_habit_streak_history_habit_user ON habit_streak_history(habit_id, user_id);
CREATE INDEX idx_habit_ai_insights_user_read ON habit_ai_insights(user_id, is_read);
CREATE INDEX idx_habit_ai_insights_habit ON habit_ai_insights(habit_id);
CREATE INDEX idx_habit_collaborations_habit ON habit_collaborations(habit_id);
CREATE INDEX idx_habit_collaborations_collaborator ON habit_collaborations(collaborator_user_id);
CREATE INDEX idx_habit_journal_entries_habit_date ON habit_journal_entries(habit_id, entry_date);
CREATE INDEX idx_habit_achievements_user ON habit_achievements(user_id);

-- Triggers for updated_at
CREATE TRIGGER update_habit_bundles_updated_at
  BEFORE UPDATE ON habit_bundles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_habit_templates_community_updated_at
  BEFORE UPDATE ON habit_templates_community
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies

-- Habit Bundles
ALTER TABLE habit_bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bundles"
  ON habit_bundles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bundles"
  ON habit_bundles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bundles"
  ON habit_bundles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bundles"
  ON habit_bundles FOR DELETE
  USING (auth.uid() = user_id);

-- Habit Bundle Items
ALTER TABLE habit_bundle_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bundle items"
  ON habit_bundle_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM habit_bundles
    WHERE habit_bundles.id = habit_bundle_items.bundle_id
    AND habit_bundles.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage own bundle items"
  ON habit_bundle_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM habit_bundles
    WHERE habit_bundles.id = habit_bundle_items.bundle_id
    AND habit_bundles.user_id = auth.uid()
  ));

-- Habit Dependencies
ALTER TABLE habit_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own habit dependencies"
  ON habit_dependencies FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM habits
    WHERE habits.id = habit_dependencies.habit_id
    AND habits.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage own habit dependencies"
  ON habit_dependencies FOR ALL
  USING (EXISTS (
    SELECT 1 FROM habits
    WHERE habits.id = habit_dependencies.habit_id
    AND habits.user_id = auth.uid()
  ));

-- Community Templates
ALTER TABLE habit_templates_community ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public templates"
  ON habit_templates_community FOR SELECT
  USING (true);

CREATE POLICY "Users can create templates"
  ON habit_templates_community FOR INSERT
  WITH CHECK (auth.uid() = creator_user_id);

CREATE POLICY "Creators can update own templates"
  ON habit_templates_community FOR UPDATE
  USING (auth.uid() = creator_user_id);

CREATE POLICY "Creators can delete own templates"
  ON habit_templates_community FOR DELETE
  USING (auth.uid() = creator_user_id);

-- Template Ratings
ALTER TABLE habit_template_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ratings"
  ON habit_template_ratings FOR SELECT
  USING (true);

CREATE POLICY "Users can create ratings"
  ON habit_template_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ratings"
  ON habit_template_ratings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ratings"
  ON habit_template_ratings FOR DELETE
  USING (auth.uid() = user_id);

-- Streak History
ALTER TABLE habit_streak_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streak history"
  ON habit_streak_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage streak history"
  ON habit_streak_history FOR ALL
  USING (auth.uid() = user_id);

-- AI Insights
ALTER TABLE habit_ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insights"
  ON habit_ai_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own insights"
  ON habit_ai_insights FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can create insights"
  ON habit_ai_insights FOR INSERT
  WITH CHECK (true);

-- Collaborations
ALTER TABLE habit_collaborations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view collaborations they're part of"
  ON habit_collaborations FOR SELECT
  USING (auth.uid() = owner_user_id OR auth.uid() = collaborator_user_id);

CREATE POLICY "Owners can create collaborations"
  ON habit_collaborations FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Owners can manage collaborations"
  ON habit_collaborations FOR ALL
  USING (auth.uid() = owner_user_id);

-- Journal Entries
ALTER TABLE habit_journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own journal entries"
  ON habit_journal_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own journal entries"
  ON habit_journal_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journal entries"
  ON habit_journal_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own journal entries"
  ON habit_journal_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Achievements
ALTER TABLE habit_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements"
  ON habit_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create achievements"
  ON habit_achievements FOR INSERT
  WITH CHECK (true);

-- Add new columns to existing habits table
ALTER TABLE habits ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'friends', 'public'));
ALTER TABLE habits ADD COLUMN IF NOT EXISTS time_of_day TEXT CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'night', 'anytime'));
ALTER TABLE habits ADD COLUMN IF NOT EXISTS estimated_duration_minutes INT;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS difficulty_level INT CHECK (difficulty_level >= 1 AND difficulty_level <= 5);
ALTER TABLE habits ADD COLUMN IF NOT EXISTS xp_reward INT DEFAULT 10;