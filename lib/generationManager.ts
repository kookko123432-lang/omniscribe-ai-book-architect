/**
 * Global generation manager — runs the AI writing loop independently
 * of the WriterDashboard component lifecycle.
 *
 * When the user navigates away (unmounts WriterDashboard), the loop
 * keeps running. When they come back, the component reads the current
 * state from this module and shows the correct UI (stop button if
 * running, start button if stopped).
 */

import { BookProject, Section } from '@/types';
import { writeSectionContent, summarizeContext } from '@/lib/api';

type ProjectUpdater = (fn: (prev: BookProject | null) => BookProject | null) => void;
type Listener = () => void;

// ─── Global state ───
let _isRunning = false;
let _statusMsg = '準備開始';
let _contextSummary = '';
let _abortController: AbortController | null = null;
let _currentProjectUpdater: ProjectUpdater | null = null;
let _listeners: Listener[] = [];

// For reading the latest project data during the loop
let _latestProject: BookProject | null = null;

// ─── Public getters ───
export function isGenerationRunning() { return _isRunning; }
export function getStatusMsg() { return _statusMsg; }

// ─── Subscribe / unsubscribe for UI re-renders ───
export function subscribe(listener: Listener) {
    _listeners.push(listener);
    return () => {
        _listeners = _listeners.filter(l => l !== listener);
    };
}

function notify() {
    _listeners.forEach(l => l());
}

function setStatus(msg: string) {
    _statusMsg = msg;
    notify();
}

// ─── Connect / disconnect the React state updater ───
// Call this when WriterDashboard mounts/unmounts so the loop
// updates the correct React state.
export function connectProjectUpdater(updater: ProjectUpdater) {
    _currentProjectUpdater = updater;
}

export function disconnectProjectUpdater() {
    // Don't null it out — the loop still needs a way to update state.
    // The updater from the last mount is still valid because React
    // batches state updates.
}

export function syncLatestProject(project: BookProject) {
    _latestProject = project;
}

// ─── Section updater (uses whatever updater is connected) ───
function updateSection(chapterId: string, sectionId: string, updates: Partial<Section>) {
    if (!_currentProjectUpdater) return;
    _currentProjectUpdater(prev => {
        if (!prev) return null;
        return {
            ...prev,
            totalWordCount: updates.wordCount
                ? prev.totalWordCount + updates.wordCount
                : prev.totalWordCount,
            structure: {
                chapters: prev.structure.chapters.map(c =>
                    c.id === chapterId
                        ? {
                            ...c,
                            sections: c.sections.map(s =>
                                s.id === sectionId ? { ...s, ...updates } : s
                            )
                        }
                        : c
                )
            }
        };
    });
}

// ─── Start generation ───
export async function startGeneration(project: BookProject) {
    if (_isRunning) return;

    _isRunning = true;
    _abortController = new AbortController();
    _latestProject = project;
    notify();

    // Find pending sections
    const pendingSections = project.structure.chapters.flatMap(c =>
        c.sections
            .filter(s => s.status === 'pending')
            .map(s => ({ ...s, chapterTitle: c.title, chapterId: c.id }))
    );

    if (pendingSections.length === 0) {
        setStatus("所有章節已完成！🎉");
        _isRunning = false;
        notify();
        return;
    }

    let runningContext = _contextSummary;

    // If no context summary yet, build from completed sections
    if (!runningContext) {
        const completed = project.structure.chapters.flatMap(c =>
            c.sections.filter(s => s.status === 'completed' && s.content)
        );
        if (completed.length > 0) {
            runningContext = completed.slice(-3).map(s => s.content?.slice(0, 500)).join('\n');
        }
    }

    try {
        for (const section of pendingSections) {
            if (_abortController?.signal.aborted) {
                setStatus("已停止。");
                break;
            }

            setStatus(`正在生成: ${section.title}...`);
            updateSection(section.chapterId, section.id, { status: 'generating' });

            try {
                // Use the latest project data for settings/research
                const proj = _latestProject || project;

                const content = await writeSectionContent(
                    section.title,
                    section.description,
                    proj.settings,
                    section.chapterTitle,
                    runningContext,
                    proj.research
                );

                // Check abort after API call — still save the content!
                const wordCount = content.trim().split(/\s+/).length;
                updateSection(section.chapterId, section.id, {
                    status: 'completed',
                    content,
                    wordCount
                });

                if (_abortController?.signal.aborted) {
                    setStatus("已停止。已保存最後一節。");
                    break;
                }

                // Summarize
                setStatus(`正在總結上下文...`);
                try {
                    const newSummary = await summarizeContext(content);
                    runningContext += "\n" + newSummary;
                    _contextSummary = runningContext;
                } catch {
                    runningContext += "\n" + content.slice(0, 500);
                }

                await new Promise(r => setTimeout(r, 500));

            } catch (sectionError) {
                if (_abortController?.signal.aborted) break;
                console.error(`Section "${section.title}" failed:`, sectionError);
                updateSection(section.chapterId, section.id, { status: 'error' });
                setStatus(`「${section.title}」生成失敗，跳到下一節...`);
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    } catch (e) {
        console.error(e);
        setStatus("生成錯誤: 可能達到 API 限制，請稍候再試。");
    } finally {
        _isRunning = false;
        _abortController = null;
        if (_statusMsg.includes('生成:') || _statusMsg.includes('總結')) {
            setStatus("批次處理完成。");
        }
        notify();
    }
}

// ─── Stop generation ───
export function stopGeneration() {
    if (_abortController) {
        _abortController.abort();
    }
    _isRunning = false;
    setStatus("正在停止...");
    notify();
}
