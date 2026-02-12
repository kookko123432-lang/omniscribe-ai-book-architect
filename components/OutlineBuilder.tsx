'use client';

import React, { useEffect, useState } from 'react';
import { BookSettings, BookStructure, ResearchData } from '@/types';
import { generateBookOutline } from '@/lib/api';
import { ListTree, RefreshCcw, Play, ChevronDown, ChevronRight, FileText } from 'lucide-react';

interface OutlineBuilderProps {
  settings: BookSettings;
  research: ResearchData[];
  onComplete: (structure: BookStructure) => void;
}

const OutlineBuilder: React.FC<OutlineBuilderProps> = ({ settings, research, onComplete }) => {
  const [structure, setStructure] = useState<BookStructure | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateBookOutline(settings, research);
      setStructure(result);
      // Auto expand first few
      const initialExpand: Record<string, boolean> = {};
      result.chapters.forEach((c, i) => { if (i < 2) initialExpand[c.id] = true; });
      setExpandedChapters(initialExpand);
    } catch (err) {
      setError("無法生成大綱，請重試。");
    } finally {
      setLoading(false);
    }
  };

  // Initial generation
  useEffect(() => {
    if (!structure && !loading) {
      generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleChapter = (id: string) => {
    setExpandedChapters(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const calculateTotalSections = () => {
    if (!structure) return 0;
    return structure.chapters.reduce((acc, chap) => acc + chap.sections.length, 0);
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-serif font-bold text-stone-100 mb-2 flex items-center gap-3">
            <ListTree className="text-amber-500" />
            書籍架構
          </h2>
          <p className="text-stone-400">檢視 AI 生成的結構。這將作為批次生成的藍圖。</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={generate}
            disabled={loading}
            className="text-stone-400 hover:text-white flex items-center gap-2 px-3 py-2 text-sm border border-stone-700 rounded-md hover:bg-stone-800 transition-colors"
          >
            <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
            重新生成
          </button>
        </div>
      </div>

      {loading && !structure && (
        <div className="flex flex-col items-center justify-center h-64 text-stone-500">
          <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p>正在根據 {settings.wordCountTarget} 字目標規劃書籍架構...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-800 text-red-400 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {structure && (
        <div className="space-y-4 mb-12">
          <div className="bg-stone-800/50 p-4 rounded-lg border border-stone-800 flex justify-between items-center text-sm">
            <span className="text-stone-400">總章節: <span className="text-white font-mono">{structure.chapters.length}</span></span>
            <span className="text-stone-400">總小節 (任務): <span className="text-white font-mono">{calculateTotalSections()}</span></span>
            <span className="text-stone-400">預估字數: <span className="text-white font-mono">{calculateTotalSections() * 1500} - {calculateTotalSections() * 2000}</span></span>
          </div>

          <div className="space-y-3">
            {structure.chapters.map((chapter) => (
              <div key={chapter.id} className="border border-stone-800 rounded-lg bg-stone-900 overflow-hidden">
                <button
                  onClick={() => toggleChapter(chapter.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-stone-800/50 transition-colors text-left"
                >
                  <span className="font-serif font-semibold text-lg text-stone-200">{chapter.title}</span>
                  <div className="flex items-center gap-3 text-stone-500">
                    <span className="text-xs font-mono bg-stone-800 px-2 py-1 rounded">{chapter.sections.length} 個小節</span>
                    {expandedChapters[chapter.id] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </div>
                </button>

                {expandedChapters[chapter.id] && (
                  <div className="border-t border-stone-800 bg-stone-950/30 p-2 space-y-1">
                    {chapter.sections.map((section) => (
                      <div key={section.id} className="flex items-start gap-3 p-3 rounded hover:bg-stone-900 transition-colors group">
                        <FileText size={16} className="text-stone-600 mt-1 group-hover:text-amber-500/70" />
                        <div>
                          <h4 className="text-stone-300 font-medium text-sm">{section.title}</h4>
                          <p className="text-stone-600 text-xs mt-1 line-clamp-2">{section.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4 sticky bottom-6">
            <button
              onClick={() => onComplete(structure)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-4 px-8 rounded-lg shadow-lg shadow-amber-900/20 flex items-center gap-3 transform hover:scale-105 transition-all"
            >
              <Play fill="currentColor" size={20} />
              開始生產流程
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutlineBuilder;
