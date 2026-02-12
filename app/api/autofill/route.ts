import { NextRequest, NextResponse } from 'next/server';
import { generateJSON } from '@/lib/ai/router';
import { AIRequestConfig } from '@/lib/ai/types';
import { Type, Schema } from '@google/genai';

export async function POST(req: NextRequest) {
    try {
        const { topicInput, aiConfig } = await req.json();
        const config: AIRequestConfig = aiConfig;

        const prompt = `
      User wants to write a book about: "${topicInput || "A trending, best-selling topic"}"
      
      Act as a creative editor. Generate a compelling premise and setup for this book.
      Return a JSON object with:
      - title: A catchy title.
      - topic: A detailed paragraph expanding on the user's input.
      - targetAudience: Specific demographics.
      - toneAndStyle: Suggest a fitting tone.
      - mustInclude: 3-5 key elements or plot points that would make this book successful.
      - bookType: Guess the best fit type ('novel', 'non-fiction', 'textbook', 'biography', 'anthology').
    `;

        let schema: Schema | undefined;
        if (config.provider === 'gemini') {
            schema = {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    topic: { type: Type.STRING },
                    targetAudience: { type: Type.STRING },
                    toneAndStyle: { type: Type.STRING },
                    mustInclude: { type: Type.STRING },
                    bookType: { type: Type.STRING },
                },
                required: ['title', 'topic', 'targetAudience', 'toneAndStyle', 'mustInclude', 'bookType'],
            };
        }

        const result = await generateJSON({ config, prompt, schema });
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Autofill error:', error);
        return NextResponse.json({ error: error.message || 'Autofill failed' }, { status: 500 });
    }
}
