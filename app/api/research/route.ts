import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '@/lib/ai/router';
import { AIRequestConfig } from '@/lib/ai/types';

export async function POST(req: NextRequest) {
    try {
        const { topic, specificFocus, language, aiConfig } = await req.json();
        const config: AIRequestConfig = aiConfig;

        const prompt = `
      Perform deep research on the topic: "${topic}".
      Specific focus areas: ${specificFocus}.
      Target Language for Output: ${language}
      
      I am writing a comprehensive book. 
      Search for key facts, recent developments, historical context, and conflicting viewpoints if applicable.
      Synthesize the information into a detailed summary in ${language} that can be used as a knowledge base for writing.
      
      Return a summary of findings in ${language}.
    `;

        // Only Gemini supports Google Search grounding
        const useSearch = config.provider === 'gemini';

        const result = await generateText({ config, prompt, useSearch });

        return NextResponse.json({
            query: topic,
            findings: result.text || 'No research findings generated.',
            sourceUrls: result.sourceUrls || [],
        });
    } catch (error: any) {
        console.error('Research error:', error);
        return NextResponse.json({ error: error.message || 'Research failed' }, { status: 500 });
    }
}
