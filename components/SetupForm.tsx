'use client';

import React, { useState } from 'react';
import { BookSettings, BookType } from '@/types';
import { autofillBookSettings } from '@/lib/api';
import { ArrowRight, Sparkles, Wand2, Loader2 } from 'lucide-react';

interface SetupFormProps {
  onComplete: (settings: BookSettings) => void;
}

const SetupForm: React.FC<SetupFormProps> = ({ onComplete }) => {
  const [isAutofilling, setIsAutofilling] = useState(false);
  const [formData, setFormData] = useState<BookSettings>({
    title: '',
    authorName: '',
    topic: '',
    bookType: 'non-fiction',
    language: 'Traditional Chinese (繁體中文)',
    targetAudience: '',
    toneAndStyle: '',
    mustInclude: '',
    wordCountTarget: '100000',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAutofill = async () => {
    setIsAutofilling(true);
    try {
      const suggestions = await autofillBookSettings(formData.topic);
      setFormData(prev => ({
        ...prev,
        ...suggestions,
        // Keep user selected language if already set, otherwise default to Chinese
        language: prev.language
      }));
    } catch (e) {
      console.error(e);
      alert("AI 腦力激盪失敗，請稍後再試。");
    } finally {
      setIsAutofilling(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(formData);
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 lg:p-12 max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-3xl font-serif font-bold text-stone-100 mb-2">定義您的曠世巨作</h2>
        <p className="text-stone-400">告訴 OmniScribe 您想寫什麼。指示越具體，生成的架構越完美。</p>
      </div>

      <div className="bg-stone-800/50 border border-stone-700 p-6 rounded-xl mb-8">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
          <div className="flex-1 w-full space-y-2">
            <label className="text-sm font-medium text-amber-500 flex items-center gap-2">
              <Sparkles size={14} /> 快速開始 / 靈感生成
            </label>
            <input
              name="topic"
              value={formData.topic}
              onChange={handleChange}
              placeholder="輸入一個簡單的想法 (例如: 2050年的台灣科幻故事)..."
              className="w-full bg-stone-900 border border-stone-600 rounded-lg p-3 text-stone-200 focus:ring-2 focus:ring-amber-600 focus:outline-none placeholder-stone-600"
            />
          </div>
          <button
            type="button"
            onClick={handleAutofill}
            disabled={isAutofilling}
            className="bg-stone-700 hover:bg-stone-600 text-white font-medium py-3 px-6 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap border border-stone-600"
          >
            {isAutofilling ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
            AI 自動幫我設計
          </button>
        </div>
        <p className="text-xs text-stone-500 mt-2">
          輸入您的核心點子，點擊「AI 自動幫我設計」，AI 將自動為您填寫下方的書籍標題、受眾分析與章節規劃建議。
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-300">寫作語言</label>
            <select
              name="language"
              value={formData.language}
              onChange={handleChange}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg p-3 text-stone-200 focus:ring-2 focus:ring-amber-600 focus:outline-none"
            >
              <option value="Traditional Chinese (繁體中文)">繁體中文 (Traditional Chinese)</option>
              <option value="Simplified Chinese (简体中文)">簡體中文 (Simplified Chinese)</option>
              <option value="English">英文 (English)</option>
              <option value="Japanese">日文 (Japanese)</option>
              <option value="Spanish">西班牙文 (Spanish)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-300">書籍類型</label>
            <select
              name="bookType"
              value={formData.bookType}
              onChange={handleChange}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg p-3 text-stone-200 focus:ring-2 focus:ring-amber-600 focus:outline-none"
            >
              <option value="non-fiction">非虛構/工具書 (Non-fiction)</option>
              <option value="novel">小說 (Novel)</option>
              <option value="textbook">教科書/學術著作 (Textbook)</option>
              <option value="biography">傳記 (Biography)</option>
              <option value="anthology">文選/短篇集 (Anthology)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-300">書籍標題</label>
            <input
              required
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="例如：合成生物學的未來"
              className="w-full bg-stone-800 border border-stone-700 rounded-lg p-3 text-stone-200 focus:ring-2 focus:ring-amber-600 focus:outline-none placeholder-stone-600"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-300">作者名稱</label>
            <input
              name="authorName"
              value={formData.authorName}
              onChange={handleChange}
              placeholder="例如：張三 / John Doe（留空則不顯示）"
              className="w-full bg-stone-800 border border-stone-700 rounded-lg p-3 text-stone-200 focus:ring-2 focus:ring-amber-600 focus:outline-none placeholder-stone-600"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-stone-300">目標讀者</label>
          <input
            required
            name="targetAudience"
            value={formData.targetAudience}
            onChange={handleChange}
            placeholder="例如：行業專家與學術研究人員"
            className="w-full bg-stone-800 border border-stone-700 rounded-lg p-3 text-stone-200 focus:ring-2 focus:ring-amber-600 focus:outline-none placeholder-stone-600"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-stone-300">核心主題與詳細設定</label>
          <textarea
            required
            name="topic"
            value={formData.topic}
            onChange={handleChange}
            rows={4}
            placeholder="請詳細描述這本書的內容..."
            className="w-full bg-stone-800 border border-stone-700 rounded-lg p-3 text-stone-200 focus:ring-2 focus:ring-amber-600 focus:outline-none placeholder-stone-600"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-300">語氣與風格</label>
            <input
              name="toneAndStyle"
              value={formData.toneAndStyle}
              onChange={handleChange}
              placeholder="例如：專業、詳盡且權威"
              className="w-full bg-stone-800 border border-stone-700 rounded-lg p-3 text-stone-200 focus:ring-2 focus:ring-amber-600 focus:outline-none placeholder-stone-600"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-300">目標字數 (預估)</label>
            <select
              name="wordCountTarget"
              value={formData.wordCountTarget}
              onChange={handleChange}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg p-3 text-stone-200 focus:ring-2 focus:ring-amber-600 focus:outline-none"
            >
              <option value="50000">50,000 字 (中篇/輕小說)</option>
              <option value="100000">100,000 字 (標準長篇/專業書籍)</option>
              <option value="150000">150,000+ 字 (史詩巨著/百科)</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-stone-300">必須包含的內容 (特定章節、概念或角色)</label>
          <textarea
            name="mustInclude"
            value={formData.mustInclude}
            onChange={handleChange}
            rows={3}
            placeholder="例如：必須包含關於倫理的章節、2024年的案例研究..."
            className="w-full bg-stone-800 border border-stone-700 rounded-lg p-3 text-stone-200 focus:ring-2 focus:ring-amber-600 focus:outline-none placeholder-stone-600"
          />
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            className="bg-amber-600 hover:bg-amber-700 text-white font-medium py-3 px-6 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Sparkles size={18} />
            開始架構設計
            <ArrowRight size={18} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default SetupForm;
