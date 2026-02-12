// AI Router — dispatches requests to the appropriate provider adapter
import { AIProvider, GenerateTextParams, GenerateJSONParams, GenerateImageParams, AITextResponse } from './types';
import { geminiGenerateText, geminiGenerateJSON, geminiGenerateImage } from './gemini';
import { openaiGenerateText, openaiGenerateJSON } from './openai-compatible';
import { claudeGenerateText, claudeGenerateJSON } from './claude';

export async function generateText(params: GenerateTextParams): Promise<AITextResponse> {
    const { provider } = params.config;

    switch (provider) {
        case 'gemini':
            return geminiGenerateText(params);
        case 'openai':
        case 'kimi':
        case 'zai':
            return openaiGenerateText(params);
        case 'claude':
            return claudeGenerateText(params);
        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }
}

export async function generateJSON(params: GenerateJSONParams): Promise<any> {
    const { provider } = params.config;

    switch (provider) {
        case 'gemini':
            return geminiGenerateJSON(params);
        case 'openai':
        case 'kimi':
        case 'zai':
            return openaiGenerateJSON(params);
        case 'claude':
            return claudeGenerateJSON(params);
        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }
}

export async function generateImage(params: GenerateImageParams): Promise<string> {
    // Currently only Gemini supports image generation in our adapter
    if (params.config.provider === 'gemini') {
        return geminiGenerateImage(params);
    }
    throw new Error(`Image generation is only supported with Gemini. Current provider: ${params.config.provider}`);
}
