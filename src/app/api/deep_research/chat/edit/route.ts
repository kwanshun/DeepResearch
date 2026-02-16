import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/lib/gemini';
import { createClient } from '@/lib/supabase-server';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    const { id, message } = await req.json();

    if (!id || !message || typeof message !== 'string') {
      return NextResponse.json({ error: 'ID and message are required' }, { status: 400 });
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: 'Message is too long (max 2000 characters)' }, { status: 400 });
    }

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Invalid session ID format' }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch current session state, ensuring it belongs to the user
    const { data: session, error: sessionError } = await supabase
      .from('research_sessions')
      .select('chat_history, report_markdown, report_history, additional_reports')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const systemPrompt = `You are the "Research Editor Agent." Your job is to manage a living research document and provide specialized reports based on user feedback.

CONTEXT:
The current report markdown is:
${session.report_markdown}

YOUR CAPABILITIES:
1. ANSWER: Answer questions about the existing report.
2. EDIT: Directly modify the primary report markdown if the user asks for changes.
3. RESEARCH: Trigger the \`trigger_deep_research\` tool for new information.
4. ADDITIONAL REPORTS: Generate specialized reports (e.g., "Findings in Graph", "Executive Summary") if requested.

RESPONSE RULES:
- If you edit the PRIMARY report, wrap the full updated markdown in <updated_report> tags.
- If you create an ADDITIONAL report, wrap it in <additional_report type="REPORT_TYPE"> tags.
- If the user asks for a specific language (e.g. Traditional Chinese), you MUST provide the output in that language.
- Stay objective and maintain a professional, McKinsey-style tone.
- Always cite sources provided in the original research.`;

    // Add user message to history
    const updatedHistory = [...(session.chat_history || []), { role: 'user', content: message }];

    // Heuristic for thinking_level as per .cursorrules
    const isEditRequest = /edit|update|summarize|change|modify|rewrite|add|remove|fix|translate|chinese|graph/i.test(message);
    const thinkingLevel = isEditRequest ? 'high' : 'low';

    // Call Gemini 3 Flash
    const response = await (ai as any).interactions.create({
      model: 'gemini-3-flash-preview', // As per .cursorrules
      input: message,
      system_instruction: systemPrompt,
      generation_config: {
        thinking_level: thinkingLevel,
        thinking_summaries: 'auto',
      },
    });

    const aiMessage = response.outputs?.[0]?.text || response.result || 'I have processed your request.';
    
    // Check for <updated_report> tags
    const updatedReportMatch = aiMessage.match(/<updated_report>([\s\S]*?)<\/updated_report>/);
    let newReportMarkdown = session.report_markdown;
    const reportHistory = session.report_history || [];
    
    if (updatedReportMatch) {
      // Save current to history before updating
      if (newReportMarkdown) {
        reportHistory.push({
          content: newReportMarkdown,
          updated_at: new Date().toISOString()
        });
      }
      newReportMarkdown = updatedReportMatch[1].trim();
    }

    // Check for <additional_report> tags
    const additionalReportMatches = aiMessage.matchAll(/<additional_report type="([\s\S]*?)">([\s\S]*?)<\/additional_report>/g);
    const additionalReports = session.additional_reports || [];
    for (const match of additionalReportMatches) {
      additionalReports.push({
        type: match[1],
        content: match[2].trim(),
        created_at: new Date().toISOString()
      });
    }

    // Update Supabase
    const finalHistory = [...updatedHistory, { role: 'assistant', content: aiMessage }];
    
    await supabase
      .from('research_sessions')
      .update({
        chat_history: finalHistory,
        report_markdown: newReportMarkdown,
        report_history: reportHistory,
        additional_reports: additionalReports,
        status: 'completed',
      })
      .eq('id', id)
      .eq('user_id', user.id);

    return NextResponse.json({ 
      message: aiMessage,
      report_markdown: newReportMarkdown
    });

  } catch (error: any) {
    console.error('Chat editor error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
