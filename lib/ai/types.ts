// AI Provider and Model type definitions

export type AIProvider = 'gemini' | 'openai' | 'claude' | 'kimi' | 'zai';

export interface AIModelOption {
    id: string;
    name: string;
    tier: 'flagship' | 'fast' | 'legacy';
    supportsImages?: boolean;
    supportsSearch?: boolean;
}

export interface ProviderConfig {
    id: AIProvider;
    name: string;
    nameZh: string;
    baseUrl?: string; // only for OpenAI-compatible providers
    models: AIModelOption[];
    apiKeyPlaceholder: string;
    apiKeyPrefix?: string; // e.g. "sk-" for OpenAI
}

export const PROVIDERS: Record<AIProvider, ProviderConfig> = {
    gemini: {
        id: 'gemini',
        name: 'Google Gemini',
        nameZh: 'Google Gemini',
        models: [
            { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', tier: 'flagship', supportsSearch: true },
            { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', tier: 'fast' },
            { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', tier: 'legacy', supportsSearch: true },
            { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', tier: 'legacy' },
        ],
        apiKeyPlaceholder: 'AIza...',
        apiKeyPrefix: 'AIza',
    },
    openai: {
        id: 'openai',
        name: 'OpenAI',
        nameZh: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        models: [
            { id: 'gpt-5.2', name: 'GPT-5.2', tier: 'flagship' },
            { id: 'gpt-5-mini', name: 'GPT-5 Mini', tier: 'fast' },
            { id: 'gpt-4.1', name: 'GPT-4.1', tier: 'legacy' },
            { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', tier: 'legacy' },
        ],
        apiKeyPlaceholder: 'sk-...',
        apiKeyPrefix: 'sk-',
    },
    claude: {
        id: 'claude',
        name: 'Anthropic Claude',
        nameZh: 'Claude',
        models: [
            { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', tier: 'flagship' },
            { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', tier: 'fast' },
            { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', tier: 'fast' },
        ],
        apiKeyPlaceholder: 'sk-ant-...',
        apiKeyPrefix: 'sk-ant-',
    },
    kimi: {
        id: 'kimi',
        name: 'Moonshot Kimi',
        nameZh: 'Kimi (月之暗面)',
        baseUrl: 'https://api.moonshot.cn/v1',
        models: [
            { id: 'kimi-k2.5', name: 'Kimi K2.5', tier: 'flagship' },
            { id: 'kimi-k2', name: 'Kimi K2', tier: 'legacy' },
            { id: 'moonshot-v1-128k', name: 'Moonshot V1 128K', tier: 'legacy' },
        ],
        apiKeyPlaceholder: 'sk-...',
        apiKeyPrefix: 'sk-',
    },
    zai: {
        id: 'zai',
        name: 'Z AI (智谱)',
        nameZh: 'Z AI (智譜)',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        models: [
            { id: 'glm-5', name: 'GLM-5', tier: 'flagship' },
            { id: 'glm-4.7', name: 'GLM-4.7', tier: 'fast' },
            { id: 'glm-4.7-flash', name: 'GLM-4.7 Flash (免費)', tier: 'fast' },
        ],
        apiKeyPlaceholder: '你的 API Key...',
    },
};

export interface AIRequestConfig {
    provider: AIProvider;
    model: string;
    apiKey: string;
}

export interface GenerateTextParams {
    config: AIRequestConfig;
    prompt: string;
    systemPrompt?: string;
    maxTokens?: number;
    useSearch?: boolean; // Gemini only
}

export interface GenerateJSONParams {
    config: AIRequestConfig;
    prompt: string;
    systemPrompt?: string;
    schema?: any; // Gemini structured output schema
}

export interface GenerateImageParams {
    config: AIRequestConfig;
    prompt: string;
    aspectRatio?: string;
}

export interface AITextResponse {
    text: string;
    sourceUrls?: string[];
}
