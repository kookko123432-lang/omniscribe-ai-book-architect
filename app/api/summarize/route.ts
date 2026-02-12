import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '@/lib/ai/router';
import { AIRequestConfig } from '@/lib/ai/types';

export async function POST(req: NextRequest) {
    try {
        const { text, aiConfig } = await req.json();
        const config: AIRequestConfig = aiConfig;

        const prompt = `Summarize the following text in 3-4 sentences to serve as context for the continuation of the book. Capture key plot points or arguments established. Text: ${text.substring(0, 20000)}`;

        const result = await generateText({ config, prompt, maxTokens: 1024 });
        return NextResponse.json({ summary: result.text });
    } catch (error: any) {
        console.error('Summarize error:', error);
        return NextResponse.json({ error: error.message || 'Summarization failed' }, { status: 500 });
    }
}
