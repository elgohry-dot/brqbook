import React, { useState } from 'react';
import {
  Users,
  Search,
  Calendar,
  Clock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Download,
  ExternalLink,
  PlusCircle,
  Filter,
} from 'lucide-react';
import { StudentSubscription } from '../types.js';
import { api } from '../api.js';

interface StudentsManagerProps {
  students: StudentSubscription[];
  onRefresh: () => void;
}

export const StudentsManager: React.FC<StudentsManagerProps> = ({ students, onRefresh }) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Renew modal
  const [selectedStudent, setSelectedStudent] = useState<StudentSubscription | null>(null);
  const [renewDays, setRenewDays] = useState<number>(30);
  const [loading, setLoading] = useState(false);

  const handleRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setLoading(true);
    try {
      await api.renewStudent(selectedStudent.chatId, renewDays);
      setSelectedStudent(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'فشل تجديد الاشتراك');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBlock = async (student: StudentSubscription) => {
    const actionText = student.status === 'blocked' ? 'إلغاء حظر' : 'حظر';
    if (confirm(`هل أنت متأكد من ${actionText} حساب الطالب: ${student.firstName || student.username || student.chatId}؟`)) {
      try {
        await api.toggleBlockStudent(student.chatId);
        onRefresh();
      } catch (err: any) {
        alert(err.message || 'فشل تحديث حالة الطالب');
      }
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesFilter = filterStatus === 'all' || s.status === filterStatus;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      String(s.chatId).includes(q) ||
      (s.username && s.username.toLowerCase().includes(q)) ||
      (s.firstName && s.firstName.toLowerCase().includes(q)) ||
      (s.lastName && s.lastName.toLowerCase().includes(q)) ||
      s.codeUsed.toLowerCase().includes(q);
    return matchesFilter && matchesQuery;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span>إدارة اشتراكات الطلاب على تليجرام</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              متابعة الطلاب المسجلين بالبوت، مدة صلاحية اشتراك كل طالب، تمديد الاشتراك، أو الحظر
            </p>
          </div>
        </div>

        {/* Filters and search */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:w-80 relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم الطالب، المعرف @username، أو الكود..."
              className="w-full pr-9 pl-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 shrink-0 ml-1">
              <Filter className="w-3.5 h-3.5" />
              حالة الاشتراك:
            </span>
            {[
              { id: 'all', label: `الكل (${students.length})` },
              { id: 'active', label: `نشط (${students.filter(s => s.status === 'active').length})` },
              { id: 'expired', label: `منتهي (${students.filter(s => s.status === 'expired').length})` },
              { id: 'blocked', label: `محظور (${students.filter(s => s.status === 'blocked').length})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
                  filterStatus === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-4">الطالب ومعرف تليجرام</th>
                <th className="py-3 px-4">الكود المستخدم</th>
                <th className="py-3 px-4">تاريخ البداية</th>
                <th className="py-3 px-4">تاريخ الانتهاء</th>
                <th className="py-3 px-4">الصلاحية المتبقية</th>
                <th className="py-3 px-4 text-center">التحميلات</th>
                <th className="py-3 px-4 text-left">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    لا يوجد طلاب مسجلون يطابقون خيارات البحث الحالية
                  </td>
                </tr>
              ) : (
                filteredStudents.map(student => {
                  const now = Date.now();
                  const expireTime = new Date(student.expiresAt).getTime();
                  const remainingDays = Math.max(0, Math.ceil((expireTime - now) / (24 * 3600 * 1000)));
                  const isExpired = remainingDays === 0 || student.status === 'expired';
                  const isBlocked = student.status === 'blocked';

                  return (
                    <tr key={String(student.chatId)} className="hover:bg-slate-50/60 transition-colors">
                      {/* Student info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                            {(student.firstName?.[0] || student.username?.[0] || 'ط').toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>
                                {[student.firstName, student.lastName].filter(Boolean).join(' ') || 'طالب تليجرام'}
                              </span>
                              {student.username && (
                                <a
                                  href={`https://t.me/${student.username}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5"
                                  title="فتح المحادثة على تليجرام"
                                >
                                  @{student.username}
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              ID: {student.chatId}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Code Used */}
                      <td className="py-3 px-4">
                        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-800 text-[11px] font-semibold">
                          {student.codeUsed}
                        </span>
                      </td>

                      {/* Start Date */}
                      <td className="py-3 px-4 text-slate-600">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{new Date(student.startDate).toLocaleDateString('ar-EG')}</span>
                        </div>
                      </td>

                      {/* Expiry Date */}
                      <td className="py-3 px-4 text-slate-600">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{new Date(student.expiresAt).toLocaleDateString('ar-EG')}</span>
                        </div>
                      </td>

                      {/* Remaining badge */}
                      <td className="py-3 px-4">
                        {isBlocked ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                            محظور من البوت
                          </span>
                        ) : isExpired ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            منتهي الصلاحية
                          </span>
                        ) : remainingDays <= 7 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            متبقي {remainingDays} يوم فقط
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            نشط (متبقي {remainingDays} يوم)
                          </span>
                        )}
                      </td>

                      {/* Downloads count */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-slate-600 font-mono font-semibold">
                          <Download className="w-3 h-3 text-slate-400" />
                          {student.downloadsCount || 0}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-left">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedStudent(student)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] transition-colors"
                            title="تمديد أو تجديد مدة الاشتراك"
                          >
                            <PlusCircle className="w-3 h-3" />
                            <span>تجديد</span>
                          </button>

                          <button
                            onClick={() => handleToggleBlock(student)}
                            className={`p-1 rounded transition-colors ${
                              isBlocked
                                ? 'text-emerald-600 hover:bg-emerald-50'
                                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                            title={isBlocked ? 'إلغاء الحظر' : 'حظر الطالب'}
                          >
                            {isBlocked ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
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

      {/* Renew Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 text-right">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-600" />
              <span>تجديد وتمديد اشتراك الطالب</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              إضافة أيام إضافية لصلاحية حساب الطالب:{' '}
              <b>{selectedStudent.firstName || selectedStudent.username || selectedStudent.chatId}</b>
            </p>

            <form onSubmit={handleRenew} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  اختر مدة التمديد الإضافية
                </label>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {[
                    { label: '+15 يوم', days: 15 },
                    { label: '+30 يوم', days: 30 },
                    { label: '+90 يوم', days: 90 },
                    { label: '+180 يوم', days: 180 },
                  ].map(preset => (
                    <button
                      type="button"
                      key={preset.days}
                      onClick={() => setRenewDays(preset.days)}
                      className={`py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                        renewDays === preset.days
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
                  value={renewDays}
                  onChange={e => setRenewDays(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-lg text-xs text-blue-800 leading-relaxed">
                سيتم تمديد تاريخ انتهاء الطالب بمقدار <b>{renewDays} يوم</b> ابتداءً من تاريخ انتهاء حسابه الحالي أو تاريخ اليوم.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs"
                >
                  {loading ? 'جاري التمديد...' : `تأكيد تمديد ${renewDays} يوم`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
