import { NextRequest, NextResponse } from 'next/server';
import { generateJSON } from '@/lib/ai/router';
import { AIRequestConfig } from '@/lib/ai/types';
import { Type, Schema } from '@google/genai';

export async function POST(req: NextRequest) {
    try {
        const { settings, research, aiConfig } = await req.json();
        const config: AIRequestConfig = aiConfig;

        const researchContext = research
            .map((r: any) => `Research on ${r.query}:\n${r.findings}`)
            .join('\n\n');

        const prompt = `
      You are a professional book architect.
      Design a comprehensive book structure for a book titled "${settings.title}".
      
      Type: ${settings.bookType}
      Language: ${settings.language} (The outline titles and descriptions MUST be in ${settings.language})
      Topic: ${settings.topic}
      Target Audience: ${settings.targetAudience}
      Tone: ${settings.toneAndStyle}
      Key Elements to Include: ${settings.mustInclude}
      Target Length Strategy: The user wants a very long book (100k+ words logic). 
      
      Break the book down into Chapters.
      CRITICAL: Break each Chapter down into detailed "Sections".
      Each Section represents a writing task of approximately 1000-2000 words.
      
      Context from Research:
      ${researchContext.substring(0, 20000)}
      
      Output JSON format only. The JSON must have a "chapters" array, each with "title" (string) and "sections" array, each section has "title" (string) and "description" (string - detailed instructions for the writer AI).
    `;

        let schema: Schema | undefined;
        if (config.provider === 'gemini') {
            schema = {
                type: Type.OBJECT,
                properties: {
                    chapters: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                sections: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            title: { type: Type.STRING },
                                            description: { type: Type.STRING },
                                        },
                                        required: ['title', 'description'],
                                    },
                                },
                            },
                            required: ['title', 'sections'],
                        },
                    },
                },
                required: ['chapters'],
            };
        }

        const parsed = await generateJSON({ config, prompt, schema });

        const chapters = parsed.chapters.map((chap: any, cIdx: number) => ({
            id: `c-${cIdx}`,
            title: chap.title,
            sections: chap.sections.map((sec: any, sIdx: number) => ({
                id: `c-${cIdx}-s-${sIdx}`,
                title: sec.title,
                description: sec.description,
                status: 'pending',
                wordCount: 0,
            })),
        }));

        return NextResponse.json({ chapters });
    } catch (error: any) {
        console.error('Outline error:', error);
        return NextResponse.json({ error: error.message || 'Outline generation failed' }, { status: 500 });
    }
}
