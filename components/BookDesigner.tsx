'use client';

import React, { useState } from 'react';
import { BookProject, LayoutSettings } from '@/types';
import { generateBookCover } from '@/lib/api';
import { Printer, Download, Image as ImageIcon, Sparkles, Layout as LayoutIcon, Type, RefreshCw, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface BookDesignerProps {
  project: BookProject;
  setProject: React.Dispatch<React.SetStateAction<BookProject | null>>;
}

const BookDesigner: React.FC<BookDesignerProps> = ({ project, setProject }) => {
  const [activeTab, setActiveTab] = useState<'cover' | 'layout' | 'preview'>('cover');
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [coverPrompt, setCoverPrompt] = useState(`A minimalistic and artistic book cover for a book titled "${project.settings.title}". The book is about ${project.settings.topic}. Style: ${project.settings.toneAndStyle}. No text.`);

  const handleGenerateCover = async () => {
    setIsGeneratingCover(true);
    try {
      const base64Image = await generateBookCover(coverPrompt);
      setProject(prev => prev ? { ...prev, coverImage: base64Image } : null);
    } catch (e) {
      console.error(e);
      alert("封面生成失敗，可能是 API 額度限制，請稍後再試。");
    } finally {
      setIsGeneratingCover(false);
    }
  };

  const updateLayout = (updates: Partial<LayoutSettings>) => {
    setProject(prev => prev ? { ...prev, layoutSettings: { ...prev.layoutSettings, ...updates } } : null);
  };

  const getFontFamily = () => {
    switch (project.layoutSettings.fontFamily) {
      case 'serif': return 'font-book-serif';
      case 'sans': return 'font-book-sans';
      case 'round': return 'font-book-round';
      default: return 'font-serif';
    }
  };

  const getThemeClasses = () => {
    switch (project.layoutSettings.theme) {
      case 'modern': return 'bg-white text-slate-900';
      case 'scifi': return 'bg-slate-900 text-slate-200';
      case 'classic': default: return 'bg-[#fdfbf7] text-[#2d2a2e]';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex h-full flex-col md:flex-row relative">
      {/* Settings Panel (Hidden when printing) */}
      <div className="w-full md:w-96 bg-stone-950 border-r border-stone-800 flex flex-col no-print overflow-y-auto">
        <div className="p-6 border-b border-stone-800">
          <h2 className="text-xl font-bold text-stone-100 flex items-center gap-2">
            <LayoutIcon className="text-amber-500" />
            設計與出版
          </h2>
          <p className="text-stone-500 text-sm mt-1">打造專業書籍外觀</p>
        </div>

        <div className="flex border-b border-stone-800">
          <button
            onClick={() => setActiveTab('cover')}
            className={`flex-1 py-3 text-sm font-medium ${activeTab === 'cover' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-stone-500 hover:text-stone-300'}`}
          >
            封面設計
          </button>
          <button
            onClick={() => setActiveTab('layout')}
            className={`flex-1 py-3 text-sm font-medium ${activeTab === 'layout' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-stone-500 hover:text-stone-300'}`}
          >
            排版設定
          </button>
        </div>

        <div className="p-6 flex-1 space-y-8">
          {activeTab === 'cover' && (
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-stone-300 mb-2 block">AI 封面提示詞</label>
                <textarea
                  value={coverPrompt}
                  onChange={(e) => setCoverPrompt(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg p-3 text-stone-300 text-sm h-32 focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <button
                onClick={handleGenerateCover}
                disabled={isGeneratingCover}
                className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"
              >
                {isGeneratingCover ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                {project.coverImage ? '重新生成' : '生成封面'}
              </button>

              {project.coverImage && (
                <div className="border border-stone-700 rounded-lg overflow-hidden shadow-2xl relative group">
                  <img src={project.coverImage} alt="Cover" className="w-full aspect-[3/4] object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <p className="text-white text-sm font-medium">預覽</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'layout' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-medium text-stone-300 flex items-center gap-2">
                  <Type size={16} /> 字體風格
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => updateLayout({ fontFamily: 'serif' })}
                    className={`p-3 rounded border text-left font-serif ${project.layoutSettings.fontFamily === 'serif' ? 'bg-amber-900/30 border-amber-600 text-amber-100' : 'bg-stone-900 border-stone-700 text-stone-400'}`}
                  >
                    <span className="block text-sm font-bold">經典襯線 (Serif)</span>
                    <span className="text-xs opacity-70">適合小說、文學作品</span>
                  </button>
                  <button
                    onClick={() => updateLayout({ fontFamily: 'sans' })}
                    className={`p-3 rounded border text-left font-sans ${project.layoutSettings.fontFamily === 'sans' ? 'bg-amber-900/30 border-amber-600 text-amber-100' : 'bg-stone-900 border-stone-700 text-stone-400'}`}
                  >
                    <span className="block text-sm font-bold">現代黑體 (Sans)</span>
                    <span className="text-xs opacity-70">適合商業、工具書</span>
                  </button>
                  <button
                    onClick={() => updateLayout({ fontFamily: 'round' })}
                    className={`p-3 rounded border text-left font-book-round ${project.layoutSettings.fontFamily === 'round' ? 'bg-amber-900/30 border-amber-600 text-amber-100' : 'bg-stone-900 border-stone-700 text-stone-400'}`}
                  >
                    <span className="block text-sm font-bold">圓體 (Rounded)</span>
                    <span className="text-xs opacity-70">適合輕鬆、對話類內容</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-stone-300 flex items-center gap-2">
                  <ImageIcon size={16} /> 閱讀主題
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateLayout({ theme: 'classic' })}
                    className={`w-8 h-8 rounded-full border-2 bg-[#fdfbf7] ${project.layoutSettings.theme === 'classic' ? 'border-amber-500 scale-110' : 'border-stone-600'}`}
                    title="經典紙張"
                  />
                  <button
                    onClick={() => updateLayout({ theme: 'modern' })}
                    className={`w-8 h-8 rounded-full border-2 bg-white ${project.layoutSettings.theme === 'modern' ? 'border-amber-500 scale-110' : 'border-stone-600'}`}
                    title="純白現代"
                  />
                  <button
                    onClick={() => updateLayout({ theme: 'scifi' })}
                    className={`w-8 h-8 rounded-full border-2 bg-slate-900 ${project.layoutSettings.theme === 'scifi' ? 'border-amber-500 scale-110' : 'border-stone-600'}`}
                    title="深色模式"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-stone-800 bg-stone-900">
          <button
            onClick={handlePrint}
            className="w-full bg-green-700 hover:bg-green-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors mb-2"
          >
            <Printer size={18} />
            匯出 PDF / 列印
          </button>
          <p className="text-xs text-stone-500 text-center">
            點擊後，請在列印視窗中選擇「另存為 PDF」。<br />請記得勾選「背景圖形」以保留背景色。
          </p>
        </div>
      </div>

      {/* Preview Area (This is what gets printed) */}
      <div className={`flex-1 overflow-y-auto ${project.layoutSettings.theme === 'scifi' ? 'bg-black' : 'bg-stone-200'} p-8 print:p-0 print:bg-white print:overflow-visible`}>

        {/* Print Container */}
        <div className={`
                max-w-[210mm] mx-auto min-h-[297mm] shadow-2xl print:shadow-none print:w-full print:max-w-none
                ${getThemeClasses()} ${getFontFamily()}
                transition-colors duration-300
          `}>

          {/* Cover Page */}
          <div className="relative w-full h-[297mm] p-12 flex flex-col items-center justify-between text-center page-break print:h-screen">
            {project.coverImage && (
              <div className="absolute inset-0 w-full h-full z-0">
                <img src={project.coverImage} alt="Cover" className="w-full h-full object-cover opacity-30 blur-sm" />
                <div className={`absolute inset-0 ${project.layoutSettings.theme === 'scifi' ? 'bg-black/70' : 'bg-white/60'}`}></div>
              </div>
            )}

            <div className="relative z-10 mt-20">
              <h1 className="text-5xl md:text-6xl font-bold mb-4 tracking-tight leading-tight">{project.settings.title}</h1>
              <p className="text-xl md:text-2xl opacity-80 font-light">{project.settings.topic}</p>
            </div>

            {project.coverImage && (
              <div className="relative z-10 w-64 h-80 shadow-2xl border-4 border-white/20 rounded-sm overflow-hidden my-8">
                <img src={project.coverImage} alt="Cover Art" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="relative z-10 mb-20">
              <p className="text-sm uppercase tracking-[0.2em] opacity-60 mb-2">WRITTEN BY AI & HUMAN</p>
              <p className="font-bold">OmniScribe Architect</p>
            </div>
          </div>

          {/* Table of Contents */}
          <div className="w-full min-h-[297mm] p-[2.5cm] page-break">
            <h2 className="text-3xl font-bold mb-12 border-b pb-4 border-current opacity-30">目錄</h2>
            <div className="space-y-4">
              {project.structure.chapters.map((chapter, index) => (
                <div key={chapter.id} className="flex items-baseline justify-between group">
                  <span className="text-lg font-medium">{chapter.title}</span>
                  <span className="border-b border-dotted border-current flex-1 mx-4 opacity-20"></span>
                  <span className="opacity-60 font-mono">Ch. {index + 1}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Content Pages */}
          {project.structure.chapters.map((chapter, cIndex) => (
            <div key={chapter.id} className="w-full">
              {/* Chapter Title Page */}
              <div className="w-full min-h-[297mm] p-[2.5cm] flex flex-col justify-center text-center page-break">
                <span className="text-sm uppercase tracking-[0.3em] opacity-50 mb-4">Chapter {cIndex + 1}</span>
                <h2 className="text-4xl font-bold mb-8">{chapter.title}</h2>
                <div className="w-12 h-1 bg-current mx-auto opacity-20"></div>
              </div>

              {/* Sections */}
              <div className="w-full p-[2.5cm] pt-12">
                {chapter.sections.map((section) => (
                  <div key={section.id} className="mb-12">
                    {section.content ? (
                      <div className="prose prose-lg max-w-none prose-p:indent-8 prose-headings:font-bold prose-headings:mt-8 prose-p:leading-relaxed prose-p:text-justify text-inherit">
                        <h3 className="text-xl font-bold mb-4 opacity-80 mt-8">{section.title}</h3>
                        <ReactMarkdown>{section.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="p-8 border border-dashed border-current opacity-20 rounded text-center">
                        [此章節尚未生成內容]
                      </div>
                    )}
                    <div className="my-8 text-center opacity-30 text-xl">***</div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Back Cover */}
          <div className="w-full h-[297mm] p-12 flex flex-col items-center justify-center text-center page-break relative overflow-hidden">
            <div className="z-10 max-w-lg">
              <p className="text-lg italic mb-8 opacity-80 leading-loose">"{project.settings.topic}"</p>
              <div className="w-full h-px bg-current opacity-20 mb-8"></div>
              <p className="text-sm opacity-60">Generated by OmniScribe</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDesigner;
