import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '@/lib/ai/router';
import { AIRequestConfig } from '@/lib/ai/types';

export async function POST(req: NextRequest) {
    try {
        const {
            sectionTitle,
            sectionDescription,
            bookSettings,
            chapterTitle,
            previousContentSummary,
            researchContext,
            aiConfig,
        } = await req.json();
        const config: AIRequestConfig = aiConfig;

        const prompt = `
      Role: You are the author writing a specific section of the book "${bookSettings.title}".
      
      Language: Write strictly in ${bookSettings.language}.
      Book Type: ${bookSettings.bookType}
      Current Chapter: ${chapterTitle}
      Current Section: ${sectionTitle}
      
      Specific Instructions for this Section:
      ${sectionDescription}
      
      Tone & Style: ${bookSettings.toneAndStyle}
      Target Audience: ${bookSettings.targetAudience}
      
      IMPORTANT - CHARACTER NAMES:
      If this is fiction/novel content, you MUST use exactly the character names specified in the section instructions above.
      DO NOT substitute them with common/generic names like "小明", "小美", "John", "Alice", etc.
      If no character names are specified, create unique and memorable names that fit the cultural setting and time period of the story.
      Each character should have a distinctive name that readers won't confuse with characters from other stories.
      
      Story/Content Context (Summary of what came before):
      ${previousContentSummary}
      
      Research Context:
      ${researchContext}
      
      Task: Write the full content for this section. 
      Aim for depth, detail, and high quality. 
      Write in Markdown format.
      Do not output the title again, just the body content.
      Target word count for this section: 1500+ words if possible, be exhaustive.
    `;

        const result = await generateText({ config, prompt, maxTokens: 16384 });
        return NextResponse.json({ content: result.text });
    } catch (error: any) {
        console.error('Write section error:', error);
        return NextResponse.json({ error: error.message || 'Writing failed' }, { status: 500 });
    }
}
