import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
      const match = line.match(/^([^#\s=]+)\s*=\s*(.*)$/);
      if (match) {
        const key = match[1];
        let value = match[2].trim();
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value;
      }
    });
  }
}

loadEnv();

const apiKey = process.env.GEMINI_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!apiKey || !supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'deep_research' }
});

async function fixSession(id: string) {
  console.log(`Fixing session ${id}...`);
  
  const { data: session, error } = await supabase
    .from('research_sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !session) {
    console.error('Session not found', error);
    return;
  }

  console.log(`Found session with interaction_id: ${session.interaction_id}`);
  
  try {
    const interaction = await (ai as any).interactions.get(session.interaction_id);
    console.log(`Interaction status: ${interaction.status}`);
    
    if (interaction.status === 'completed') {
      const outputs = interaction.outputs || [];
      const lastOutput = outputs[outputs.length - 1];
      const reportMarkdown = lastOutput?.text || '';
      const sources = lastOutput?.sources || [];

      if (reportMarkdown) {
        console.log(`Found report (${reportMarkdown.length} chars). Updating DB...`);
        const { error: updateError } = await supabase
          .from('research_sessions')
          .update({
            report_markdown: reportMarkdown,
            sources: sources,
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', id);
        
        if (updateError) {
          console.error('Update error:', updateError);
        } else {
          console.log('Successfully updated session!');
        }
      } else {
        console.log('Gemini says completed but no report found in outputs.');
        console.log('Full interaction:', JSON.stringify(interaction, null, 2));
      }
    } else {
      console.log(`Interaction is still in status: ${interaction.status}`);
    }
  } catch (err) {
    console.error('Error fetching interaction:', err);
  }
}

const sessionId = process.argv[2];
if (sessionId) {
  fixSession(sessionId);
} else {
  console.error('Please provide a session ID');
}
