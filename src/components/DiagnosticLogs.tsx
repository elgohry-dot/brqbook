import React, { useState, useEffect } from 'react';
import {
  Activity,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Radio,
  Send,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Zap,
  Globe,
  Server,
  ArrowDownLeft,
  ArrowUpRight,
  Info,
  Sliders,
  Check,
  RotateCcw,
} from 'lucide-react';
import { api } from '../api.js';
import { BotDiagnostics, BotConnectionLog, BotSettings } from '../types.js';

interface DiagnosticLogsProps {
  settings: BotSettings | null;
  onOpenSettings: () => void;
  onRefreshData?: () => void;
}

export const DiagnosticLogs: React.FC<DiagnosticLogsProps> = ({
  settings,
  onOpenSettings,
  onRefreshData,
}) => {
  const [diagnostics, setDiagnostics] = useState<BotDiagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [testMessageSuccess, setTestMessageSuccess] = useState<string | null>(null);

  const fetchDiagnostics = async (showLoadingState = false) => {
    if (showLoadingState) setRefreshing(true);
    try {
      const data = await api.getDiagnostics();
      setDiagnostics(data);
    } catch (err) {
      console.error('Failed to load diagnostics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics(true);
  }, []);

  // Auto refresh every 4 seconds when enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchDiagnostics(false);
    }, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleForcePolling = async () => {
    setActionLoading(true);
    try {
      await api.deleteWebhook(settings?.botToken);
      await fetchDiagnostics(true);
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Failed to switch to polling:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearLogs = async () => {
    try {
      await api.clearLogs();
      await fetchDiagnostics(false);
    } catch (err) {
      console.error('Failed to clear logs:', err);
    }
  };

  const handleSendTestCheck = async () => {
    setActionLoading(true);
    setTestMessageSuccess(null);
    try {
      const res = await api.testConnection(settings?.botToken);
      if (res.ok) {
        setTestMessageSuccess(`تم التحقق بنجاح! البوت @${res.botInfo?.username} متصل واستجاب خادم تليجرام.`);
      } else {
        setTestMessageSuccess(`تنبيه من تليجرام: ${res.error || 'لم يتمكن من إتمام الفحص'}`);
      }
      await fetchDiagnostics(false);
    } catch (err: any) {
      setTestMessageSuccess(`خطأ: ${err?.message || 'فشل الاتصال'}`);
    } finally {
      setActionLoading(false);
      setTimeout(() => setTestMessageSuccess(null), 7000);
    }
  };

  const filteredLogs = (diagnostics?.recentLogs || []).filter(log => {
    if (filterType !== 'all' && log.type !== filterType) return false;
    if (filterStatus !== 'all' && log.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.summary.toLowerCase().includes(q) ||
        (log.details && log.details.toLowerCase().includes(q)) ||
        log.endpoint.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (status: BotConnectionLog['status']) => {
    switch (status) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Check className="w-3 h-3" /> ناجح
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3" /> خطأ
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3" /> تحذير
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Info className="w-3 h-3" /> معلومات
          </span>
        );
    }
  };

  const getTypeBadge = (type: BotConnectionLog['type']) => {
    switch (type) {
      case 'polling':
        return <span className="text-xs px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-medium">سحب مباشر</span>;
      case 'webhook':
        return <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-medium">ويب هوك</span>;
      case 'send_message':
        return <span className="text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-medium">إرسال رسالة</span>;
      case 'conflict_detected':
        return <span className="text-xs px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">تعارض 409</span>;
      case 'telegram_api':
        return <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-medium">API تليجرام</span>;
      default:
        return <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">نظام</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                تشخيص الاتصال وسجلات تليجرام المباشرة
                {diagnostics?.diagnosisSummary.state === 'healthy' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    متصل ونشط
                  </span>
                )}
                {diagnostics?.diagnosisSummary.state === 'warning' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    تنبيه
                  </span>
                )}
                {diagnostics?.diagnosisSummary.state === 'critical' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                    <XCircle className="w-3.5 h-3.5" />
                    متوقف
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                مراقبة حية لجميع طلبات الاستقبال والإرسال وأسباب التوقف أو التعارض اللحظية
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              autoRefresh
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
            title={autoRefresh ? 'التحديث التلقائي قيد العمل كل 4 ثواني' : 'التحديث التلقائي متوقف'}
          >
            <Radio className={`w-3.5 h-3.5 ${autoRefresh ? 'text-emerald-600 animate-pulse' : 'text-slate-400'}`} />
            <span>{autoRefresh ? 'تحديث حي مفعل' : 'تحديث يدوي'}</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => fetchDiagnostics(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-50 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>تحديث الآن</span>
          </button>

          {/* Force Polling / Fix Button */}
          <button
            onClick={handleForcePolling}
            disabled={actionLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white transition-all disabled:opacity-50 shadow-xs"
            title="حذف أي ويب هوك معلق وإجبار البوت على العمل في وضع السحب المباشر"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إصلاح وتفعيل السحب المباشر</span>
          </button>

          {/* Test Telegram API Ping */}
          <button
            onClick={handleSendTestCheck}
            disabled={actionLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-all disabled:opacity-50 shadow-xs"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>فحص استجابة API</span>
          </button>
        </div>
      </div>

      {/* Test feedback toast */}
      {testMessageSuccess && (
        <div className="p-4 rounded-xl bg-slate-900 text-white text-xs font-medium flex items-center justify-between shadow-md border border-slate-700 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{testMessageSuccess}</span>
          </div>
          <button onClick={() => setTestMessageSuccess(null)} className="text-slate-400 hover:text-white text-xs">
            إغلاق
          </button>
        </div>
      )}

      {/* Diagnosis Verdict Banner (Why is the bot working or stopped?) */}
      {diagnostics && (
        <div
          className={`p-5 rounded-2xl border transition-all ${
            diagnostics.diagnosisSummary.state === 'healthy'
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              : diagnostics.diagnosisSummary.state === 'warning'
              ? 'bg-amber-50/70 border-amber-200 text-amber-950'
              : 'bg-rose-50/70 border-rose-200 text-rose-950'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                {diagnostics.diagnosisSummary.state === 'healthy' && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                )}
                {diagnostics.diagnosisSummary.state === 'warning' && (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                )}
                {diagnostics.diagnosisSummary.state === 'critical' && (
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <h3 className="font-bold text-sm sm:text-base">
                  النتيجة التشخيصية: {diagnostics.diagnosisSummary.title}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed pr-7">
                <strong>السبب الدقيق: </strong> {diagnostics.diagnosisSummary.reason}
              </p>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pr-7">
                <strong>الإجراء المقترح: </strong> {diagnostics.diagnosisSummary.solution}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
              {diagnostics.mode === 'webhook' && (
                <button
                  onClick={handleForcePolling}
                  className="px-3.5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition-colors"
                >
                  التحويل إلى Long Polling
                </button>
              )}
              <button
                onClick={onOpenSettings}
                className="px-3.5 py-2 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-xl shadow-xs transition-colors"
              >
                تعديل إعدادات التوكن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid of Key Technical Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Card 1: Bot API Connection */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-blue-600" />
              اتصال Telegram API
            </span>
            {diagnostics?.telegramApiStatus.reachable ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            )}
          </div>
          <div className="text-lg font-bold text-slate-900">
            {diagnostics?.telegramApiStatus.reachable ? 'متصل بنجاح' : 'غير متصل'}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            زمن الاستجابة:{' '}
            <span className="font-semibold text-slate-700">
              {diagnostics?.telegramApiStatus.responseTimeMs || 0} ms
            </span>
          </p>
        </div>

        {/* Status Card 2: Current Operation Mode */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-indigo-600" />
              طريقة استلام التحديثات
            </span>
            <span className="text-xs px-2 py-0.5 rounded font-bold bg-indigo-50 text-indigo-700">
              {diagnostics?.mode === 'polling' ? 'Long Polling (مباشر)' : 'Webhook'}
            </span>
          </div>
          <div className="text-lg font-bold text-slate-900">
            {diagnostics?.mode === 'polling' ? 'سحب مباشر نشط' : 'استماع عبر رابط'}
          </div>
          <p className="text-xs text-slate-500 mt-1 truncate" title={diagnostics?.webhookUrl || 'لا يوجد'}>
            {diagnostics?.mode === 'polling'
              ? 'مستمر ومحصن ضد تحويلات 302'
              : `الرابط: ${diagnostics?.webhookUrl || 'غير محدد'}`}
          </p>
        </div>

        {/* Status Card 3: Pending updates on Telegram Queue */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-purple-600" />
              رسائل الانتظار في تليجرام
            </span>
            <span className="text-xs font-bold text-slate-600">
              {diagnostics?.webhookInfo?.pending_update_count ?? 0}
            </span>
          </div>
          <div className="text-lg font-bold text-slate-900">
            {diagnostics?.webhookInfo?.pending_update_count ?? 0} تحديث
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {diagnostics?.webhookInfo?.pending_update_count === 0
              ? 'لا توجد رسائل عالقة في تليجرام'
              : 'جاري تسليمها تلقائياً'}
          </p>
        </div>

        {/* Status Card 4: Updates processed & last activity */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-600" />
              إجمالي الرسائل المستلمة
            </span>
            <span className="text-xs px-2 py-0.5 rounded font-bold bg-emerald-50 text-emerald-700">
              {diagnostics?.totalUpdatesProcessed ?? 0}
            </span>
          </div>
          <div className="text-lg font-bold text-slate-900">
            {diagnostics?.totalUpdatesProcessed ?? 0} رسالة
          </div>
          <p className="text-xs text-slate-500 mt-1 truncate">
            {diagnostics?.lastUpdateReceivedAt
              ? `آخر تحديث: ${new Date(diagnostics.lastUpdateReceivedAt).toLocaleTimeString('ar-EG')}`
              : 'في انتظار أول رسالة...'}
          </p>
        </div>
      </div>

      {/* Telegram Webhook Deep Info (If Error Reported by Telegram Servers) */}
      {diagnostics?.webhookInfo?.last_error_message && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm">
          <div className="flex items-center gap-2 font-bold mb-1 text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>آخر خطأ سجلته خوادم تليجرام في الويب هوك:</span>
          </div>
          <p className="font-mono bg-white/70 p-2 rounded-lg border border-rose-200/70 text-slate-800 mt-1">
            {diagnostics.webhookInfo.last_error_message} (بتاريخ:{' '}
            {diagnostics.webhookInfo.last_error_date
              ? new Date(diagnostics.webhookInfo.last_error_date * 1000).toLocaleString('ar-EG')
              : 'غير محدد'}
            )
          </p>
          <p className="mt-2 text-rose-700">
            <strong>نصيحة:</strong> هذا الخطأ يحدث عند استخدام Webhook ووجود دومين يعيد التوجيه (Redirect 302). الحل الجذري هو الضغط على زر "إصلاح وتفعيل السحب المباشر".
          </p>
        </div>
      )}

      {/* Real-time Connection Logs Viewer */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Logs Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>سجلات الاتصال المباشرة (Telegram Activity Logs)</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                {filteredLogs.length} سجل
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              كل محاولة اتصال بخوادم تليجرام، مع زمن الاستجابة وكود الخطأ والتفاصيل التقنية
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by Type */}
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="text-xs font-medium bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">كل الأنواع</option>
              <option value="polling">سحب مباشر (Polling)</option>
              <option value="send_message">إرسال رسائل</option>
              <option value="webhook">ويب هوك</option>
              <option value="conflict_detected">التعارض (Conflict)</option>
              <option value="telegram_api">Telegram API</option>
            </select>

            {/* Filter by Status */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="text-xs font-medium bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">كل الحالات</option>
              <option value="success">ناجح فقط</option>
              <option value="error">أخطاء فقط</option>
              <option value="warning">تحذيرات</option>
            </select>

            {/* Search Input */}
            <input
              type="text"
              placeholder="بحث في السجلات..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 w-36 sm:w-44"
            />

            {/* Clear Logs */}
            <button
              onClick={handleClearLogs}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="مسح السجلات الحالية"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Logs Table / List */}
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
            جاري جلب سجلات الاتصال...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">لا توجد سجلات مطابقة للفلتر المحدد</p>
            <p className="text-slate-400 mt-1">
              ستظهر هنا محاولات الاتصال فور وصول أي رسالة من تليجرام أو فحص السيرفر
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[550px] overflow-y-auto">
            {filteredLogs.map(log => {
              const isError = log.status === 'error';
              const isConflict = log.type === 'conflict_detected';
              return (
                <div
                  key={log.id}
                  className={`p-4 transition-colors hover:bg-slate-50/80 ${
                    isConflict
                      ? 'bg-rose-50/40'
                      : isError
                      ? 'bg-rose-50/20'
                      : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-start sm:items-center gap-3">
                      {/* Direction Icon */}
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          log.direction === 'inbound'
                            ? 'bg-sky-100 text-sky-700'
                            : log.direction === 'outbound'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                        title={
                          log.direction === 'inbound'
                            ? 'وارد من تليجرام'
                            : log.direction === 'outbound'
                            ? 'صادر إلى تليجرام'
                            : 'داخلي'
                        }
                      >
                        {log.direction === 'inbound' ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : log.direction === 'outbound' ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <Activity className="w-3.5 h-3.5" />
                        )}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-xs sm:text-sm text-slate-900">
                            {log.summary}
                          </span>
                          {getStatusBadge(log.status)}
                          {getTypeBadge(log.type)}
                          {log.statusCode && (
                            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              HTTP {log.statusCode}
                            </span>
                          )}
                        </div>

                        {log.details && (
                          <p className="text-xs text-slate-500 font-mono mt-1 break-all">
                            {log.details}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400 shrink-0 pr-10 sm:pr-0">
                      {log.durationMs !== undefined && (
                        <span className="font-mono text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {log.durationMs}ms
                        </span>
                      )}
                      <span className="font-mono text-[11px]">
                        {new Date(log.timestamp).toLocaleTimeString('ar-EG', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Summary */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            يتم الاحتفاظ بآخر 60 محاولة اتصال في الذاكرة التلقائية لتشخيص الأعطال دون التأثير على الأداء.
          </span>
          <span className="text-slate-400 font-mono">
            خادم API: https://api.telegram.org
          </span>
        </div>
      </div>
    </div>
  );
};
