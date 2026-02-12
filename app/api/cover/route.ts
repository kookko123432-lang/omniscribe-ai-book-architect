import { NextRequest, NextResponse } from 'next/server';
import { generateImage } from '@/lib/ai/router';
import { AIRequestConfig } from '@/lib/ai/types';

export async function POST(req: NextRequest) {
    try {
        const { prompt, aiConfig } = await req.json();
        const config: AIRequestConfig = aiConfig;

        const base64Image = await generateImage({ config, prompt, aspectRatio: '3:4' });
        return NextResponse.json({ image: base64Image });
    } catch (error: any) {
        console.error('Cover generation error:', error);
        return NextResponse.json(
            { error: error.message || 'Cover generation failed. Image generation is currently only supported with Gemini.' },
            { status: 500 }
        );
    }
}
