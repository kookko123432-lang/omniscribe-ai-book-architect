export enum AppStep {
  SETUP = 'SETUP',
  RESEARCH = 'RESEARCH',
  OUTLINE = 'OUTLINE',
  WRITING = 'WRITING',
  DESIGN = 'DESIGN',
  COMPLETED = 'COMPLETED'
}

export type BookType = 'novel' | 'non-fiction' | 'textbook' | 'biography' | 'anthology';

export interface BookSettings {
  title: string;
  authorName: string;
  topic: string;
  bookType: BookType;
  language: string;
  targetAudience: string;
  toneAndStyle: string;
  mustInclude: string;
  wordCountTarget: string;
}

export interface ResearchData {
  query: string;
  findings: string;
  sourceUrls: string[];
}

export interface Section {
  id: string;
  title: string;
  description: string; // Instructions for the AI
  content?: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
  wordCount: number;
}

export interface Chapter {
  id: string;
  title: string;
  sections: Section[];
}

export interface BookStructure {
  chapters: Chapter[];
}

export interface LayoutSettings {
  fontFamily: 'serif' | 'sans' | 'round';
  fontSize: 'small' | 'medium' | 'large';
  theme: 'classic' | 'modern' | 'scifi';
}

export interface BookProject {
  settings: BookSettings;
  research: ResearchData[];
  structure: BookStructure;
  currentGeneratingSectionId: string | null;
  totalWordCount: number;
  coverImage?: string; // Base64 string
  layoutSettings: LayoutSettings;
}

export interface SavedProject {
  id: string;
  name: string;
  currentStep: AppStep;
  project: BookProject;
  createdAt: string;   // ISO string
  updatedAt: string;   // ISO string
}
