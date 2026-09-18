import React, { useState } from 'react';
import {
  BookOpen,
  Users,
  KeyRound,
  Download,
  Plus,
  ExternalLink,
  Share2,
  Copy,
  Check,
  Sparkles,
  Bot,
  ArrowRight,
  ShieldCheck,
  Send,
  Activity,
} from 'lucide-react';
import { Category, Subject, Book, ActivationCode, StudentSubscription, BotSettings, BotStats } from '../types.js';
import { StatsCards } from './StatsCards.js';
import { api } from '../api.js';

interface OverviewProps {
  stats: BotStats | null;
  categories: Category[];
  subjects: Subject[];
  books: Book[];
  codes: ActivationCode[];
  students: StudentSubscription[];
  settings: BotSettings | null;
  onNavigateTab: (tab: 'overview' | 'content' | 'codes' | 'students' | 'simulator' | 'diagnostics' | 'settings') => void;
  onRefreshData: () => void;
}

export const Overview: React.FC<OverviewProps> = ({
  stats,
  categories,
  subjects,
  books,
  codes,
  students,
  settings,
  onNavigateTab,
  onRefreshData,
}) => {
  // Quick Code Generator on Overview
  const [quickStudentName, setQuickStudentName] = useState('');
  const [quickDays, setQuickDays] = useState(30);
  const [generating, setGenerating] = useState(false);
  const [lastGeneratedCode, setLastGeneratedCode] = useState<ActivationCode | null>(null);
  const [copied, setCopied] = useState(false);

  const botUsername = settings?.botUsername || 'StudentBooksBot';

  const handleQuickGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const newCode = await api.generateCode({
        durationDays: quickDays,
        studentName: quickStudentName.trim() || undefined,
        note: 'توليد سريع من الرئيسية',
      });
      setLastGeneratedCode(newCode);
      setQuickStudentName('');
      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'فشل توليد الكود');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner & Getting Started Flow */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        {/* Background glow decoration */}
        <div className="absolute -top-16 -left-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-200 border border-blue-400/20">
              <Bot className="w-3.5 h-3.5" />
              <span>منظومة تليجرام الذكية للطلاب والكتب</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              أهلاً بك في لوحة تحكم بوت الكتب والمذكرات الدراسية
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              يمكنك إدارة المراحل والصفوف، رفع روابط مذكرات الـ PDF، وإنشاء أكواد تفعيل فردية محددة الصلاحية لكل طالب، وتجربة البوت عبر المحاكي المباشر.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
            <button
              onClick={() => onNavigateTab('simulator')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs sm:text-sm font-bold shadow-md transition-all active:scale-98"
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>تشغيل محاكي البوت</span>
            </button>

            <button
              onClick={() => onNavigateTab('diagnostics')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-xs font-semibold border border-emerald-400/30 transition-colors"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>فحص وتشخيص الاتصال</span>
            </button>

            <button
              onClick={() => onNavigateTab('content')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/10 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة مذكرة PDF جديدة</span>
            </button>
          </div>
        </div>

        {/* 3-Step Flow Pills */}
        <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div
            onClick={() => onNavigateTab('content')}
            className="bg-white/5 hover:bg-white/10 p-3 rounded-xl border border-white/10 cursor-pointer transition-colors"
          >
            <div className="text-xs font-bold text-blue-300 flex items-center justify-between">
              <span>١. تنظيم المحتوى والكتب</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
            <p className="text-[11px] text-slate-300 mt-1">
              إضافة صفوف، مواد دراسية، وروابط مذكرات PDF
            </p>
          </div>

          <div
            onClick={() => onNavigateTab('codes')}
            className="bg-white/5 hover:bg-white/10 p-3 rounded-xl border border-white/10 cursor-pointer transition-colors"
          >
            <div className="text-xs font-bold text-emerald-300 flex items-center justify-between">
              <span>٢. توليد كود التفعيل</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
            <p className="text-[11px] text-slate-300 mt-1">
              تحديد مدة الاشتراك (مثلاً 30 أو 90 يوماً)
            </p>
          </div>

          <div
            onClick={() => onNavigateTab('simulator')}
            className="bg-white/5 hover:bg-white/10 p-3 rounded-xl border border-white/10 cursor-pointer transition-colors"
          >
            <div className="text-xs font-bold text-amber-300 flex items-center justify-between">
              <span>٣. إرسال الرابط للطالب</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
            <p className="text-[11px] text-slate-300 mt-1">
              الطالب يضغط الرابط ويدخل البوت بأزرار شفافة
            </p>
          </div>
        </div>
      </div>

      {/* Stats Numbers */}
      <StatsCards stats={stats} onNavigateTab={onNavigateTab} />

      {/* Main Grid: Quick Code Generator & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Quick Code Generator Form */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-600" />
              <span>توليد كود سريع لطالب جديد</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              أنشئ كود اشتراك بضغطة زر وأرسله للطالب فوراً
            </p>

            <form onSubmit={handleQuickGenerate} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  اسم الطالب
                </label>
                <input
                  type="text"
                  value={quickStudentName}
                  onChange={e => setQuickStudentName(e.target.value)}
                  placeholder="مثال: زياد الجوهري"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  مدة الصلاحية
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: 'شهر (30)', days: 30 },
                    { label: 'ترم (90)', days: 90 },
                    { label: 'سنة (365)', days: 365 },
                  ].map(preset => (
                    <button
                      type="button"
                      key={preset.days}
                      onClick={() => setQuickDays(preset.days)}
                      className={`py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                        quickDays === preset.days
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={generating}
                className="w-full mt-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{generating ? 'جاري التوليد...' : 'توليد الكود ونسخ الرابط'}</span>
              </button>
            </form>

            {/* Generated Code Result Box */}
            {lastGeneratedCode && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50/90 border border-emerald-200 text-right space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-900">الكود المولّد بنجاح:</span>
                  <span className="text-emerald-700 text-[11px]">صلاحية {lastGeneratedCode.durationDays} يوم</span>
                </div>

                <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-emerald-200">
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {lastGeneratedCode.code}
                  </span>
                  <button
                    onClick={() => handleCopy(lastGeneratedCode.code)}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'تم النسخ' : 'نسخ الكود'}</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1">
                  <span>رابط البوت المباشر:</span>
                  <button
                    onClick={() =>
                      handleCopy(`https://t.me/${botUsername}?start=${lastGeneratedCode.code}`)
                    }
                    className="inline-flex items-center gap-1 text-emerald-700 font-bold hover:underline"
                  >
                    <Share2 className="w-3 h-3" />
                    <span>نسخ رابط الدخول للواتساب</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>إجمالي الأكواد: {codes.length}</span>
            <button
              onClick={() => onNavigateTab('codes')}
              className="text-blue-600 hover:underline font-semibold"
            >
              عرض كل الأكواد
            </button>
          </div>
        </div>

        {/* Right: Latest Books and Subscriptions summary */}
        <div className="lg:col-span-7 space-y-6">
          {/* Latest Books */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>أحدث المذكرات والكتب المضافة ({books.length})</span>
              </h3>
              <button
                onClick={() => onNavigateTab('content')}
                className="text-xs text-blue-600 hover:underline font-semibold"
              >
                إدارة كل الكتب
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {books.slice(0, 4).map(book => {
                const category = categories.find(c => c.id === book.categoryId);
                const subject = subjects.find(s => s.id === book.subjectId);

                return (
                  <div key={book.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-800 truncate">{book.title}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{category?.name || 'مرحلة'}</span>
                        <span>•</span>
                        <span>{subject?.name || 'مادة'}</span>
                        <span>•</span>
                        <span>{book.fileSize || 'PDF'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                        <Download className="w-3 h-3 text-slate-400" />
                        {book.downloadCount}
                      </span>
                      <a
                        href={book.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="معاينة الملف"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Students Quick List */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>الطلاب المشتركون حديثاً</span>
              </h3>
              <button
                onClick={() => onNavigateTab('students')}
                className="text-xs text-blue-600 hover:underline font-semibold"
              >
                إدارة كل الاشتراكات ({students.length})
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {students.slice(0, 3).map(student => {
                const now = Date.now();
                const remainingDays = Math.max(
                  0,
                  Math.ceil((new Date(student.expiresAt).getTime() - now) / (24 * 3600 * 1000))
                );

                return (
                  <div key={String(student.chatId)} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-slate-800">
                        {[student.firstName, student.lastName].filter(Boolean).join(' ') || 'طالب تليجرام'}
                        {student.username && (
                          <span className="text-slate-400 font-normal mr-1.5">@{student.username}</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                        كود: {student.codeUsed}
                      </div>
                    </div>

                    <div className="text-left">
                      {remainingDays > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                          متبقي {remainingDays} يوم
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700">
                          منتهي
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
