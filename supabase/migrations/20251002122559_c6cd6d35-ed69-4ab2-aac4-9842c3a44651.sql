-- Add preference columns to profiles for persisting settings
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notifications_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_updates boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS progress_sharing boolean DEFAULT false;