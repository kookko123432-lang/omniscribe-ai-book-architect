// OpenAI-compatible adapter — works with OpenAI, Kimi, and Z AI
import OpenAI from 'openai';
import { GenerateTextParams, GenerateJSONParams, AITextResponse, PROVIDERS } from './types';

function getClient(params: GenerateTextParams | GenerateJSONParams): OpenAI {
    const providerConfig = PROVIDERS[params.config.provider];
    return new OpenAI({
        apiKey: params.config.apiKey,
        baseURL: providerConfig.baseUrl || 'https://api.openai.com/v1',
    });
}

export async function openaiGenerateText(params: GenerateTextParams): Promise<AITextResponse> {
    const client = getClient(params);

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
    if (params.systemPrompt) {
        messages.push({ role: 'system', content: params.systemPrompt });
    }
    messages.push({ role: 'user', content: params.prompt });

    const response = await client.chat.completions.create({
        model: params.config.model,
        messages,
        max_tokens: params.maxTokens || 8192,
    });

    return { text: response.choices[0]?.message?.content || '' };
}

export async function openaiGenerateJSON(params: GenerateJSONParams): Promise<any> {
    const client = getClient(params);

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
    if (params.systemPrompt) {
        messages.push({ role: 'system', content: params.systemPrompt });
    }
    messages.push({
        role: 'user',
        content: params.prompt + '\n\nYou MUST respond with valid JSON only, no markdown code blocks.',
    });

    const response = await client.chat.completions.create({
        model: params.config.model,
        messages,
        max_tokens: 8192,
        response_format: { type: 'json_object' },
    });

    const text = response.choices[0]?.message?.content || '{}';
    const clean = text.trim().replace(/^```(?:json)?/, '').replace(/```$/, '').trim();
    return JSON.parse(clean);
}
