// Claude adapter — uses @anthropic-ai/sdk
import Anthropic from '@anthropic-ai/sdk';
import { GenerateTextParams, GenerateJSONParams, AITextResponse } from './types';

function getClient(apiKey: string): Anthropic {
    return new Anthropic({ apiKey });
}

export async function claudeGenerateText(params: GenerateTextParams): Promise<AITextResponse> {
    const client = getClient(params.config.apiKey);

    const response = await client.messages.create({
        model: params.config.model,
        max_tokens: params.maxTokens || 8192,
        system: params.systemPrompt || '',
        messages: [{ role: 'user', content: params.prompt }],
    });

    const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

    return { text };
}

export async function claudeGenerateJSON(params: GenerateJSONParams): Promise<any> {
    const client = getClient(params.config.apiKey);

    const response = await client.messages.create({
        model: params.config.model,
        max_tokens: 8192,
        system: (params.systemPrompt || '') + '\nYou MUST respond with valid JSON only, no markdown code blocks.',
        messages: [{ role: 'user', content: params.prompt }],
    });

    const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

    const clean = text.trim().replace(/^```(?:json)?/, '').replace(/```$/, '').trim();
    return JSON.parse(clean);
}
