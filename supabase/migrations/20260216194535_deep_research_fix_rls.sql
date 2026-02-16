-- Fix Supabase RLS and ownership for research_sessions

-- 1. Add user_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'deep_research' 
                 AND table_name = 'research_sessions' 
                 AND column_name = 'user_id') THEN
    ALTER TABLE deep_research.research_sessions ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
  END IF;
END $$;

-- 2. Enable RLS
ALTER TABLE deep_research.research_sessions ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies

-- Allow users to view only their own sessions
DROP POLICY IF EXISTS "Users can view own sessions" ON deep_research.research_sessions;
CREATE POLICY "Users can view own sessions" ON deep_research.research_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own sessions
DROP POLICY IF EXISTS "Users can insert own sessions" ON deep_research.research_sessions;
CREATE POLICY "Users can insert own sessions" ON deep_research.research_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own sessions
DROP POLICY IF EXISTS "Users can update own sessions" ON deep_research.research_sessions;
CREATE POLICY "Users can update own sessions" ON deep_research.research_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- 4. Revoke public access (Ensure only authenticated users can interact if RLS is bypassed somehow)
REVOKE ALL ON deep_research.research_sessions FROM anon;
GRANT SELECT, INSERT, UPDATE ON deep_research.research_sessions TO authenticated;
GRANT ALL ON deep_research.research_sessions TO service_role;
