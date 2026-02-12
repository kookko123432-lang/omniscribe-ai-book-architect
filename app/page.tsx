'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppStep, BookProject, BookSettings, ResearchData, BookStructure, SavedProject } from '@/types';
import Layout from '@/components/Layout';
import SetupForm from '@/components/SetupForm';
import ResearchView from '@/components/ResearchView';
import OutlineBuilder from '@/components/OutlineBuilder';
import WriterDashboard from '@/components/WriterDashboard';
import BookDesigner from '@/components/BookDesigner';
import AISettingsPanel from '@/components/AISettingsPanel';
import {
    listProjects, createProject, loadProject, saveProject, deleteProject,
    getStepLabel, getStepProgress
} from '@/lib/projectStore';
import {
    Plus, BookOpen, Trash2, ArrowRight, Clock, FileText, PenTool
} from 'lucide-react';

/* ─────────────── Dashboard ─────────────── */

function Dashboard({ onOpen, onCreate }: {
    onOpen: (id: string) => void;
    onCreate: () => void;
}) {
    const [projects, setProjects] = useState<SavedProject[]>([]);

    useEffect(() => {
        setProjects(listProjects());
    }, []);

    const handleDelete = (id: string, name: string) => {
        if (!confirm(`確定要刪除「${name}」嗎？此操作無法復原。`)) return;
        deleteProject(id);
        setProjects(listProjects());
    };

    const stepColors: Record<string, string> = {
        SETUP: 'from-stone-500 to-stone-600',
        RESEARCH: 'from-blue-500 to-blue-600',
        OUTLINE: 'from-violet-500 to-violet-600',
        WRITING: 'from-amber-500 to-amber-600',
        DESIGN: 'from-emerald-500 to-emerald-600',
        COMPLETED: 'from-green-500 to-green-600',
    };

    const totalWords = (p: SavedProject) =>
        p.project.structure?.chapters?.reduce(
            (sum, ch) => sum + ch.sections.reduce((s, sec) => s + (sec.wordCount || 0), 0), 0
        ) || 0;

    const totalSections = (p: SavedProject) =>
        p.project.structure?.chapters?.reduce(
            (sum, ch) => sum + ch.sections.length, 0
        ) || 0;

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        if (diff < 60000) return '剛剛';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} 分鐘前`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小時前`;
        return d.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="min-h-screen bg-stone-900 text-stone-100">
            {/* Header */}
            <div className="max-w-5xl mx-auto px-6 pt-12 pb-8">
                <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-700 rounded-2xl flex items-center justify-center text-white font-serif font-bold text-2xl shadow-lg shadow-amber-900/30">
                        O
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-stone-100">OmniScribe</h1>
                        <p className="text-stone-500 text-sm">AI 書籍工坊 — 多模型驅動</p>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="max-w-5xl mx-auto px-6 mb-8">
                <button
                    onClick={onCreate}
                    className="group flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-semibold shadow-lg shadow-amber-900/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Plus size={22} className="group-hover:rotate-90 transition-transform" />
                    建立新書籍專案
                </button>
            </div>

            {/* Project List */}
            <div className="max-w-5xl mx-auto px-6 pb-16">
                {projects.length === 0 ? (
                    <div className="text-center py-20">
                        <BookOpen size={56} className="mx-auto mb-4 text-stone-700" />
                        <p className="text-stone-500 text-lg mb-2">還沒有任何書籍專案</p>
                        <p className="text-stone-600 text-sm">點擊上方按鈕開始你的第一本書！</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-4">
                            我的專案 ({projects.length})
                        </h2>
                        {projects.map((p) => (
                            <div
                                key={p.id}
                                className="group relative bg-stone-800/60 border border-stone-700/50 rounded-2xl p-5 hover:border-amber-800/50 hover:bg-stone-800/80 transition-all cursor-pointer"
                                onClick={() => onOpen(p.id)}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-semibold text-stone-200 truncate mb-1">
                                            {p.name || p.project.settings.title || '未命名書籍'}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-3 text-sm text-stone-500 mb-3">
                                            <span className="flex items-center gap-1">
                                                <Clock size={13} />
                                                {formatDate(p.updatedAt)}
                                            </span>
                                            {p.project.settings.bookType && (
                                                <span className="flex items-center gap-1">
                                                    <FileText size={13} />
                                                    {p.project.settings.bookType}
                                                </span>
                                            )}
                                            {totalWords(p) > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <PenTool size={13} />
                                                    {totalWords(p).toLocaleString()} 字
                                                </span>
                                            )}
                                            {totalSections(p) > 0 && (
                                                <span>{totalSections(p)} 節</span>
                                            )}
                                        </div>

                                        {/* Progress bar */}
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 h-1.5 bg-stone-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full bg-gradient-to-r ${stepColors[p.currentStep] || stepColors.SETUP} transition-all`}
                                                    style={{ width: `${getStepProgress(p.currentStep)}%` }}
                                                />
                                            </div>
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-gradient-to-r ${stepColors[p.currentStep] || stepColors.SETUP} text-white`}>
                                                {getStepLabel(p.currentStep)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(p.id, p.name); }}
                                            className="p-2 rounded-lg text-stone-600 hover:text-red-400 hover:bg-red-950/30 transition-colors opacity-0 group-hover:opacity-100"
                                            title="刪除專案"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                        <div className="p-2 rounded-lg text-amber-600 group-hover:text-amber-400 transition-colors">
                                            <ArrowRight size={20} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─────────────── Project Editor (existing workflow) ─────────────── */

export default function Home() {
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
    const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.SETUP);
    const [showSettings, setShowSettings] = useState(false);
    const [project, setProject] = useState<BookProject | null>(null);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Auto-save with debounce
    const autoSave = useCallback(() => {
        if (!activeProjectId || !project) return;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            const name = project.settings.title || '未命名書籍';
            saveProject(activeProjectId, project, currentStep, name);
        }, 500);
    }, [activeProjectId, project, currentStep]);

    useEffect(() => {
        autoSave();
        return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
    }, [autoSave]);

    // Open a project
    const handleOpenProject = (id: string) => {
        const saved = loadProject(id);
        if (!saved) return;
        setActiveProjectId(saved.id);
        setProject(saved.project);
        setCurrentStep(saved.currentStep);
    };

    // Create a new project
    const handleCreateProject = () => {
        const saved = createProject();
        setActiveProjectId(saved.id);
        setProject(saved.project);
        setCurrentStep(AppStep.SETUP);
    };

    // Back to dashboard
    const handleBackToDashboard = () => {
        // Force save before leaving
        if (activeProjectId && project) {
            const name = project.settings.title || '未命名書籍';
            saveProject(activeProjectId, project, currentStep, name);
        }
        setActiveProjectId(null);
        setProject(null);
    };

    // Step handlers
    const handleSetupComplete = (settings: BookSettings) => {
        setProject((prev) => prev ? { ...prev, settings } : prev);
        setCurrentStep(AppStep.RESEARCH);
    };

    const handleResearchComplete = (research: ResearchData[]) => {
        setProject((prev) => prev ? { ...prev, research } : prev);
        setCurrentStep(AppStep.OUTLINE);
    };

    const handleOutlineComplete = (structure: BookStructure) => {
        setProject((prev) => prev ? { ...prev, structure } : prev);
        setCurrentStep(AppStep.WRITING);
    };

    // ─── Dashboard mode ───
    if (!activeProjectId || !project) {
        return (
            <>
                <Dashboard onOpen={handleOpenProject} onCreate={handleCreateProject} />
                <AISettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
            </>
        );
    }

    // ─── Project editing mode ───
    return (
        <>
            <Layout
                step={currentStep}
                onOpenSettings={() => setShowSettings(true)}
                onBackToDashboard={handleBackToDashboard}
            >
                <div className="p-4 md:p-8 overflow-auto h-full">
                    {currentStep === AppStep.SETUP && (
                        <SetupForm onComplete={handleSetupComplete} />
                    )}
                    {currentStep === AppStep.RESEARCH && (
                        <ResearchView
                            settings={project.settings}
                            onComplete={handleResearchComplete}
                        />
                    )}
                    {currentStep === AppStep.OUTLINE && (
                        <OutlineBuilder
                            settings={project.settings}
                            research={project.research}
                            onComplete={handleOutlineComplete}
                        />
                    )}
                    {currentStep === AppStep.WRITING && project.structure && (
                        <WriterDashboard
                            project={project}
                            setProject={setProject as any}
                            onNext={() => setCurrentStep(AppStep.DESIGN)}
                        />
                    )}
                    {currentStep === AppStep.DESIGN && (
                        <BookDesigner
                            project={project}
                            setProject={setProject as any}
                        />
                    )}
                </div>
            </Layout>

            <AISettingsPanel
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
            />
        </>
    );
}
