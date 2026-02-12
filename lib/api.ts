// Frontend API client — calls /api/* routes instead of Gemini directly
import { AIRequestConfig } from '@/lib/ai/types';
import { BookSettings, ResearchData, BookStructure } from '@/types';

function getStoredAIConfig(): AIRequestConfig {
    if (typeof window === 'undefined') {
        return { provider: 'gemini', model: 'gemini-3-pro-preview', apiKey: '' };
    }
    try {
        const stored = localStorage.getItem('omniscribe-ai-config');
        if (stored) return JSON.parse(stored);
    } catch { }
    return { provider: 'gemini', model: 'gemini-3-pro-preview', apiKey: '' };
}

async function apiCall<T>(url: string, body: Record<string, any>): Promise<T> {
    const aiConfig = getStoredAIConfig();
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, aiConfig }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `API error: ${res.status}`);
    }
    return res.json();
}

export async function autofillBookSettings(topicInput: string): Promise<Partial<BookSettings>> {
    return apiCall('/api/autofill', { topicInput });
}

export async function performDeepResearch(
    topic: string,
    specificFocus: string,
    language: string
): Promise<ResearchData> {
    return apiCall('/api/research', { topic, specificFocus, language });
}

export async function generateBookOutline(
    settings: BookSettings,
    research: ResearchData[]
): Promise<BookStructure> {
    return apiCall('/api/outline', { settings, research });
}

export async function writeSectionContent(
    sectionTitle: string,
    sectionDescription: string,
    bookSettings: BookSettings,
    chapterTitle: string,
    previousContentSummary: string,
    researchData: ResearchData[]
): Promise<string> {
    const researchContext = researchData.map((r) => r.findings).join('\n\n').substring(0, 10000);
    const result = await apiCall<{ content: string }>('/api/write-section', {
        sectionTitle,
        sectionDescription,
        bookSettings,
        chapterTitle,
        previousContentSummary,
        researchContext,
    });
    return result.content;
}

export async function summarizeContext(text: string): Promise<string> {
    const result = await apiCall<{ summary: string }>('/api/summarize', { text });
    return result.summary;
}

export async function generateBookCover(prompt: string): Promise<string> {
    const result = await apiCall<{ image: string }>('/api/cover', { prompt });
    return result.image;
}
