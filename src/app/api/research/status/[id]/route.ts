import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/lib/gemini';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

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

    // If already completed and has content, return it
    if (session.status === 'completed' && session.report_markdown) {
      return NextResponse.json({ 
        status: 'completed',
        report_markdown: session.report_markdown,
        sources: session.sources
      });
    }

    // Poll Gemini Interactions API
    const interaction = await (ai as any).interactions.get(session.interaction_id);

    if (interaction.status === 'completed') {
      // Get the last output as per best practices in Gemini documentation
      const lastOutput = interaction.outputs?.[interaction.outputs.length - 1];
      const reportMarkdown = lastOutput?.text || '';
      const sources = lastOutput?.sources || [];

      if (reportMarkdown) {
        await supabase
          .from('research_sessions')
          .update({
            report_markdown: reportMarkdown,
            sources: sources,
            status: 'completed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('user_id', user.id);
      } else if (session.status !== 'completed') {
        // If report is still empty but Gemini says completed, we might need to wait or handle error
        console.warn(`Gemini interaction ${session.interaction_id} completed but returned empty report.`);
        await supabase
          .from('research_sessions')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('user_id', user.id);
      }

      return NextResponse.json({ 
        status: 'completed',
        report_markdown: reportMarkdown || session.report_markdown,
        sources: sources.length > 0 ? sources : session.sources
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
