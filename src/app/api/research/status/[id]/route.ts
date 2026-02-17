import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/lib/gemini';
import { createClient } from '@/lib/supabase-server';

// Simple UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate ID
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Invalid session ID format' }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch session to get interaction_id, ensuring it belongs to the user
    const { data: session, error: sessionError } = await supabase
      .from('research_sessions')
      .select('interaction_id, status, report_markdown, sources')
      .eq('id', id)
      .eq('user_id', user.id) // Security: scope to user
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status === 'completed') {
      return NextResponse.json({ 
        status: 'completed',
        report_markdown: session.report_markdown,
        sources: session.sources
      });
    }

    // Poll Gemini Interactions API
    const interaction = await (ai as any).interactions.get(session.interaction_id);

    if (interaction.status === 'completed') {
      const reportMarkdown = interaction.outputs?.[0]?.text || '';
      const sources = interaction.outputs?.[0]?.sources || [];

      await supabase
        .from('research_sessions')
        .update({
          report_markdown: reportMarkdown,
          sources: sources,
          status: 'completed',
        })
        .eq('id', id)
        .eq('user_id', user.id);

      return NextResponse.json({ 
        status: 'completed',
        report_markdown: reportMarkdown,
        sources: sources
      });
    }

    return NextResponse.json({ 
      status: interaction.status,
      thinking_summaries: interaction.thinking_summaries
    });
  } catch (error: any) {
    console.error('Status polling error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
