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
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const systemPrompt = `You are a "Research Planner." Your job is to create a detailed plan for a Deep Research task.
The user wants to research: "${prompt}"

Provide a structured plan that includes:
1. THE CORE OBJECTIVE: What is the main goal of this research?
2. KEY RESEARCH QUESTIONS: 3-5 specific questions to be answered.
3. SEARCH STRATEGY: What types of sources and keywords will be used? (Note: User provided some URLs, use them as a starting point).
4. REPORT STRUCTURE: Proposed sections for the final report.

Format your response in Markdown. Do not try to access the URLs yourself yet; just incorporate them into the strategy for the Deep Research agent.
After the plan, explain that if the user is satisfied, they can click "Proceed" to start the full research process (which takes 5-20 minutes).`;

    const response = await (ai as any).interactions.create({
      model: 'gemini-3-flash-preview',
      input: prompt,
      system_instruction: systemPrompt,
      generation_config: {
        thinking_level: 'low',
        thinking_summaries: 'auto',
      },
    });

    console.log('Planner interaction response:', JSON.stringify(response, null, 2));

    const outputs = response.outputs || [];
    const lastOutput = outputs[outputs.length - 1];
    const planMarkdown = lastOutput?.text || response.result;

    if (!planMarkdown) {
      return NextResponse.json({ error: 'Failed to generate research plan' }, { status: 500 });
    }

    return NextResponse.json({ plan: planMarkdown });

  } catch (error: any) {
    console.error('Research plan error:', error);
    // Return the actual error message for debugging
    return NextResponse.json({ 
      error: error.message || 'Internal Server Error',
      details: error.stack
    }, { status: 500 });
  }
}
