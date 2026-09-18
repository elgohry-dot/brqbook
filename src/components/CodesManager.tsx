import React, { useState } from 'react';
import {
  KeyRound,
  Plus,
  Copy,
  Check,
  Search,
  Filter,
  Trash2,
  Ban,
  ExternalLink,
  Layers,
  Sparkles,
  Share2,
} from 'lucide-react';
import { ActivationCode, BotSettings } from '../types.js';
import { api } from '../api.js';

interface CodesManagerProps {
  codes: ActivationCode[];
  settings: BotSettings | null;
  onRefresh: () => void;
}

export const CodesManager: React.FC<CodesManagerProps> = ({ codes, settings, onRefresh }) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [showSingleModal, setShowSingleModal] = useState<boolean>(false);
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);

  // Single form
  const [studentName, setStudentName] = useState('');
  const [durationDays, setDurationDays] = useState<number>(30);
  const [note, setNote] = useState('');
  const [customCode, setCustomCode] = useState('');

  // Bulk form
  const [bulkCount, setBulkCount] = useState<number>(10);
  const [bulkDuration, setBulkDuration] = useState<number>(30);
  const [bulkPrefix, setBulkPrefix] = useState('مجموعة الطلاب');

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const botUsername = settings?.botUsername || 'StudentBooksBot';

  const handleCopy = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(identifier);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreateSingleCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      await api.generateCode({
        durationDays,
        studentName: studentName.trim() || undefined,
        note: note.trim() || undefined,
        customCode: customCode.trim() || undefined,
      });
      setShowSingleModal(false);
      setStudentName('');
      setNote('');
      setCustomCode('');
      setDurationDays(30);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل توليد الكود');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBulkCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      await api.generateBulkCodes({
        count: bulkCount,
        durationDays: bulkDuration,
        notePrefix: bulkPrefix.trim() || undefined,
      });
      setShowBulkModal(false);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل توليد الأكواد');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (code: string) => {
    if (confirm(`هل أنت متأكد من إلغاء كود "${code}"؟ لن يتمكن الطالب من استخدامه مجدداً.`)) {
      try {
        await api.revokeCode(code);
        onRefresh();
      } catch (err: any) {
        alert(err.message || 'فشل إلغاء الكود');
      }
    }
  };

  const handleDelete = async (code: string) => {
    if (confirm(`هل أنت متأكد من حذف الكود "${code}" نهائياً؟`)) {
      try {
        await api.deleteCode(code);
        onRefresh();
      } catch (err: any) {
        alert(err.message || 'فشل حذف الكود');
      }
    }
  };

  // Filtered codes
  const filteredCodes = codes.filter(c => {
    const matchesFilter = filterStatus === 'all' || c.status === filterStatus;
    const matchesQuery =
      !searchQuery.trim() ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.studentName && c.studentName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.note && c.note.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.usedByUsername && c.usedByUsername.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesQuery;
  });

  const getStatusBadge = (status: ActivationCode['status']) => {
    switch (status) {
      case 'unused':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            جاهز للتوزيع
          </span>
        );
      case 'active':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            مفعّل ونشط
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            منتهي الصلاحية
          </span>
        );
      case 'revoked':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            ملغى
          </span>
        );
    }
  };

  // Statistics for codes
  const totalCodesCount = codes.length;
  const unusedCount = codes.filter(c => c.status === 'unused').length;
  const activeCount = codes.filter(c => c.status === 'active').length;
  const expiredCount = codes.filter(c => c.status === 'expired').length;
  const revokedCount = codes.filter(c => c.status === 'revoked').length;

  const handleCopyAllFiltered = () => {
    if (filteredCodes.length === 0) return;
    const textToCopy = filteredCodes.map(c => c.code).join('\n');
    navigator.clipboard.writeText(textToCopy);
    alert(`📋 تم نسخ ${filteredCodes.length} كود بنجاح إلى الحافظة!`);
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Real-time high-density statistics cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-400">إجمالي الأكواد</span>
          <span className="text-xl font-bold text-slate-800 mt-1 font-mono">{totalCodesCount}</span>
        </div>
        <div className="bg-emerald-50/40 rounded-xl border border-emerald-100 p-3.5 shadow-2xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-emerald-600">نشطة (قيد الاستخدام)</span>
          <span className="text-xl font-bold text-emerald-700 mt-1 font-mono">{activeCount}</span>
        </div>
        <div className="bg-blue-50/40 rounded-xl border border-blue-100 p-3.5 shadow-2xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-blue-600">جاهزة للتوزيع</span>
          <span className="text-xl font-bold text-blue-700 mt-1 font-mono">{unusedCount}</span>
        </div>
        <div className="bg-rose-50/40 rounded-xl border border-rose-100 p-3.5 shadow-2xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-rose-600">منتهية الصلاحية</span>
          <span className="text-xl font-bold text-rose-700 mt-1 font-mono">{expiredCount}</span>
        </div>
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 shadow-2xs flex flex-col justify-between col-span-2 lg:col-span-1">
          <span className="text-xs font-semibold text-slate-500">ملغاة</span>
          <span className="text-xl font-bold text-slate-600 mt-1 font-mono">{revokedCount}</span>
        </div>
      </div>

      {/* Header & Configuration panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-blue-600" />
              <span>إدارة أكواد التفعيل والاشتراكات للطلاب</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              كل كود مخصص لطالب واحد بمدة محددة. بمجرد تفعيله، يتم ربط حساب تليجرام الخاص بالطالب بالمدة المحددة.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowBulkModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
            >
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>توليد دفعة أكواد (Bulk)</span>
            </button>

            <button
              onClick={() => setShowSingleModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء كود جديد</span>
            </button>
          </div>
        </div>

        {/* Search Engine and Interactive Filters */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
          {/* Enhanced Search Input */}
          <div className="w-full xl:w-96 relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ابحث بالكود، اسم الطالب، المجموعة، أو معرف التليجرام..."
              className="w-full pr-9 pl-8 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs px-1 rounded hover:bg-slate-200 transition-colors"
                title="مسح البحث"
              >
                ✕
              </button>
            )}
          </div>

          {/* Tab filters with live counters */}
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 shrink-0 ml-1">
              <Filter className="w-3.5 h-3.5" />
              الحالة:
            </span>
            {[
              { id: 'all', label: 'الكل', count: totalCodesCount, color: 'bg-slate-200 text-slate-800' },
              { id: 'unused', label: 'جاهز للتوزيع', count: unusedCount, color: 'bg-blue-100 text-blue-700' },
              { id: 'active', label: 'نشط ومستعمل', count: activeCount, color: 'bg-emerald-100 text-emerald-700' },
              { id: 'expired', label: 'منتهي الصلاحية', count: expiredCount, color: 'bg-rose-100 text-rose-700' },
              { id: 'revoked', label: 'ملغى', count: revokedCount, color: 'bg-slate-200 text-slate-600' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
                  filterStatus === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  filterStatus === tab.id ? 'bg-white/20 text-white' : tab.color
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}

            {/* Quick Export action button */}
            {filteredCodes.length > 0 && (
              <button
                onClick={handleCopyAllFiltered}
                className="mr-auto xl:mr-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors"
                title="نسخ كافة الأكواد المعروضة بالجدول دفعة واحدة"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ الأكواد المعروضة ({filteredCodes.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Codes Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-4">كود التفعيل</th>
                <th className="py-3 px-4">مدة الصلاحية</th>
                <th className="py-3 px-4">اسم الطالب / الملاحظة</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4">المستخدم والانتهاء</th>
                <th className="py-3 px-4 text-center">رابط البوت المباشر</th>
                <th className="py-3 px-4 text-left">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCodes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    لا توجد أكواد مطابقة لخيارات البحث أو الفلتر
                  </td>
                </tr>
              ) : (
                filteredCodes.map(codeItem => {
                  const directLink = `https://t.me/${botUsername}?start=${codeItem.code}`;

                  return (
                    <tr key={codeItem.code} className="hover:bg-slate-50/60 transition-colors">
                      {/* Code string with copy */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-xs">
                            {codeItem.code}
                          </span>
                          <button
                            onClick={() => handleCopy(codeItem.code, `code-${codeItem.code}`)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                            title="نسخ الكود فقط"
                          >
                            {copiedCode === `code-${codeItem.code}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="py-3 px-4 font-medium text-slate-700">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50/70 text-blue-800 text-[11px] font-semibold">
                          {codeItem.durationDays} يوم
                        </span>
                      </td>

                      {/* Student name & note */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">
                          {codeItem.studentName || 'طالب غير محدد'}
                        </div>
                        {codeItem.note && (
                          <div className="text-[11px] text-slate-400">{codeItem.note}</div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">{getStatusBadge(codeItem.status)}</td>

                      {/* User & Expiry */}
                      <td className="py-3 px-4 text-slate-600">
                        {codeItem.isUsed ? (
                          <div>
                            <div className="font-medium text-slate-800">
                              @{codeItem.usedByUsername || codeItem.usedByChatId || 'طالب مجهول'}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              ينتهي في:{' '}
                              {codeItem.expiresAt
                                ? new Date(codeItem.expiresAt).toLocaleDateString('ar-EG')
                                : '-'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">لم يُفعّل بعد</span>
                        )}
                      </td>

                      {/* Direct Bot Link */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleCopy(directLink, `link-${codeItem.code}`)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors"
                          title="انسخ رابط الدخول المباشر لإرساله للطالب عبر واتساب أو تليجرام"
                        >
                          {copiedCode === `link-${codeItem.code}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700">تم النسخ!</span>
                            </>
                          ) : (
                            <>
                              <Share2 className="w-3 h-3 text-blue-600" />
                              <span>نسخ رابط الدخول السريع</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-left">
                        <div className="flex items-center justify-end gap-1">
                          {codeItem.status !== 'revoked' && (
                            <button
                              onClick={() => handleRevoke(codeItem.code)}
                              className="p-1 text-slate-400 hover:text-amber-600 rounded transition-colors"
                              title="إلغاء تنشيط الكود"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(codeItem.code)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="حذف الكود"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Single Code */}
      {showSingleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 text-right">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>إنشاء كود تفعيل لطالب جديد</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              حدد مدة الاشتراك وبيانات الطالب لإنشاء كود تفعيل فريد
            </p>

            {errorMsg && (
              <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateSingleCode} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  مدة صلاحية الاشتراك (بالأيام) *
                </label>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {[
                    { label: '7 أيام', days: 7 },
                    { label: 'شهر (30)', days: 30 },
                    { label: 'فصل (90)', days: 90 },
                    { label: 'سنة (365)', days: 365 },
                  ].map(preset => (
                    <button
                      type="button"
                      key={preset.days}
                      onClick={() => setDurationDays(preset.days)}
                      className={`py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                        durationDays === preset.days
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={durationDays}
                  onChange={e => setDurationDays(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  اسم الطالب المخصص له (اختياري)
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  placeholder="مثال: يوسف محمد إبراهيم"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ملاحظة / المجموعة / السنتر (اختياري)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="مثال: مجموعة يوم الاثنين - سنتر النجاح"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  تخصيص نص الكود (اختياري - سيتم توليد كود تلقائياً إذا تُرك فارغاً)
                </label>
                <input
                  type="text"
                  value={customCode}
                  onChange={e => setCustomCode(e.target.value.toUpperCase())}
                  placeholder="مثال: PHYSICS-2026-VIP"
                  className="w-full px-3 py-2 text-sm font-mono text-left uppercase bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  dir="ltr"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSingleModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs"
                >
                  {loading ? 'جاري التوليد...' : 'توليد الكود الآن'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Bulk Codes */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 text-right">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>توليد مجموعة أكواد دفعة واحدة (Bulk)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              توليد كمية من الأكواد لتوزيعها على فصل كامل أو مجموعة طلاب
            </p>

            {errorMsg && (
              <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateBulkCodes} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  عدد الأكواد المراد توليدها *
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={bulkCount}
                  onChange={e => setBulkCount(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  مدة الصلاحية لكل كود (بالأيام) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={bulkDuration}
                  onChange={e => setBulkDuration(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  اسم أو بادئة الدفعة للتعريف
                </label>
                <input
                  type="text"
                  value={bulkPrefix}
                  onChange={e => setBulkPrefix(e.target.value)}
                  placeholder="مثال: طلاب سنتر الأهرام - شهر أكتوبر"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs"
                >
                  {loading ? 'جاري التوليد...' : `توليد ${bulkCount} كود الآن`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
