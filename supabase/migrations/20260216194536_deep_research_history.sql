-- Add report_history and additional_reports columns to research_sessions
ALTER TABLE deep_research.research_sessions 
ADD COLUMN IF NOT EXISTS report_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS additional_reports JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN deep_research.research_sessions.report_history IS 'Stores previous versions of the report_markdown';
COMMENT ON COLUMN deep_research.research_sessions.additional_reports IS 'Stores different types of reports (e.g., graphs, summaries)';
