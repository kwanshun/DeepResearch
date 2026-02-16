-- Create whitelist table for access control
CREATE TABLE IF NOT EXISTS deep_research.whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE deep_research.whitelist ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT ON deep_research.whitelist TO authenticated, service_role;

-- Add a policy to allow authenticated users to read the whitelist
-- Check if the policy exists before creating it to avoid errors
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'deep_research'
        AND tablename = 'whitelist'
        AND policyname = 'Allow authenticated users to read whitelist'
    ) THEN
        CREATE POLICY "Allow authenticated users to read whitelist"
        ON deep_research.whitelist
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END
$$;
