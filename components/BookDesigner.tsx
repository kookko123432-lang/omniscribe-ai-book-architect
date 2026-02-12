'use client';

import React, { useState } from 'react';
import { BookProject, LayoutSettings } from '@/types';
import { generateBookCover } from '@/lib/api';
import { exportEPUB, exportPDF, exportDOCX, exportMarkdown, exportTXT } from '@/lib/exporters';
import { Download, Image as ImageIcon, Sparkles, Layout as LayoutIcon, Type, Loader2, BookOpen, FileText, FileType, FileCode, File } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface BookDesignerProps {
  project: BookProject;
  setProject: React.Dispatch<React.SetStateAction<BookProject | null>>;
}

const BookDesigner: React.FC<BookDesignerProps> = ({ project, setProject }) => {
  const [activeTab, setActiveTab] = useState<'cover' | 'layout' | 'preview'>('cover');
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);
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

  // Language-aware labels
  const getTocLabel = () => {
    const lang = project.settings.language.toLowerCase();
    if (lang.includes('chinese') || lang.includes('中文')) return '目錄';
    if (lang.includes('japanese') || lang.includes('日')) return '目次';
    if (lang.includes('spanish') || lang.includes('西班牙')) return 'Índice';
    return 'Table of Contents';
  };

  const getChapterLabel = (index: number) => {
    const lang = project.settings.language.toLowerCase();
    if (lang.includes('chinese') || lang.includes('中文')) return `第 ${index + 1} 章`;
    if (lang.includes('japanese') || lang.includes('日')) return `第${index + 1}章`;
    if (lang.includes('spanish') || lang.includes('西班牙')) return `Capítulo ${index + 1}`;
    return `Chapter ${index + 1}`;
  };

  const getThemeClasses = () => {
    switch (project.layoutSettings.theme) {
      case 'modern': return 'bg-white text-slate-900';
      case 'scifi': return 'bg-slate-900 text-slate-200';
      case 'classic': default: return 'bg-[#fdfbf7] text-[#2d2a2e]';
    }
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

        <div className="p-6 flex-1 space-y-8 overflow-y-auto">
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

        <div className="p-6 border-t border-stone-800 bg-stone-900 space-y-3">
          <h3 className="text-sm font-medium text-stone-300 flex items-center gap-2">
            <Download size={16} /> 匯出電子書
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {[
              { key: 'epub', label: 'EPUB', desc: '電子書閱讀器', icon: BookOpen, fn: exportEPUB, color: 'from-emerald-600 to-emerald-700' },
              { key: 'pdf', label: 'PDF', desc: '列印 / 共享', icon: FileText, fn: exportPDF, color: 'from-red-600 to-red-700' },
              { key: 'docx', label: 'DOCX', desc: 'Word 文件', icon: FileType, fn: exportDOCX, color: 'from-blue-600 to-blue-700' },
              { key: 'md', label: 'Markdown', desc: '純文字格式', icon: FileCode, fn: exportMarkdown, color: 'from-stone-600 to-stone-700' },
              { key: 'txt', label: 'TXT', desc: '純文字', icon: File, fn: exportTXT, color: 'from-stone-600 to-stone-700' },
            ].map(({ key, label, desc, icon: Icon, fn, color }) => (
              <button
                key={key}
                disabled={!!exportingFormat}
                onClick={async () => {
                  setExportingFormat(key);
                  try {
                    await fn(project);
                  } catch (e) {
                    console.error(e);
                    alert(`匯出 ${label} 時發生錯誤`);
                  } finally {
                    setExportingFormat(null);
                  }
                }}
                className={`w-full bg-gradient-to-r ${color} hover:brightness-110 text-white py-2.5 px-4 rounded-lg flex items-center gap-3 transition-all disabled:opacity-50`}
              >
                {exportingFormat === key ? <Loader2 size={18} className="animate-spin" /> : <Icon size={18} />}
                <div className="text-left">
                  <span className="font-bold text-sm">{label}</span>
                  <span className="text-xs opacity-70 ml-2">{desc}</span>
                </div>
              </button>
            ))}
          </div>
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

            {project.settings.authorName && (
              <div className="relative z-10 mb-20">
                <p className="text-lg font-bold">{project.settings.authorName}</p>
              </div>
            )}
          </div>

          {/* Table of Contents */}
          <div className="w-full min-h-[297mm] p-[2.5cm] page-break">
            <h2 className="text-3xl font-bold mb-12 border-b pb-4 border-current opacity-30">{getTocLabel()}</h2>
            <div className="space-y-4">
              {project.structure.chapters.map((chapter, index) => (
                <div key={chapter.id} className="flex items-baseline justify-between group">
                  <span className="text-lg font-medium">{chapter.title}</span>
                  <span className="border-b border-dotted border-current flex-1 mx-4 opacity-20"></span>
                  <span className="opacity-60 font-mono">{getChapterLabel(index)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Content Pages */}
          {project.structure.chapters.map((chapter, cIndex) => (
            <div key={chapter.id} className="w-full">
              {/* Chapter Title Page */}
              <div className="w-full min-h-[297mm] p-[2.5cm] flex flex-col justify-center text-center page-break">
                <span className="text-sm uppercase tracking-[0.3em] opacity-50 mb-4">{getChapterLabel(cIndex)}</span>
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
              {project.settings.authorName && (
                <>
                  <div className="w-full h-px bg-current opacity-20 mb-8"></div>
                  <p className="text-sm opacity-60">{project.settings.authorName}</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDesigner;
