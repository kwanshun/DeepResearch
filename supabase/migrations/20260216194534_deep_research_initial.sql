-- Create a new schema for the Deep Research project
CREATE SCHEMA IF NOT EXISTS deep_research;

-- Grant usage to relevant roles
GRANT USAGE ON SCHEMA deep_research TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA deep_research TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA deep_research TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA deep_research TO anon, authenticated, service_role;

-- Create the research_sessions table within the deep_research schema
CREATE TABLE IF NOT EXISTS deep_research.research_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_history JSONB DEFAULT '[]'::jsonb,
  report_markdown TEXT DEFAULT '',
  interaction_id TEXT,
  sources JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'idle', -- idle, researching, completed, failed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure future tables also get permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA deep_research GRANT ALL ON TABLES TO anon, authenticated, service_role;

-- Enable Realtime for the new schema/table
-- This is already applied, but kept here for traceability
ALTER PUBLICATION supabase_realtime ADD TABLE deep_research.research_sessions;
