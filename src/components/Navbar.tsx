import React from 'react';
import { Bot, BookOpen, KeyRound, Users, Terminal, Settings, CheckCircle2, AlertCircle, Activity } from 'lucide-react';
import { BotSettings } from '../types.js';

interface NavbarProps {
  activeTab: 'overview' | 'content' | 'codes' | 'students' | 'simulator' | 'diagnostics' | 'settings';
  setActiveTab: (tab: 'overview' | 'content' | 'codes' | 'students' | 'simulator' | 'diagnostics' | 'settings') => void;
  settings: BotSettings | null;
  onOpenSettings: () => void;
  onOpenSimulator: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  settings,
  onOpenSettings,
  onOpenSimulator,
}) => {
  const isBotConnected = Boolean(settings?.botToken && settings.isWebhookSet);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  منصة تليجرام للكتب والمذكرات
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  لوحة الإدارة
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                إدارة المحتوى الدراسي وأكواد تفعيل الطلاب وبوت التليجرام
              </p>
            </div>
          </div>

          {/* Quick Actions & Status */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Bot status badge */}
            <div
              onClick={onOpenSettings}
              className="cursor-pointer group flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-150 hover:bg-slate-50"
              style={{
                borderColor: isBotConnected ? '#bbf7d0' : '#fed7aa',
                backgroundColor: isBotConnected ? '#f0fdf4' : '#fffbeb',
                color: isBotConnected ? '#166534' : '#9a3412',
              }}
              title="انقر لتعديل إعدادات التليجرام والويب هوك"
            >
              {isBotConnected ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="hidden md:inline">البوت متصل: @{settings?.botUsername || 'Active'}</span>
                  <span className="md:hidden">متصل</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span className="hidden md:inline">وضع المحاكي (يمكنك ربط توكن تليجرام)</span>
                  <span className="md:hidden">إعداد التوكن</span>
                </>
              )}
            </div>

            {/* Quick Test in Simulator button */}
            <button
              onClick={onOpenSimulator}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">تجربة البوت (المحاكي)</span>
              <span className="sm:hidden">المحاكي</span>
            </button>

            {/* Settings button */}
            <button
              onClick={onOpenSettings}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="إعدادات البوت والويب هوك"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 space-x-reverse -mb-px overflow-x-auto py-1 border-t border-slate-100 no-scrollbar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 py-2 px-3.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>📊</span>
            <span>نظرة عامة</span>
          </button>

          <button
            onClick={() => setActiveTab('content')}
            className={`flex items-center gap-2 py-2 px-3.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'content'
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>المحتوى والكتب والمواد</span>
          </button>

          <button
            onClick={() => setActiveTab('codes')}
            className={`flex items-center gap-2 py-2 px-3.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'codes'
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>أكواد التفعيل والاشتراكات</span>
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-2 py-2 px-3.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'students'
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>الطلاب المشتركون</span>
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-2 py-2 px-3.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'simulator'
                ? 'bg-indigo-50 text-indigo-700 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Terminal className="w-4 h-4 text-indigo-600" />
            <span>محاكي البوت والأزرار</span>
          </button>

          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`flex items-center gap-2 py-2 px-3.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'diagnostics'
                ? 'bg-emerald-50 text-emerald-700 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-600" />
            <span>تشخيص الاتصال وسجلات البوت</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 py-2 px-3.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>إعدادات البوت والربط</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
