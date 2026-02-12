'use client';

import React, { useState, useEffect } from 'react';
import { PROVIDERS, AIProvider, AIRequestConfig, ProviderConfig } from '@/lib/ai/types';
import { Settings, Eye, EyeOff, Check, ChevronDown, Zap, X } from 'lucide-react';

interface AISettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const providerOrder: AIProvider[] = ['gemini', 'openai', 'claude', 'kimi', 'zai'];

const AISettingsPanel: React.FC<AISettingsPanelProps> = ({ isOpen, onClose }) => {
    const [activeProvider, setActiveProvider] = useState<AIProvider>('gemini');
    const [apiKeys, setApiKeys] = useState<Record<AIProvider, string>>({
        gemini: '', openai: '', claude: '', kimi: '', zai: '',
    });
    const [selectedModels, setSelectedModels] = useState<Record<AIProvider, string>>({
        gemini: 'gemini-3-pro-preview',
        openai: 'gpt-5.2',
        claude: 'claude-opus-4-6',
        kimi: 'kimi-k2.5',
        zai: 'glm-5',
    });
    const [currentProvider, setCurrentProvider] = useState<AIProvider>('gemini');
    const [showKey, setShowKey] = useState<Record<AIProvider, boolean>>({
        gemini: false, openai: false, claude: false, kimi: false, zai: false,
    });

    // Load from localStorage
    useEffect(() => {
        try {
            const storedKeys = localStorage.getItem('omniscribe-api-keys');
            if (storedKeys) setApiKeys(JSON.parse(storedKeys));

            const storedModels = localStorage.getItem('omniscribe-selected-models');
            if (storedModels) setSelectedModels(JSON.parse(storedModels));

            const storedConfig = localStorage.getItem('omniscribe-ai-config');
            if (storedConfig) {
                const config: AIRequestConfig = JSON.parse(storedConfig);
                setCurrentProvider(config.provider);
            }
        } catch { }
    }, []);

    // Save to localStorage whenever values change
    useEffect(() => {
        localStorage.setItem('omniscribe-api-keys', JSON.stringify(apiKeys));
        localStorage.setItem('omniscribe-selected-models', JSON.stringify(selectedModels));

        const config: AIRequestConfig = {
            provider: currentProvider,
            model: selectedModels[currentProvider],
            apiKey: apiKeys[currentProvider],
        };
        localStorage.setItem('omniscribe-ai-config', JSON.stringify(config));
    }, [apiKeys, selectedModels, currentProvider]);

    const handleActivate = (provider: AIProvider) => {
        if (!apiKeys[provider]) {
            alert('請先輸入此提供商的 API Key');
            return;
        }
        setCurrentProvider(provider);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-stone-800">
                    <div className="flex items-center gap-3">
                        <Settings className="text-amber-500" size={22} />
                        <h2 className="text-xl font-bold text-stone-100">AI 模型設定</h2>
                    </div>
                    <button onClick={onClose} className="text-stone-500 hover:text-stone-300 p-1">
                        <X size={20} />
                    </button>
                </div>

                {/* Provider Tabs */}
                <div className="flex border-b border-stone-800 overflow-x-auto">
                    {providerOrder.map((pid) => {
                        const p = PROVIDERS[pid];
                        const isActive = currentProvider === pid;
                        const hasKey = !!apiKeys[pid];
                        return (
                            <button
                                key={pid}
                                onClick={() => setActiveProvider(pid)}
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeProvider === pid
                                        ? 'text-amber-500 border-amber-500'
                                        : 'text-stone-500 border-transparent hover:text-stone-300'
                                    }`}
                            >
                                {p.nameZh}
                                {isActive && <Zap size={12} className="text-green-400" />}
                                {hasKey && !isActive && <Check size={12} className="text-stone-600" />}
                            </button>
                        );
                    })}
                </div>

                {/* Provider Content */}
                <div className="p-6 overflow-y-auto max-h-[50vh] space-y-6">
                    {(() => {
                        const provider = PROVIDERS[activeProvider];
                        return (
                            <>
                                {/* API Key */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-stone-300">
                                        {provider.name} API Key
                                    </label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <input
                                                type={showKey[activeProvider] ? 'text' : 'password'}
                                                value={apiKeys[activeProvider]}
                                                onChange={(e) =>
                                                    setApiKeys((prev) => ({ ...prev, [activeProvider]: e.target.value }))
                                                }
                                                placeholder={provider.apiKeyPlaceholder}
                                                className="w-full bg-stone-800 border border-stone-700 rounded-lg p-3 pr-10 text-stone-200 text-sm focus:ring-2 focus:ring-amber-600 focus:outline-none placeholder-stone-600 font-mono"
                                            />
                                            <button
                                                onClick={() =>
                                                    setShowKey((prev) => ({ ...prev, [activeProvider]: !prev[activeProvider] }))
                                                }
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
                                            >
                                                {showKey[activeProvider] ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-stone-600">
                                        API Key 僅存在你的瀏覽器中，不會上傳或儲存到伺服器。
                                    </p>
                                </div>

                                {/* Model Selection */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-stone-300">選擇模型</label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {provider.models.map((model) => (
                                            <button
                                                key={model.id}
                                                onClick={() =>
                                                    setSelectedModels((prev) => ({ ...prev, [activeProvider]: model.id }))
                                                }
                                                className={`p-3 rounded-lg border text-left transition-colors ${selectedModels[activeProvider] === model.id
                                                        ? 'bg-amber-900/30 border-amber-600 text-amber-100'
                                                        : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium">{model.name}</span>
                                                    <div className="flex items-center gap-2">
                                                        {model.tier === 'flagship' && (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-400 font-bold">
                                                                旗艦
                                                            </span>
                                                        )}
                                                        {model.tier === 'fast' && (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-400 font-bold">
                                                                快速
                                                            </span>
                                                        )}
                                                        {model.supportsSearch && (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/50 text-green-400 font-bold">
                                                                搜尋
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className="text-xs text-stone-600 font-mono">{model.id}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Activate button */}
                                <button
                                    onClick={() => handleActivate(activeProvider)}
                                    disabled={!apiKeys[activeProvider]}
                                    className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${currentProvider === activeProvider
                                            ? 'bg-green-700/30 border border-green-700 text-green-300 cursor-default'
                                            : apiKeys[activeProvider]
                                                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                                : 'bg-stone-800 text-stone-600 cursor-not-allowed'
                                        }`}
                                >
                                    {currentProvider === activeProvider ? (
                                        <>
                                            <Check size={16} /> 使用中
                                        </>
                                    ) : (
                                        <>
                                            <Zap size={16} /> 切換到 {provider.nameZh}
                                        </>
                                    )}
                                </button>
                            </>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
};

export default AISettingsPanel;
