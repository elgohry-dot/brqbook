import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  RotateCcw,
  Bot,
  User,
  ExternalLink,
  Download,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Smartphone,
} from 'lucide-react';
import { TelegramInlineButton, ActivationCode } from '../types.js';
import { api } from '../api.js';

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  buttons?: TelegramInlineButton[][];
  time: string;
}

interface TelegramSimulatorProps {
  codes: ActivationCode[];
  onRefreshData?: () => void;
}

export const TelegramSimulator: React.FC<TelegramSimulatorProps> = ({ codes, onRefreshData }) => {
  const [chatId, setChatId] = useState<string>('student-sim-101');
  const [studentName, setStudentName] = useState<string>('طالب تجريبي');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [studentStatus, setStudentStatus] = useState<{
    isSubscribed: boolean;
    remainingDays?: number;
    expiresAt?: string;
  }>({ isSubscribed: false });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Initial bot start message on mount
  useEffect(() => {
    handleSendAction('text', '/start', true);
  }, [chatId]);

  const handleSendAction = async (type: 'text' | 'callback', content: string, isInitial = false) => {
    if (!content.trim() && type === 'text') return;

    const timeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    // If user text, append outgoing message
    if (type === 'text' && !isInitial) {
      setMessages(prev => [
        ...prev,
        {
          id: 'msg-' + Date.now(),
          sender: 'user',
          text: content,
          time: timeStr,
        },
      ]);
      setInputText('');
    }

    setLoading(true);

    try {
      const response = await api.simulateInteraction({
        chatId,
        type,
        content,
        userInfo: { firstName: studentName, username: 'student_sim' },
      });

      const botMsg: Message = {
        id: 'bot-' + Date.now(),
        sender: 'bot',
        text: response.text,
        buttons: response.replyMarkup?.inline_keyboard,
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, botMsg]);

      if (response.studentStatus) {
        setStudentStatus({
          isSubscribed: response.studentStatus.isSubscribed,
          remainingDays: response.studentStatus.remainingDays,
          expiresAt: response.studentStatus.expiresAt,
        });
      }

      // If action was code activation or admin modification, refresh parent lists
      if (content.includes('STU-') || content.length >= 6 || content.startsWith('admin:') || content === 'elgohry1') {
        onRefreshData?.();
      }
    } catch (err: any) {
      console.error('Simulator error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([]);
    // change chatId to simulate brand new user
    const newId = 'student-sim-' + Math.floor(Math.random() * 900 + 100);
    setChatId(newId);
    setStudentStatus({ isSubscribed: false });
  };

  const handleQuickCode = (codeStr: string) => {
    setInputText(codeStr);
    handleSendAction('text', codeStr);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Simulator Controls & Tips */}
      <div className="lg:col-span-4 space-y-4">
        {/* Status card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-blue-600" />
              <span>محاكي بوت تليجرام</span>
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              تفاعلي حي
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            يعمل هذا المحاكي بنفس محرك البوت الفعلي المربوط بالـ Webhook مع الأزرار الشفافة التفاعلية.
          </p>

          <div className="mt-4 pt-3 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">معرف الطالب (Simulated Chat ID):</span>
              <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                {chatId}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">حالة الاشتراك الحالية:</span>
              {studentStatus.isSubscribed ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full text-[11px]">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  مفعل (متبقي {studentStatus.remainingDays} يوم)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded-full text-[11px]">
                  <AlertCircle className="w-3 h-3 text-rose-600" />
                  غير مفعل / مطلوب كود
                </span>
              )}
            </div>

            <button
              onClick={handleResetChat}
              className="w-full mt-2 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>إعادة ضبط المحادثة كطالب جديد</span>
            </button>
          </div>
        </div>

        {/* Available codes for quick testing */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
            <KeyRound className="w-4 h-4 text-amber-600" />
            <span>أكواد جاهزة للتجربة السريعة:</span>
          </h4>
          <p className="text-[11px] text-slate-500 mb-3">
            اضغط على أي كود لإرساله فوراً في الشات وتجربة عملية التفعيل:
          </p>

          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {codes
              .filter(c => c.status === 'unused')
              .slice(0, 5)
              .map(code => (
                <button
                  key={code.code}
                  onClick={() => handleQuickCode(code.code)}
                  className="w-full text-right px-3 py-2 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-xs transition-colors flex items-center justify-between group"
                >
                  <div>
                    <span className="font-mono font-bold text-slate-800 group-hover:text-blue-700">
                      {code.code}
                    </span>
                    <span className="block text-[10px] text-slate-500">
                      {code.studentName || code.note || 'كود متاح'} ({code.durationDays} يوم)
                    </span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-100/70 text-blue-800 rounded font-semibold">
                    جرب الآن
                  </span>
                </button>
              ))}

            {codes.filter(c => c.status === 'unused').length === 0 && (
              <div className="text-xs text-slate-400 text-center py-3">
                لا توجد أكواد غير مستخدمة حالياً. يمكنك إنشاء كود جديد من تبويب "أكواد التفعيل".
              </div>
            )}
          </div>
        </div>

        {/* Feature notes */}
        <div className="bg-blue-50/70 rounded-xl border border-blue-100 p-4 text-xs text-blue-900 leading-relaxed space-y-2">
          <div className="font-bold flex items-center gap-1 text-blue-800">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>مميزات أزرار تليجرام الشفافة:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-blue-800/90 text-[11px]">
            <li>أزرار تفاعلية داخل الرسالة (Inline Buttons) لا تغطي لوحة المفاتيح.</li>
            <li>تحديث فوري لنص الرسالة عند التنقل بين المواد والكتب.</li>
            <li>زر تنزيل مباشر (PDF) يفتح الملف للطالب بنقرة واحدة.</li>
          </ul>
        </div>
      </div>

      {/* Right Column: The Telegram Phone Frame Simulator */}
      <div className="lg:col-span-8">
        <div className="max-w-md mx-auto bg-slate-900 rounded-[32px] p-2.5 sm:p-3 shadow-2xl border-4 border-slate-800">
          {/* Phone Screen Container */}
          <div className="bg-[#0e1621] text-white rounded-[24px] overflow-hidden flex flex-col h-[650px] border border-slate-700/50 shadow-inner">
            {/* Telegram Header */}
            <div className="bg-[#17212b] px-4 py-3 flex items-center justify-between border-b border-slate-800/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold shadow-xs">
                    <Bot className="w-5 h-5" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#17212b]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-100 tracking-wide flex items-center gap-1">
                    <span>بوت الكتب والمذكرات</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-mono">
                      bot
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">متصل دائماً • جاهز لخدمة الطلاب</p>
                </div>
              </div>

              <button
                onClick={handleResetChat}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50 transition-colors"
                title="إعادة تشغيل البوت"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Messages Stream */}
            <div
              className="flex-1 overflow-y-auto p-4 space-y-4 text-right selection:bg-blue-600 selection:text-white"
              style={{
                backgroundImage: `radial-gradient(#1f2c3a 1px, transparent 1px)`,
                backgroundSize: '16px 16px',
              }}
            >
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  {/* Chat Bubble */}
                  <div
                    className={`max-w-[88%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed relative shadow-md ${
                      msg.sender === 'user'
                        ? 'bg-[#2b5278] text-white rounded-bl-sm'
                        : 'bg-[#182533] text-slate-100 border border-slate-700/50 rounded-br-sm'
                    }`}
                  >
                    {/* Message HTML content parsed */}
                    <div
                      className="whitespace-pre-wrap break-words"
                      dangerouslySetInnerHTML={{ __html: msg.text }}
                    />

                    {/* Timestamp */}
                    <div
                      className={`text-[10px] mt-1.5 flex items-center gap-1 ${
                        msg.sender === 'user' ? 'text-blue-200 justify-end' : 'text-slate-400 justify-start'
                      }`}
                    >
                      <span>{msg.time}</span>
                    </div>
                  </div>

                  {/* Telegram Transparent Inline Buttons Grid */}
                  {msg.buttons && msg.buttons.length > 0 && (
                    <div className="w-full max-w-[88%] mt-2 space-y-1.5">
                      {msg.buttons.map((row, rIdx) => (
                        <div key={rIdx} className="grid grid-flow-col gap-1.5 auto-cols-fr">
                          {row.map((btn, bIdx) => {
                            if (btn.url) {
                              return (
                                <a
                                  key={bIdx}
                                  href={btn.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="tg-inline-btn py-2 px-3 rounded-xl text-center text-xs font-semibold text-blue-300 hover:text-white bg-[#1f2d3d]/90 hover:bg-[#2b5278]/90 border border-blue-500/20 shadow-xs flex items-center justify-center gap-1.5 transition-all"
                                >
                                  <Download className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                  <span className="truncate">{btn.text}</span>
                                  <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                                </a>
                              );
                            }

                            return (
                              <button
                                key={bIdx}
                                onClick={() => handleSendAction('callback', btn.callback_data || '')}
                                className="tg-inline-btn py-2 px-3 rounded-xl text-center text-xs font-semibold text-blue-300 hover:text-white bg-[#1f2d3d]/90 hover:bg-[#2b5278]/90 border border-blue-500/20 shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-98"
                              >
                                <span className="truncate">{btn.text}</span>
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce [animation-delay:0.4s]" />
                  <span>البوت يكتب...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Action Bar above input */}
            <div className="bg-[#17212b] px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto border-t border-slate-800">
              <button
                onClick={() => handleSendAction('text', '/start')}
                className="px-2.5 py-1 text-[11px] font-semibold bg-[#242f3d] hover:bg-[#2b5278] text-slate-200 rounded-md whitespace-nowrap transition-colors"
              >
                /start
              </button>
              <button
                onClick={() => handleSendAction('callback', 'menu:categories')}
                className="px-2.5 py-1 text-[11px] font-semibold bg-[#242f3d] hover:bg-[#2b5278] text-slate-200 rounded-md whitespace-nowrap transition-colors"
              >
                📚 المراحل والمواد
              </button>
              <button
                onClick={() => handleSendAction('callback', 'menu:status')}
                className="px-2.5 py-1 text-[11px] font-semibold bg-[#242f3d] hover:bg-[#2b5278] text-slate-200 rounded-md whitespace-nowrap transition-colors"
              >
                👤 حسابي واشتراكي
              </button>
            </div>

            {/* Chat Input Bar */}
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSendAction('text', inputText);
              }}
              className="bg-[#17212b] p-3 flex items-center gap-2 border-t border-slate-800/80 shrink-0"
            >
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="أرسل كود التفعيل أو ابحث عن مذكرة..."
                className="flex-1 bg-[#242f3d] text-white text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-700/60 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || loading}
                className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white flex items-center justify-center transition-colors shadow-sm shrink-0"
              >
                <Send className="w-4 h-4 rotate-180" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
