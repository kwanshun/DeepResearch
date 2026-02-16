-- Create a new schema for the My App project
CREATE SCHEMA IF NOT EXISTS my_app;

-- Grant usage
GRANT USAGE ON SCHEMA my_app TO anon, authenticated, service_role;

-- Create the webapps table
CREATE TABLE IF NOT EXISTS my_app.webapps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  name TEXT NOT NULL,
  link TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE my_app.webapps ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own webapps" ON my_app.webapps
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own webapps" ON my_app.webapps
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own webapps" ON my_app.webapps
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own webapps" ON my_app.webapps
  FOR DELETE USING (auth.uid() = user_id);

-- Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON my_app.webapps TO authenticated;
GRANT ALL ON my_app.webapps TO service_role;

-- Enable Realtime for the new schema
ALTER PUBLICATION supabase_realtime ADD TABLE my_app.webapps;
