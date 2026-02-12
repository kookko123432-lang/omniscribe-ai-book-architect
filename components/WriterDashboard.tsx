'use client';

import React, { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { BookProject, Section } from '@/types';
import { writeSectionContent, summarizeContext } from '@/lib/api';
import { Play, Pause, Download, Clock, CheckCircle, AlertCircle, FileText, ArrowRight } from 'lucide-react';

interface WriterDashboardProps {
    project: BookProject;
    setProject: React.Dispatch<React.SetStateAction<BookProject | null>>;
    onNext: () => void;
}

const WriterDashboard: React.FC<WriterDashboardProps> = ({ project, setProject, onNext }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentStatusMsg, setCurrentStatusMsg] = useState('準備開始');
    const [contextSummary, setContextSummary] = useState('');
    const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

    // Flatten sections for easier traversal
    const allSections = project.structure.chapters.flatMap(c =>
        c.sections.map(s => ({ ...s, chapterTitle: c.title, chapterId: c.id }))
    );

    const completedCount = allSections.filter(s => s.status === 'completed').length;
    const totalCount = allSections.length;
    // Safety check for division by zero
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const stopSignal = useRef(false);

    // Auto-select first pending or first completed
    useEffect(() => {
        if (!selectedSectionId) {
            const first = allSections[0]?.id;
            if (first) setSelectedSectionId(first);
        }
    }, [allSections, selectedSectionId]);

    const updateSection = (chapterId: string, sectionId: string, updates: Partial<Section>) => {
        setProject(prev => {
            if (!prev) return null;
            return {
                ...prev,
                totalWordCount: updates.wordCount ? prev.totalWordCount + updates.wordCount : prev.totalWordCount,
                structure: {
                    chapters: prev.structure.chapters.map(c =>
                        c.id === chapterId
                            ? {
                                ...c,
                                sections: c.sections.map(s => s.id === sectionId ? { ...s, ...updates } : s)
                            }
                            : c
                    )
                }
            };
        });
    };

    const startBatchGeneration = async () => {
        if (isGenerating) return;
        setIsGenerating(true);
        stopSignal.current = false;

        // Find next pending section
        let pendingSections = allSections.filter(s => s.status === 'pending');

        if (pendingSections.length === 0) {
            setCurrentStatusMsg("所有章節已完成！");
            setIsGenerating(false);
            return;
        }

        try {
            // Iterate sequentially
            for (const section of pendingSections) {
                if (stopSignal.current) break;

                setSelectedSectionId(section.id);
                setCurrentStatusMsg(`正在生成: ${section.title}...`);
                updateSection(section.chapterId, section.id, { status: 'generating' });

                // 1. Generate Content
                const content = await writeSectionContent(
                    section.title,
                    section.description,
                    project.settings,
                    section.chapterTitle,
                    contextSummary,
                    project.research
                );

                const wordCount = content.trim().split(/\s+/).length;

                // 2. Update State
                updateSection(section.chapterId, section.id, {
                    status: 'completed',
                    content: content,
                    wordCount: wordCount
                });

                // 3. Summarize for next context
                setCurrentStatusMsg(`正在總結上下文...`);
                const newSummary = await summarizeContext(content);
                setContextSummary(prev => prev + "\n" + newSummary);

                await new Promise(r => setTimeout(r, 1000));
            }
        } catch (e) {
            console.error(e);
            setCurrentStatusMsg("生成錯誤: 可能達到 API 限制，請稍候再試。");
        } finally {
            setIsGenerating(false);
            if (!stopSignal.current) {
                setCurrentStatusMsg("批次處理暫停或完成。");
            }
        }
    };

    const stopGeneration = () => {
        stopSignal.current = true;
        setCurrentStatusMsg("正在當前章節完成後停止...");
    };

    const downloadMarkdown = () => {
        let fullText = `# ${project.settings.title}\n\n`;
        project.structure.chapters.forEach(c => {
            fullText += `## ${c.title}\n\n`;
            c.sections.forEach(s => {
                if (s.content) {
                    fullText += `### ${s.title}\n\n${s.content}\n\n`;
                }
            });
        });

        const blob = new Blob([fullText], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.settings.title.replace(/\s+/g, '_')}.md`;
        a.click();
    };

    const activeSectionData = allSections.find(s => s.id === selectedSectionId);

    return (
        <div className="flex h-full">
            {/* Left Panel: Navigation & Progress */}
            <div className="w-80 bg-stone-950 border-r border-stone-800 flex flex-col">
                <div className="p-4 border-b border-stone-800">
                    <h3 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-2">生產狀態</h3>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl font-mono text-white">{completedCount}/{totalCount}</span>
                        <span className="text-xs text-amber-500 font-bold">{progressPercent}%</span>
                    </div>
                    <div className="w-full bg-stone-800 rounded-full h-2 overflow-hidden">
                        <div className="bg-amber-600 h-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                    <div className="mt-4 flex gap-2">
                        {!isGenerating ? (
                            <button onClick={startBatchGeneration} className="flex-1 bg-green-700 hover:bg-green-600 text-white text-xs font-bold py-2 rounded flex items-center justify-center gap-2">
                                <Play size={14} fill="currentColor" /> 繼續生成
                            </button>
                        ) : (
                            <button onClick={stopGeneration} className="flex-1 bg-red-900/50 hover:bg-red-900 text-red-200 text-xs font-bold py-2 rounded flex items-center justify-center gap-2 border border-red-800">
                                <Pause size={14} fill="currentColor" /> 停止
                            </button>
                        )}
                        <button onClick={downloadMarkdown} className="px-3 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded border border-stone-700" title="下載 Markdown">
                            <Download size={16} />
                        </button>
                    </div>
                    <div className="mt-2 text-xs text-stone-500 truncate min-h-[1.5em]">
                        {currentStatusMsg}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {project.structure.chapters.map(chapter => (
                        <div key={chapter.id}>
                            <div className="px-3 py-2 text-xs font-bold text-stone-500 uppercase bg-stone-900/50 sticky top-0 backdrop-blur-sm z-10">
                                {chapter.title}
                            </div>
                            {chapter.sections.map(section => (
                                <button
                                    key={section.id}
                                    onClick={() => setSelectedSectionId(section.id)}
                                    className={`w-full text-left px-3 py-2 text-sm rounded flex items-center justify-between group transition-colors ${selectedSectionId === section.id
                                            ? 'bg-amber-900/30 text-amber-100 border border-amber-800/50'
                                            : 'text-stone-400 hover:bg-stone-900'
                                        }`}
                                >
                                    <span className="truncate flex-1 pr-2">{section.title}</span>
                                    {section.status === 'completed' && <CheckCircle size={14} className="text-green-500 flex-shrink-0" />}
                                    {section.status === 'generating' && <Clock size={14} className="text-amber-500 animate-pulse flex-shrink-0" />}
                                    {section.status === 'error' && <AlertCircle size={14} className="text-red-500 flex-shrink-0" />}
                                </button>
                            ))}
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t border-stone-800 bg-stone-900 flex flex-col gap-3">
                    <div className="text-center">
                        <div className="text-stone-500 text-xs mb-1">已生成總字數</div>
                        <div className="text-xl font-serif text-stone-200">{project.totalWordCount.toLocaleString()}</div>
                    </div>
                    {completedCount > 0 && (
                        <button onClick={onNext} className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-lg flex items-center justify-center gap-2 transition-colors font-bold">
                            下一步：設計與出版
                            <ArrowRight size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Right Panel: Editor/Preview */}
            <div className="flex-1 flex flex-col bg-stone-900 relative">
                {activeSectionData ? (
                    <>
                        <div className="h-14 border-b border-stone-800 flex items-center justify-between px-6 bg-stone-900/95 backdrop-blur z-20">
                            <div className="flex items-center gap-2">
                                <span className="text-stone-500 text-sm">預覽中:</span>
                                <span className="font-semibold text-stone-200">{activeSectionData.title}</span>
                                {activeSectionData.wordCount > 0 && (
                                    <span className="text-xs bg-stone-800 text-stone-400 px-2 py-0.5 rounded-full ml-2">
                                        {activeSectionData.wordCount} 字
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-xs px-2 py-1 rounded capitalize ${activeSectionData.status === 'completed' ? 'bg-green-900/30 text-green-400 border border-green-800' :
                                        activeSectionData.status === 'generating' ? 'bg-amber-900/30 text-amber-400 border border-amber-800' :
                                            'bg-stone-800 text-stone-500'
                                    }`}>
                                    {activeSectionData.status === 'pending' ? '等待中' :
                                        activeSectionData.status === 'generating' ? '生成中' :
                                            activeSectionData.status === 'completed' ? '已完成' : '錯誤'}
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 lg:px-16">
                            {activeSectionData.content ? (
                                <div className="prose prose-invert prose-lg max-w-3xl mx-auto font-serif leading-relaxed text-stone-300">
                                    <ReactMarkdown>{activeSectionData.content}</ReactMarkdown>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-stone-600">
                                    {activeSectionData.status === 'generating' ? (
                                        <>
                                            <div className="w-16 h-1 bg-stone-800 rounded-full overflow-hidden mb-4">
                                                <div className="h-full bg-amber-500 animate-progress"></div>
                                            </div>
                                            <p className="animate-pulse">正在撰寫內容...</p>
                                        </>
                                    ) : (
                                        <div className="text-center">
                                            <FileText size={48} className="mx-auto mb-4 opacity-20" />
                                            <p>內容尚未生成。</p>
                                            <p className="text-sm mt-2">點擊左側「繼續生成」以啟動 AI 作家。</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-stone-600">
                        選擇一個章節以檢視內容。
                    </div>
                )}
            </div>
        </div>
    );
};

export default WriterDashboard;
