import React, { useState, useEffect } from 'react';
import {
  Bot,
  CheckCircle2,
  AlertCircle,
  Link,
  ShieldCheck,
  Send,
  ExternalLink,
  Check,
  HelpCircle,
  Copy,
} from 'lucide-react';
import { BotSettings, CustomMenuButton } from '../types.js';
import { api } from '../api.js';

interface BotSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BotSettings | null;
  onSaveSettings: (newSettings: BotSettings) => void;
}

export const BotSettingsModal: React.FC<BotSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [token, setToken] = useState(settings?.botToken || '');
  const [botUsername, setBotUsername] = useState(settings?.botUsername || '');
  const [botName, setBotName] = useState(settings?.botName || '');
  const [welcomeMessage, setWelcomeMessage] = useState(settings?.welcomeMessage || '');
  const [contactMessage, setContactMessage] = useState(settings?.contactMessage || '');
  const [customMenuButtons, setCustomMenuButtons] = useState<CustomMenuButton[]>(settings?.customMenuButtons || []);

  const [testingToken, setTestingToken] = useState(false);
  const [tokenTestResult, setTokenTestResult] = useState<{
    ok: boolean;
    bot?: any;
    error?: string;
  } | null>(null);

  const [settingWebhook, setSettingWebhook] = useState(false);
  const [webhookResult, setWebhookResult] = useState<{ ok: boolean; msg?: string } | null>(null);

  const [showGuide, setShowGuide] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const currentWebhookUrl = `${window.location.origin}/api/bot/webhook`;

  useEffect(() => {
    if (settings) {
      setToken(settings.botToken || '');
      setBotUsername(settings.botUsername || '');
      setBotName(settings.botName || '');
      setWelcomeMessage(settings.welcomeMessage || '');
      setContactMessage(settings.contactMessage || '');
      setCustomMenuButtons(settings.customMenuButtons || []);
    }
  }, [settings]);

  if (!isOpen) return null;

  const handleTestToken = async () => {
    if (!token.trim()) {
      setTokenTestResult({ ok: false, error: 'يرجى إدخال التوكن أولاً' });
      return;
    }
    setTestingToken(true);
    setTokenTestResult(null);
    try {
      const res = await api.testBotToken(token.trim());
      if (res.ok && res.result) {
        setTokenTestResult({ ok: true, bot: res.result });
        setBotUsername(res.result.username || botUsername);
        setBotName(res.result.first_name || botName);
      } else {
        setTokenTestResult({ ok: false, error: res.description || 'التوكن غير صالح أو تم إلغاؤه' });
      }
    } catch (err: any) {
      setTokenTestResult({ ok: false, error: err.message || 'فشل الاتصال بخوادم تليجرام' });
    } finally {
      setTestingToken(false);
    }
  };

  const handleSetWebhook = async () => {
    if (!token.trim()) {
      alert('يرجى إدخال توكن البوت أولاً');
      return;
    }
    setSettingWebhook(true);
    setWebhookResult(null);
    try {
      const res = await api.setWebhook(currentWebhookUrl, token.trim());
      if (res.ok) {
        setWebhookResult({ ok: true, msg: 'تم ربط الويب هوك بنجاح! البوت الآن يستقبل الرسائل الحقيقية من تليجرام' });
      } else {
        setWebhookResult({ ok: false, msg: res.description || 'فشل تعيين الويب هوك' });
      }
    } catch (err: any) {
      setWebhookResult({ ok: false, msg: err.message || 'خطأ في الاتصال' });
    } finally {
      setSettingWebhook(false);
    }
  };

  const handleDisableWebhook = async () => {
    setSettingWebhook(true);
    setWebhookResult(null);
    try {
      const res = await fetch('/api/bot/delete-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setWebhookResult({ ok: true, msg: 'تم تفعيل وضع السحب المباشر (Long Polling)! يعمل في بيئة المعاينة بامتياز.' });
      } else {
        setWebhookResult({ ok: false, msg: data.description || 'تعذر الإلغاء' });
      }
    } catch (err: any) {
      setWebhookResult({ ok: false, msg: err.message || 'خطأ في الاتصال' });
    } finally {
      setSettingWebhook(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await api.updateSettings({
        botToken: token.trim(),
        botUsername: botUsername.trim().replace(/^@/, ''),
        botName: botName.trim(),
        welcomeMessage,
        contactMessage,
        customMenuButtons,
      });
      onSaveSettings(updated);
      onClose();
    } catch (err: any) {
      alert(err.message || 'فشل حفظ الإعدادات');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 text-right my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-600" />
              <span>إعدادات وربط بوت تليجرام الحقيقي</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              اربط البوت بتوكن Telegram Bot API لتفعيل الاستقبال المباشر للرسائل وتوزيع الكتب
            </p>
          </div>

          <button
            onClick={() => setShowGuide(!showGuide)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg"
          >
            <HelpCircle className="w-4 h-4" />
            <span>كيف أنشئ بوت؟</span>
          </button>
        </div>

        {/* Step-by-step Guide Box */}
        {showGuide && (
          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <span>خطوات إنشاء البوت في دقيقتين عبر @BotFather:</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-600 pr-1">
              <li>
                افتح تطبيق تليجرام وابحث عن المعرف الرسمي:{' '}
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-blue-600 underline font-bold"
                >
                  @BotFather
                </a>
              </li>
              <li>
                أرسل له الأمر <code className="bg-slate-200 px-1 py-0.5 rounded">/newbot</code> ثم اكتب اسماً للبوت (مثال: مذكرات مستر أحمد).
              </li>
              <li>
                اختر معرّفاً ينتهي بكلمة <code className="bg-slate-200 px-1 py-0.5 rounded">bot</code> (مثال: <code className="bg-slate-200 px-1 py-0.5 rounded">AhmedNotes_bot</code>).
              </li>
              <li>
                انسخ الـ <b>HTTP API Token</b> الطويل المكون من أرقام وحروف، وألصقه في الحقل أدناه.
              </li>
            </ol>
          </div>
        )}

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          {/* Bot Token */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              توكن البوت (Telegram Bot Token)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz..."
                className="flex-1 px-3 py-2 text-xs sm:text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-left"
                dir="ltr"
              />
              <button
                type="button"
                onClick={handleTestToken}
                disabled={testingToken || !token.trim()}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg shrink-0 transition-colors"
              >
                {testingToken ? 'جاري الفحص...' : 'فحص التوكن'}
              </button>
            </div>

            {/* Test result status */}
            {tokenTestResult && (
              <div
                className={`mt-2 p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                  tokenTestResult.ok
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {tokenTestResult.ok ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      تم الاتصال بنجاح! اسم البوت: <b>{tokenTestResult.bot?.first_name}</b> (@{tokenTestResult.bot?.username})
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{tokenTestResult.error}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Webhook Configuration */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Link className="w-4 h-4 text-blue-600" />
                <span>رابط الويب هوك التلقائي (Webhook URL):</span>
              </label>
              {settings?.isWebhookSet && (
                <span className="text-[11px] px-2 py-0.5 bg-emerald-100 text-emerald-800 font-semibold rounded-full">
                  الويب هوك مفعل
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              يرسل تليجرام الرسائل إلى هذا العنوان مباشرة ليقوم البوت بالرد على الطلاب في جزء من الثانية:
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                readOnly
                value={currentWebhookUrl}
                className="flex-1 min-w-[200px] px-3 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-700 text-left"
                dir="ltr"
              />
              <button
                type="button"
                onClick={handleSetWebhook}
                disabled={settingWebhook || !token.trim()}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shrink-0 transition-colors shadow-xs"
              >
                {settingWebhook ? 'جاري...' : 'تفعيل الويب هوك'}
              </button>
              <button
                type="button"
                onClick={handleDisableWebhook}
                disabled={settingWebhook || !token.trim()}
                className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg shrink-0 transition-colors"
                title="استخدام السحب المباشر Long Polling المناسب دائماً لبيئات المعاينة"
              >
                تفعيل السحب المباشر (Long Polling)
              </button>
            </div>

            {webhookResult && (
              <div
                className={`mt-2 p-2 rounded-lg text-xs flex items-center gap-2 ${
                  webhookResult.ok
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {webhookResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{webhookResult.msg}</span>
              </div>
            )}
          </div>

          {/* Bot Info Display */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                معرف البوت على تليجرام (Username)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={botUsername}
                  onChange={e => setBotUsername(e.target.value)}
                  placeholder="مثال: MySchoolNotes_bot"
                  className="w-full pl-3 pr-8 py-2 text-xs sm:text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg text-left"
                  dir="ltr"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">@</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                اسم البوت الظاهر للطلاب
              </label>
              <input
                type="text"
                value={botName}
                onChange={e => setBotName(e.target.value)}
                placeholder="مثال: بوت الكتب والمذكرات الدراسية"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          {/* Contact Support info for non-subscribed students */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              رسالة الدعم وطريقة الحصول على كود (تظهر للطلاب غير المشتركين)
            </label>
            <textarea
              value={contactMessage}
              onChange={e => setContactMessage(e.target.value)}
              rows={3}
              placeholder="اكتب رقم الواتساب أو حساب التليجرام الخاص بك ليطلبه الطلاب..."
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          {/* Custom Main Menu Buttons Editor */}
          <div className="border-t border-slate-200 pt-5 mt-5">
            <h4 className="text-xs font-bold text-indigo-700 flex items-center gap-1.5 mb-1.5">
              <span>🛠️ أزرار القائمة الرئيسية الإضافية (دماغك الخاصة):</span>
            </h4>
            <p className="text-[11px] text-slate-500 mb-3.5 leading-relaxed">
              يمكنك هنا تزويد واجهة البوت بأزرار إضافية تظهر فوراً للطلاب في القائمة الرئيسية للرد بنصوص مخصصة أو لفتح روابط خارجية (مثل قناتك على يوتيوب، جروب الواتساب، أو منصة الشرح)!
            </p>

            {/* List of current custom buttons */}
            {customMenuButtons.length > 0 ? (
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-1">
                {[...customMenuButtons].sort((a,b) => (a.order || 0) - (b.order || 0)).map((btn, index) => (
                  <div key={btn.id || index} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs hover:border-slate-300 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-lg shrink-0">{btn.icon || '⭐️'}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800">{btn.label}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            btn.type === 'link' 
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' 
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            {btn.type === 'link' ? 'رابط خارجي' : 'رد نصي مخصص'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">الترتيب: {btn.order || 1}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 truncate max-w-md" dir="ltr">
                          {btn.value}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setCustomMenuButtons(customMenuButtons.filter(b => b.id !== btn.id))}
                      className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg font-semibold transition-colors shrink-0"
                      title="حذف هذا الزر"
                    >
                      حذف
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 mb-4">
                لا توجد أزرار مخصصة حالياً في القائمة. قم بإضافة أول زر بالأسفل!
              </div>
            )}

            {/* New Button Creator Form Block */}
            <div className="p-4 bg-indigo-50/40 border border-indigo-100/70 rounded-xl space-y-3.5">
              <span className="text-xs font-bold text-indigo-800 block">➕ إضافة زر مخصص جديد للبوت:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">اسم الزر (Label)</label>
                  <input
                    type="text"
                    id="new-btn-label"
                    placeholder="مثال: قناة اليوتيوب"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">أيقونة الزر (Emoji)</label>
                  <input
                    type="text"
                    id="new-btn-icon"
                    placeholder="مثال: 📺"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">نوع العملية</label>
                  <select
                    id="new-btn-type"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="link">رابط خارجي (URL)</option>
                    <option value="text">رد بنص مخصص (Text)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1">القيمة (الرابط الإلكتروني أو نص الرد)</label>
                <textarea
                  id="new-btn-value"
                  rows={2}
                  placeholder="أدخل رابط الموقع الإلكتروني، أو اكتب النص التفصيلي الذي سيرسله البوت للطالب عند الضغط..."
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-between items-center gap-2">
                <div>
                  <label className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                    <span>الترتيب الذاتي:</span>
                    <input
                      type="number"
                      id="new-btn-order"
                      defaultValue={customMenuButtons.length + 1}
                      className="w-12 px-1.5 py-1 text-center text-xs bg-white border border-slate-200 rounded-lg"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const labelInput = document.getElementById('new-btn-label') as HTMLInputElement;
                    const iconInput = document.getElementById('new-btn-icon') as HTMLInputElement;
                    const typeInput = document.getElementById('new-btn-type') as HTMLSelectElement;
                    const valueInput = document.getElementById('new-btn-value') as HTMLTextAreaElement;
                    const orderInput = document.getElementById('new-btn-order') as HTMLInputElement;

                    const label = labelInput?.value.trim();
                    const value = valueInput?.value.trim();

                    if (!label || !value) {
                      alert('يرجى كتابة اسم الزر والقيمة المطلوبة للزر أولاً!');
                      return;
                    }

                    let finalValue = value;
                    const btnType = typeInput?.value as 'link' | 'text';
                    if (btnType === 'link') {
                      if (!finalValue.startsWith('http://') && !finalValue.startsWith('https://') && !finalValue.startsWith('tg://')) {
                        if (finalValue.startsWith('t.me/')) {
                          finalValue = `https://${finalValue}`;
                        } else if (finalValue.startsWith('@')) {
                          finalValue = `https://t.me/${finalValue.replace('@', '')}`;
                        } else {
                          finalValue = `https://${finalValue}`;
                        }
                      }
                    }

                    const newBtn: CustomMenuButton = {
                      id: 'btn-' + Date.now(),
                      label,
                      icon: iconInput?.value.trim() || '⭐️',
                      type: btnType,
                      value: finalValue,
                      order: parseInt(orderInput?.value) || (customMenuButtons.length + 1)
                    };

                    setCustomMenuButtons([...customMenuButtons, newBtn]);
                    
                    // Clear inputs safely
                    if (labelInput) labelInput.value = '';
                    if (iconInput) iconInput.value = '';
                    if (valueInput) valueInput.value = '';
                    if (orderInput) orderInput.value = String(customMenuButtons.length + 2);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs"
                >
                  إضافة الزر للقائمة
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {botUsername && (
              <a
                href={`https://t.me/${botUsername.replace(/^@/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-semibold"
              >
                <span>فتح البوت على تليجرام</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <div className="flex items-center gap-2 mr-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                إغلاق
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>حفظ الإعدادات</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
