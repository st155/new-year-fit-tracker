-- Add AI-generated summary and insights fields to inbody_analyses table
ALTER TABLE public.inbody_analyses
ADD COLUMN IF NOT EXISTS ai_summary TEXT,
ADD COLUMN IF NOT EXISTS ai_insights TEXT[];