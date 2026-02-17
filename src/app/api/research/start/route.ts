import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/lib/gemini';
import { createClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required and must be a string' }, { status: 400 });
    }

    if (prompt.length > 5000) {
      return NextResponse.json({ error: 'Prompt is too long (max 5000 characters)' }, { status: 400 });
    }

    // Start Deep Research interaction
    const interaction = await (ai as any).interactions.create({
      agent: 'deep-research-pro-preview-12-2025',
      input: prompt,
      background: true,
      store: true,
      agent_config: {
        type: 'deep-research',
        thinking_summaries: 'auto',
      },
    });

    // Immediately save to Supabase with user_id
    const { data, error } = await supabase
      .from('research_sessions')
      .insert({
        interaction_id: interaction.id,
        status: 'researching',
        chat_history: [{ role: 'user', content: prompt }],
        user_id: user.id, // Explicitly set user_id
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to save session' }, { status: 500 });
    }

    return NextResponse.json({ 
      id: data.id, 
      interaction_id: interaction.id 
    });
  } catch (error: any) {
    console.error('Research start error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
