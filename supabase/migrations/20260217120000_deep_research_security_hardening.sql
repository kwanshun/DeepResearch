-- 1. Fix Whitelist PII Leak
DROP POLICY IF EXISTS "Allow authenticated users to read whitelist" ON deep_research.whitelist;
DROP POLICY IF EXISTS "Users can only verify their own email" ON deep_research.whitelist;

CREATE POLICY "Users can check their own whitelist status" 
ON deep_research.whitelist 
FOR SELECT 
TO authenticated 
USING (email = auth.jwt() ->> 'email');

-- 2. Helper Function for Whitelist Verification
CREATE OR REPLACE FUNCTION deep_research.is_whitelisted()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of creator (admin) to check the table
SET search_path = deep_research
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM deep_research.whitelist 
    WHERE email = auth.jwt() ->> 'email'
  );
END;
$$;

-- 3. Revoke dangerous global permissions
REVOKE ALL ON SCHEMA deep_research FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA deep_research FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA deep_research REVOKE ALL ON TABLES FROM anon;

-- 4. Add missing DELETE policy
DROP POLICY IF EXISTS "Users can delete own sessions" ON deep_research.research_sessions;
CREATE POLICY "Users can delete own sessions" 
ON deep_research.research_sessions 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);
