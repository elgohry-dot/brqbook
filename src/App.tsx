/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.js';
import { Overview } from './components/Overview.js';
import { ContentManager } from './components/ContentManager.js';
import { CodesManager } from './components/CodesManager.js';
import { StudentsManager } from './components/StudentsManager.js';
import { TelegramSimulator } from './components/TelegramSimulator.js';
import { DiagnosticLogs } from './components/DiagnosticLogs.js';
import { BotSettingsModal } from './components/BotSettingsModal.js';
import { api } from './api.js';
import {
  Category,
  Subject,
  Book,
  ActivationCode,
  StudentSubscription,
  BotSettings,
  BotStats,
} from './types.js';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'content' | 'codes' | 'students' | 'simulator' | 'diagnostics' | 'settings'
  >('overview');

  const [stats, setStats] = useState<BotStats | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [students, setStudents] = useState<StudentSubscription[]>([]);
  const [settings, setSettings] = useState<BotSettings | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const loadAllData = async () => {
    try {
      const [statsRes, catRes, subRes, bookRes, codeRes, stuRes, setRes] =
        await Promise.all([
          api.getStats().catch(() => null),
          api.getCategories().catch(() => []),
          api.getSubjects().catch(() => []),
          api.getBooks().catch(() => []),
          api.getCodes().catch(() => []),
          api.getStudents().catch(() => []),
          api.getSettings().catch(() => null),
        ]);

      if (statsRes) setStats(statsRes);
      setCategories(catRes);
      setSubjects(subRes);
      setBooks(bookRes);
      setCodes(codeRes);
      setStudents(stuRes);
      if (setRes) setSettings(setRes);
    } catch (err) {
      console.error('Failed to load portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
  };

  const handleOpenSimulator = () => {
    setActiveTab('simulator');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={tab => {
          if (tab === 'settings') {
            setIsSettingsOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        settings={settings}
        onOpenSettings={handleOpenSettings}
        onOpenSimulator={handleOpenSimulator}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-sm font-semibold">جاري تحميل لوحة التحكم وبيانات البوت...</p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <Overview
                stats={stats}
                categories={categories}
                subjects={subjects}
                books={books}
                codes={codes}
                students={students}
                settings={settings}
                onNavigateTab={tab => {
                  if (tab === 'settings') setIsSettingsOpen(true);
                  else setActiveTab(tab);
                }}
                onRefreshData={loadAllData}
              />
            )}

            {activeTab === 'content' && (
              <ContentManager
                categories={categories}
                subjects={subjects}
                books={books}
                onRefresh={loadAllData}
              />
            )}

            {activeTab === 'codes' && (
              <CodesManager
                codes={codes}
                settings={settings}
                onRefresh={loadAllData}
              />
            )}

            {activeTab === 'students' && (
              <StudentsManager
                students={students}
                onRefresh={loadAllData}
              />
            )}

            {activeTab === 'simulator' && (
              <TelegramSimulator
                codes={codes}
                onRefreshData={loadAllData}
              />
            )}

            {activeTab === 'diagnostics' && (
              <DiagnosticLogs
                settings={settings}
                onOpenSettings={handleOpenSettings}
                onRefreshData={loadAllData}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            منظومة بوت تليجرام للكتب والمذكرات الدراسية مع نظام التفعيل بالأكواد والأزرار الشفافة
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-blue-600 hover:underline font-semibold"
            >
              ربط التوكن والويب هوك
            </button>
            <span>•</span>
            <button
              onClick={() => setActiveTab('diagnostics')}
              className="text-emerald-600 hover:underline font-semibold"
            >
              سجلات وتشخيص الاتصال
            </button>
            <span>•</span>
            <button
              onClick={() => setActiveTab('simulator')}
              className="text-indigo-600 hover:underline font-semibold"
            >
              تجربة المحاكي
            </button>
          </div>
        </div>
      </footer>

      {/* Bot Settings Modal */}
      <BotSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={updated => {
          setSettings(updated);
          loadAllData();
        }}
      />
    </div>
  );
}
