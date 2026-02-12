'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { BookSettings, ResearchData } from '@/types';
import { performDeepResearch } from '@/lib/api';
import { Globe, Loader, CheckCircle2, Search, RefreshCw, AlertTriangle } from 'lucide-react';

interface ResearchViewProps {
  settings: BookSettings;
  onComplete: (data: ResearchData[]) => void;
}

const ResearchView: React.FC<ResearchViewProps> = ({ settings, onComplete }) => {
  const [researchLogs, setResearchLogs] = useState<string[]>([]);
  const [results, setResults] = useState<ResearchData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use a ref to track if we have already started research to prevent double-firing in StrictMode
  const hasStartedRef = useRef(false);

  const runResearch = useCallback(async () => {
    if (isSearching) return;

    setIsSearching(true);
    setError(null);
    setResearchLogs(prev => [...prev, `----------------------------------------`]);
    setResearchLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 初始化研究代理，目標主題: ${settings.topic}`]);

    try {
      setResearchLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 正在查詢 Google 搜尋索引 (${settings.language})...`]);

      const data = await performDeepResearch(settings.topic, settings.mustInclude, settings.language);

      setResearchLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 已分析 ${data.sourceUrls.length} 個主要來源。`]);
      setResearchLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 正在寫入知識庫...`]);

      setResults([data]);
      setResearchLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 研究完成。`]);
    } catch (err: any) {
      console.error(err);
      const errorMsg = err?.message || "未知錯誤";
      setError(errorMsg);
      setResearchLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 錯誤: ${errorMsg}`]);
    } finally {
      setIsSearching(false);
    }
  }, [settings, isSearching]);

  // Initial auto-start
  useEffect(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      runResearch();
    }
  }, [runResearch]);

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-serif font-bold text-stone-100 mb-2 flex items-center gap-3">
            <Globe className="text-blue-400" />
            深度研究階段
          </h2>
          <p className="text-stone-400">蒐集情報與語境，為您的書籍建立紮實的現實基礎。</p>
        </div>
        {!isSearching && results.length === 0 && (
          <button
            onClick={runResearch}
            className="text-amber-500 hover:text-amber-400 flex items-center gap-2 text-sm border border-stone-700 px-3 py-2 rounded bg-stone-800"
          >
            <RefreshCw size={14} /> 重試研究
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Terminal / Logs */}
        <div className="lg:col-span-1 bg-black rounded-lg border border-stone-800 p-4 font-mono text-xs text-green-400 h-96 overflow-y-auto shadow-inner flex flex-col-reverse">
          {/* Reverse logs to show newest at bottom automatically due to flex-col-reverse if we mapped reversely, but here we just scroll. */}
          {/* Actually simpler to just map normally and stick to bottom, but for now standard map */}
          <div>
            {researchLogs.map((log, i) => (
              <div key={i} className="mb-2 opacity-90 break-words">
                {log}
              </div>
            ))}
            {isSearching && (
              <div className="animate-pulse flex items-center gap-2 mt-2 text-amber-500 font-bold">
                <span className="w-2 h-4 bg-amber-500 block"></span>
                <span>AI 正在思考與撰寫報告中...</span>
              </div>
            )}
          </div>
        </div>

        {/* Results Area */}
        <div className="lg:col-span-2 space-y-4">
          {error ? (
            <div className="h-96 flex flex-col items-center justify-center text-red-400 border border-red-900/50 border-dashed rounded-lg bg-red-950/20 p-6 text-center">
              <AlertTriangle size={48} className="mb-4" />
              <p className="text-lg font-bold mb-2">研究過程中發生錯誤</p>
              <p className="text-sm opacity-80 mb-6">{error}</p>
              <button
                onClick={runResearch}
                className="bg-red-900 hover:bg-red-800 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                重新嘗試
              </button>
            </div>
          ) : results.length === 0 ? (
            <div className="h-96 flex flex-col items-center justify-center text-stone-500 border border-stone-800 border-dashed rounded-lg bg-stone-900/50">
              <Loader className="animate-spin mb-4" size={32} />
              <p>正在研究全球知識庫...</p>
              <p className="text-xs text-stone-600 mt-2">這可能需要 30-60 秒，請耐心等候</p>
            </div>
          ) : (
            <div className="h-96 overflow-y-auto border border-stone-800 rounded-lg bg-stone-900 p-6">
              <h3 className="text-amber-500 font-bold mb-4 uppercase tracking-wider text-sm flex items-center gap-2">
                <Search size={16} /> 研究摘要
              </h3>
              <div className="prose prose-invert prose-sm max-w-none text-stone-300">
                {results[0].findings ? (
                  results[0].findings.split('\n').map((line, idx) => (
                    <p key={idx} className="mb-2">{line}</p>
                  ))
                ) : (
                  <p className="italic text-stone-500">未產生文字摘要。</p>
                )}
              </div>

              {results[0].sourceUrls && results[0].sourceUrls.length > 0 && (
                <div className="mt-6 pt-4 border-t border-stone-800">
                  <h4 className="text-stone-500 text-xs font-bold uppercase mb-2">來源出處</h4>
                  <ul className="space-y-1">
                    {results[0].sourceUrls.map((url, i) => (
                      <li key={i} className="text-xs truncate text-blue-400 hover:text-blue-300">
                        <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={() => onComplete(results)}
          disabled={isSearching || results.length === 0}
          className={`
            py-3 px-6 rounded-lg font-medium flex items-center gap-2 transition-colors
            ${isSearching || results.length === 0
              ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
              : 'bg-amber-600 hover:bg-amber-700 text-white'}
          `}
        >
          <CheckCircle2 size={18} />
          確認研究資料並建立大綱
        </button>
      </div>
    </div>
  );
};

export default ResearchView;
