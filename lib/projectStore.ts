import { AppStep, BookProject, SavedProject } from '@/types';

const STORAGE_KEY = 'omniscribe-projects';

function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getAll(): SavedProject[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveAll(projects: SavedProject[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function listProjects(): SavedProject[] {
    return getAll().sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
}

export function createProject(name?: string): SavedProject {
    const now = new Date().toISOString();
    const saved: SavedProject = {
        id: generateId(),
        name: name || '未命名書籍',
        currentStep: AppStep.SETUP,
        project: {
            settings: {
                title: '',
                topic: '',
                bookType: 'non-fiction',
                targetAudience: '',
                toneAndStyle: '',
                mustInclude: '',
                wordCountTarget: '100000',
                language: '繁體中文',
            },
            research: [],
            structure: { chapters: [] },
            currentGeneratingSectionId: null,
            totalWordCount: 0,
            layoutSettings: {
                fontFamily: 'serif',
                fontSize: 'medium',
                theme: 'classic',
            },
        },
        createdAt: now,
        updatedAt: now,
    };
    const all = getAll();
    all.push(saved);
    saveAll(all);
    return saved;
}

export function loadProject(id: string): SavedProject | null {
    return getAll().find((p) => p.id === id) || null;
}

export function saveProject(
    id: string,
    project: BookProject,
    currentStep: AppStep,
    name?: string
) {
    const all = getAll();
    const idx = all.findIndex((p) => p.id === id);
    if (idx === -1) return;
    all[idx].project = project;
    all[idx].currentStep = currentStep;
    all[idx].updatedAt = new Date().toISOString();
    if (name) all[idx].name = name;
    saveAll(all);
}

export function deleteProject(id: string) {
    const all = getAll().filter((p) => p.id !== id);
    saveAll(all);
}

export function getStepLabel(step: AppStep): string {
    const labels: Record<AppStep, string> = {
        [AppStep.SETUP]: '藍圖與設定',
        [AppStep.RESEARCH]: '深度研究',
        [AppStep.OUTLINE]: '架構設計',
        [AppStep.WRITING]: '內容生產',
        [AppStep.DESIGN]: '設計與出版',
        [AppStep.COMPLETED]: '已完成',
    };
    return labels[step] || step;
}

export function getStepProgress(step: AppStep): number {
    const order = [AppStep.SETUP, AppStep.RESEARCH, AppStep.OUTLINE, AppStep.WRITING, AppStep.DESIGN, AppStep.COMPLETED];
    return ((order.indexOf(step) + 1) / order.length) * 100;
}
