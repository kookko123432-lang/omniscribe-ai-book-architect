'use client';

import React, { ReactNode, useState, useEffect } from 'react';
import { BookOpen, PenTool, Library, Settings, Palette, Menu, X, Zap, ArrowLeft } from 'lucide-react';
import { PROVIDERS, AIProvider } from '@/lib/ai/types';

interface LayoutProps {
  children: ReactNode;
  step: string;
  onOpenSettings: () => void;
  onBackToDashboard?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, step, onOpenSettings, onBackToDashboard }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentProviderName, setCurrentProviderName] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('omniscribe-ai-config');
      if (stored) {
        const config = JSON.parse(stored);
        const p = PROVIDERS[config.provider as AIProvider];
        setCurrentProviderName(p ? `${p.nameZh} / ${config.model}` : '');
      }
    } catch { }
  }, []);

  useEffect(() => {
    const handler = () => {
      try {
        const stored = localStorage.getItem('omniscribe-ai-config');
        if (stored) {
          const config = JSON.parse(stored);
          const p = PROVIDERS[config.provider as AIProvider];
          setCurrentProviderName(p ? `${p.nameZh} / ${config.model}` : '');
        }
      } catch { }
    };
    window.addEventListener('storage', handler);
    const interval = setInterval(handler, 2000);
    return () => { window.removeEventListener('storage', handler); clearInterval(interval); };
  }, []);

  const navItems = [
    { step: 'SETUP', icon: Settings, label: '藍圖與設定' },
    { step: 'RESEARCH', icon: Library, label: '深度研究' },
    { step: 'OUTLINE', icon: BookOpen, label: '架構設計' },
    { step: 'WRITING', icon: PenTool, label: '內容生產' },
    { step: 'DESIGN', icon: Palette, label: '設計與出版' },
  ];

  return (
    <div className="flex h-screen bg-stone-900 text-stone-100 font-sans selection:bg-accent selection:text-white">
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-stone-950 border-b border-stone-800 px-4 py-3 flex items-center justify-between no-print">
        <div className="flex items-center gap-2">
          {onBackToDashboard && (
            <button onClick={onBackToDashboard} className="p-1.5 -ml-1 mr-1 text-stone-400 hover:text-amber-500 transition-colors">
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="w-7 h-7 bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg flex items-center justify-center text-white font-serif font-bold text-lg">
            O
          </div>
          <h1 className="text-lg font-bold text-stone-200">OmniScribe</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={onOpenSettings} className="p-2 text-stone-400 hover:text-amber-500">
            <Zap size={18} />
          </button>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-stone-400 hover:text-stone-200">
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed top-14 left-0 right-0 z-30 bg-stone-950 border-b border-stone-800 p-3 space-y-1 no-print">
          {navItems.map(({ step: s, icon: Icon, label }) => (
            <div
              key={s}
              className={`flex items-center gap-3 px-3 py-2 rounded-md ${step === s ? 'bg-stone-800 text-amber-500' : 'text-stone-400'}`}
            >
              <Icon size={18} />
              <span className="text-sm font-medium">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="w-64 border-r border-stone-800 bg-stone-950 flex flex-col hidden md:flex no-print">
        <div className="p-6 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg flex items-center justify-center text-white font-serif font-bold text-xl">
              O
            </div>
            <h1 className="text-xl font-bold tracking-tight text-stone-200">OmniScribe</h1>
          </div>
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="mt-3 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-stone-500 hover:text-amber-500 hover:bg-stone-800/50 transition-colors text-sm"
            >
              <ArrowLeft size={15} />
              <span>返回我的專案</span>
            </button>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ step: s, icon: Icon, label }) => (
            <div
              key={s}
              className={`flex items-center gap-3 px-3 py-2 rounded-md ${step === s ? 'bg-stone-800 text-amber-500' : 'text-stone-400'}`}
            >
              <Icon size={18} />
              <span className="text-sm font-medium">{label}</span>
            </div>
          ))}
        </nav>

        {/* AI Settings shortcut */}
        <div className="p-4 border-t border-stone-800">
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-stone-800/50 border border-stone-700 text-stone-400 hover:text-amber-500 hover:border-amber-800 transition-colors text-sm"
          >
            <Zap size={16} />
            <div className="flex-1 text-left truncate">
              {currentProviderName || '設定 AI 模型'}
            </div>
          </button>
        </div>

        <div className="p-4 border-t border-stone-800 text-xs text-stone-600 text-center">
          Multi-AI Powered
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col relative print:overflow-visible md:mt-0 mt-14">
        {children}
      </main>
    </div>
  );
};

export default Layout;
