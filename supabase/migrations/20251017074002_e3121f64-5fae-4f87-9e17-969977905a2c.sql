-- Тренировочные планы
CREATE TABLE IF NOT EXISTS training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  duration_weeks INTEGER,
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage their own training plans"
  ON training_plans FOR ALL
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

-- Тренировки в плане
CREATE TABLE IF NOT EXISTS training_plan_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES training_plans(id) ON DELETE CASCADE,
  day_of_week INTEGER,
  week_number INTEGER,
  workout_name TEXT NOT NULL,
  exercises JSONB,
  instructions TEXT,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE training_plan_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage workouts in their plans"
  ON training_plan_workouts FOR ALL
  USING (EXISTS (
    SELECT 1 FROM training_plans
    WHERE training_plans.id = training_plan_workouts.plan_id
    AND training_plans.trainer_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM training_plans
    WHERE training_plans.id = training_plan_workouts.plan_id
    AND training_plans.trainer_id = auth.uid()
  ));

-- Назначенные планы
CREATE TABLE IF NOT EXISTS assigned_training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES training_plans(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT DEFAULT 'active',
  assigned_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE assigned_training_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage assigned plans"
  ON assigned_training_plans FOR ALL
  USING (auth.uid() = assigned_by OR auth.uid() = client_id)
  WITH CHECK (auth.uid() = assigned_by);

-- Задачи для клиентов
CREATE TABLE IF NOT EXISTS client_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL,
  client_id UUID NOT NULL,
  task_type TEXT,
  title TEXT NOT NULL,
  description TEXT,
  deadline DATE,
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'pending',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE client_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage their client tasks"
  ON client_tasks FOR ALL
  USING (auth.uid() = trainer_id OR auth.uid() = client_id)
  WITH CHECK (auth.uid() = trainer_id);

-- Заметки тренера о клиенте
CREATE TABLE IF NOT EXISTS trainer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL,
  client_id UUID NOT NULL,
  note_text TEXT NOT NULL,
  is_private BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE trainer_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage their notes"
  ON trainer_notes FOR ALL
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

-- Чат между тренером и клиентом
CREATE TABLE IF NOT EXISTS trainer_client_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  message_text TEXT NOT NULL,
  attachment_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE trainer_client_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their messages"
  ON trainer_client_messages FOR ALL
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = sender_id);

-- Логи действий AI
CREATE TABLE IF NOT EXISTS ai_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  action_details JSONB NOT NULL,
  client_id UUID,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ai_action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can view their own AI logs"
  ON ai_action_logs FOR SELECT
  USING (auth.uid() = trainer_id);

CREATE POLICY "System can insert AI logs"
  ON ai_action_logs FOR INSERT
  WITH CHECK (true);