// Gemini adapter — uses @google/genai SDK
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { GenerateTextParams, GenerateJSONParams, GenerateImageParams, AITextResponse } from './types';

export async function geminiGenerateText(params: GenerateTextParams): Promise<AITextResponse> {
    const ai = new GoogleGenAI({ apiKey: params.config.apiKey });

    const config: any = {};
    if (params.useSearch) {
        config.tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent({
        model: params.config.model,
        contents: params.prompt,
        config,
    });

    const text = response.text || '';
    const sourceUrls: string[] = [];

    if (params.useSearch) {
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks) {
            chunks.forEach((chunk: any) => {
                if (chunk.web?.uri) sourceUrls.push(chunk.web.uri);
            });
        }
    }

    return { text, sourceUrls: [...new Set(sourceUrls)] };
}

export async function geminiGenerateJSON(params: GenerateJSONParams): Promise<any> {
    const ai = new GoogleGenAI({ apiKey: params.config.apiKey });

    const response = await ai.models.generateContent({
        model: params.config.model,
        contents: params.prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: params.schema,
        },
    });

    const text = response.text || '{}';
    const clean = text.trim().replace(/^```(?:json)?/, '').replace(/```$/, '').trim();
    return JSON.parse(clean);
}

export async function geminiGenerateImage(params: GenerateImageParams): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: params.config.apiKey });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: params.prompt }] },
        config: {
            imageConfig: { aspectRatio: params.aspectRatio || '3:4' },
        },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
    }

    throw new Error('No image data returned from Gemini');
}
