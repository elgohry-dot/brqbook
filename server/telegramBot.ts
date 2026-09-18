import { db } from './db.js';
import { TelegramInlineButton, TelegramSimulationResponse, BotConnectionLog, BotDiagnostics } from '../src/types.js';

interface TelegramUser {
  id: number | string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

interface ProcessResult {
  text: string;
  inline_keyboard?: TelegramInlineButton[][];
}

export class TelegramBotService {
  private isPolling = false;
  private lastUpdateId = 0;
  private adminChatIds = new Set<string | number>();
  private adminStates = new Map<string | number, { step: string; data?: any }>();
  private connectionLogs: BotConnectionLog[] = [];
  private readonly maxLogs = 60;
  private lastUpdateReceivedAt: string | undefined = undefined;
  private totalUpdatesProcessed = 0;

  constructor() {
    this.addLog({
      type: 'system',
      direction: 'internal',
      status: 'info',
      endpoint: 'system:init',
      summary: 'بدء تشغيل خدمة تليجرام بوت في السيرفر',
      details: 'تم تهيئة المحرك وتفعيل محاولة الاتصال التلقائي',
    });
    this.startPolling();
  }

  public addLog(log: Omit<BotConnectionLog, 'id' | 'timestamp'>) {
    const entry: BotConnectionLog = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      ...log,
    };
    this.connectionLogs.unshift(entry);
    if (this.connectionLogs.length > this.maxLogs) {
      this.connectionLogs.pop();
    }
  }

  public getConnectionLogs(): BotConnectionLog[] {
    return this.connectionLogs;
  }

  public clearConnectionLogs() {
    this.connectionLogs = [];
  }

  public async deleteWebhook(token?: string) {
    const start = Date.now();
    try {
      const res = await fetch(this.getApiUrl('deleteWebhook', token));
      const data = await res.json();
      db.updateSettings({ isWebhookSet: false, webhookUrl: '' });
      this.addLog({
        type: 'webhook',
        direction: 'outbound',
        status: data.ok ? 'success' : 'error',
        statusCode: data.error_code || (data.ok ? 200 : 400),
        endpoint: 'deleteWebhook',
        summary: data.ok ? 'تم حذف الويب هوك بنجاح من تليجرام' : 'فشل حذف الويب هوك',
        details: JSON.stringify(data),
        durationMs: Date.now() - start,
      });
      return data;
    } catch (err: any) {
      this.addLog({
        type: 'webhook',
        direction: 'outbound',
        status: 'error',
        endpoint: 'deleteWebhook',
        summary: 'خطأ استثناء أثناء حذف الويب هوك',
        details: err?.message,
        durationMs: Date.now() - start,
      });
      return { ok: false, description: err?.message || 'Error deleting webhook' };
    }
  }

  private pollTimeout: NodeJS.Timeout | null = null;

  public async startPolling() {
    const settings = db.getSettings();
    if (settings.isWebhookSet && settings.webhookUrl) {
      this.isPolling = false;
      if (this.pollTimeout) clearTimeout(this.pollTimeout);
      console.log(`[Webhook Mode Active] Webhook is configured at ${settings.webhookUrl}. Long Polling disabled.`);
      this.addLog({
        type: 'webhook',
        direction: 'internal',
        status: 'info',
        endpoint: 'startPolling',
        summary: 'وضع الويب هوك (Webhook) مفعل حالياً',
        details: `البوت يستقبل الرسائل مباشرة عبر الويب هوك على: ${settings.webhookUrl}`,
      });
      return;
    }

    if (this.isPolling) return;
    this.isPolling = true;
    console.log('Starting Telegram Bot long polling engine...');

    try {
      const token = settings.botToken;
      if (token) {
        console.log('Ensuring clean Telegram updates connection...');
        await fetch(this.getApiUrl('deleteWebhook', token));
      }
      this.addLog({
        type: 'polling',
        direction: 'internal',
        status: 'info',
        endpoint: 'startPolling',
        summary: 'تم تشغيل محرك سحب التحديثات (Long Polling)',
        details: `التوكن متوفر: ${Boolean(token)} | المعرف: @${settings.botUsername}`,
      });
    } catch (err) {
      console.error('Error clearing webhook during polling start:', err);
    }

    this.poll();
  }

  private async poll() {
    if (!this.isPolling) return;
    const settings = db.getSettings();
    const token = settings.botToken;
    if (!token) {
      setTimeout(() => this.poll(), 3000);
      return;
    }

    const start = Date.now();
    try {
      const url = this.getApiUrl('getUpdates') + `?offset=${this.lastUpdateId + 1}&timeout=5`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await res.json();
      const duration = Date.now() - start;

      if (data.ok && data.result && data.result.length > 0) {
        this.lastUpdateReceivedAt = new Date().toISOString();
        this.totalUpdatesProcessed += data.result.length;

        for (const update of data.result) {
          try {
            this.lastUpdateId = update.update_id;
            console.log(`[Telegram Update] Received update_id: ${update.update_id}`);
            
            const sender = update.message?.from?.username || update.callback_query?.from?.username || 'user';
            const type = update.message ? `رسالة: "${update.message.text || ''}"` : `زر تفاعلي: "${update.callback_query?.data || ''}"`;

            this.addLog({
              type: 'polling',
              direction: 'inbound',
              status: 'success',
              statusCode: 200,
              endpoint: 'getUpdates',
              summary: `استلام تحديث جديد (#${update.update_id}) من @${sender}`,
              details: type,
              durationMs: duration,
            });

            await this.handleWebhookUpdate(update);
          } catch (updateErr: any) {
            console.error('[Telegram Update Error] Error processing update:', updateErr);
            this.addLog({
              type: 'system',
              direction: 'internal',
              status: 'error',
              endpoint: 'handleUpdate',
              summary: 'خطأ استثناء أثناء معالجة التحديث، تم تجاوزه لضمان استمرار البوت',
              details: updateErr?.message || String(updateErr),
            });
          }
        }
      } else if (!data.ok) {
        // Log API error
        this.addLog({
          type: data.description?.includes('Conflict') ? 'conflict_detected' : 'telegram_api',
          direction: 'inbound',
          status: 'error',
          statusCode: data.error_code || 400,
          endpoint: 'getUpdates',
          summary: data.description?.includes('Conflict')
            ? 'تعارض: تم اكتشاف ويب هوك نشط يعطل السحب المباشر (Conflict 409)'
            : `خطأ من واجهة تليجرام: ${data.description || 'غير معروف'}`,
          details: JSON.stringify(data),
          durationMs: duration,
        });

        // If conflict error (webhook was set elsewhere), clear webhook and retry
        if (data.description && data.description.includes('Conflict')) {
          if (data.description.includes('webhook is active')) {
            console.log('Conflict detected with webhook, clearing webhook to restore polling...');
            await fetch(this.getApiUrl('deleteWebhook', token));
            this.addLog({
              type: 'system',
              direction: 'outbound',
              status: 'warning',
              endpoint: 'deleteWebhook',
              summary: 'إلغاء تلقائي للويب هوك المتعلق لإعادة السحب المباشر',
            });
          } else if (data.description.includes('other getUpdates request')) {
            console.log('Conflict detected: another bot instance is running.');
            this.addLog({
              type: 'system',
              direction: 'internal',
              status: 'warning',
              endpoint: 'getUpdates',
              summary: 'نسخة أخرى من البوت تعمل وتسحب التحديثات. يتم التأخير قليلاً.',
            });
            // Sleep longer to let the other instance (Prod) handle it, or share load
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
      }
    } catch (err: any) {
      this.addLog({
        type: 'telegram_api',
        direction: 'outbound',
        status: 'error',
        endpoint: 'getUpdates',
        summary: 'تعذر الاتصال بخوادم تليجرام (Network error)',
        details: err?.message || 'Network timeout or unreachable',
        durationMs: Date.now() - start,
      });
    }

    // Immediately schedule next poll cycle
    if (this.pollTimeout) clearTimeout(this.pollTimeout);
    this.pollTimeout = setTimeout(() => this.poll(), 500);
  }

  private getApiUrl(method: string, token?: string): string {
    const activeToken = token || db.getSettings().botToken;
    return `https://api.telegram.org/bot${activeToken}/${method}`;
  }

  public async getBotInfo(token?: string) {
    const start = Date.now();
    try {
      const res = await fetch(this.getApiUrl('getMe', token));
      const data = await res.json();
      this.addLog({
        type: 'telegram_api',
        direction: 'outbound',
        status: data.ok ? 'success' : 'error',
        statusCode: data.error_code || (data.ok ? 200 : 401),
        endpoint: 'getMe',
        summary: data.ok ? `فحص التوكن ناجح: @${data.result?.username} (${data.result?.first_name})` : `فشل فحص التوكن: ${data.description}`,
        details: JSON.stringify(data),
        durationMs: Date.now() - start,
      });
      return data;
    } catch (err: any) {
      this.addLog({
        type: 'telegram_api',
        direction: 'outbound',
        status: 'error',
        endpoint: 'getMe',
        summary: 'تعذر الاتصال بـ getMe في تليجرام',
        details: err?.message,
        durationMs: Date.now() - start,
      });
      return { ok: false, description: err?.message || 'Failed to connect to Telegram API' };
    }
  }

  public async setWebhook(webhookUrl: string, token?: string) {
    const start = Date.now();
    try {
      const res = await fetch(this.getApiUrl('setWebhook', token), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl }),
      });
      const data = await res.json();
      if (data.ok) {
        db.updateSettings({ isWebhookSet: true, webhookUrl });
        this.isPolling = false;
        if (this.pollTimeout) clearTimeout(this.pollTimeout);
      }
      this.addLog({
        type: 'webhook',
        direction: 'outbound',
        status: data.ok ? 'success' : 'error',
        statusCode: data.error_code || (data.ok ? 200 : 400),
        endpoint: 'setWebhook',
        summary: data.ok ? `تم تعيين الويب هوك بنجاح على: ${webhookUrl}` : `فشل تعيين الويب هوك: ${data.description}`,
        details: JSON.stringify(data),
        durationMs: Date.now() - start,
      });
      return data;
    } catch (err: any) {
      this.addLog({
        type: 'webhook',
        direction: 'outbound',
        status: 'error',
        endpoint: 'setWebhook',
        summary: 'استثناء أثناء تعيين الويب هوك',
        details: err?.message,
        durationMs: Date.now() - start,
      });
      return { ok: false, description: err?.message || 'Error setting webhook' };
    }
  }

  public async getWebhookInfo(token?: string) {
    const start = Date.now();
    try {
      const res = await fetch(this.getApiUrl('getWebhookInfo', token));
      const data = await res.json();
      this.addLog({
        type: 'webhook',
        direction: 'outbound',
        status: data.ok ? 'success' : 'error',
        statusCode: data.error_code || (data.ok ? 200 : 400),
        endpoint: 'getWebhookInfo',
        summary: data.ok ? `فحص حالة الويب هوك: ${data.result?.url ? 'مربوط بـ ' + data.result.url : 'لا يوجد ويب هوك (وضع Polling)'}` : 'فشل جلب معلومات الويب هوك',
        details: JSON.stringify(data),
        durationMs: Date.now() - start,
      });
      return data;
    } catch (err: any) {
      return { ok: false, description: err?.message || 'Failed to get webhook info' };
    }
  }

  public async getDiagnostics(): Promise<BotDiagnostics> {
    const settings = db.getSettings();
    const token = settings.botToken;
    let apiStatus = { reachable: false, botInfo: undefined as any, error: undefined as string | undefined, responseTimeMs: 0 };
    let webhookInfo: any = undefined;

    if (token) {
      const t0 = Date.now();
      try {
        const [meRes, whRes] = await Promise.all([
          fetch(this.getApiUrl('getMe', token), { signal: AbortSignal.timeout(5000) })
            .then(r => r.json())
            .catch(err => ({ ok: false, description: err?.message || 'Telegram server unreachable / timeout' })),
          fetch(this.getApiUrl('getWebhookInfo', token), { signal: AbortSignal.timeout(5000) })
            .then(r => r.json())
            .catch(err => ({ ok: false, description: err?.message || 'Telegram server unreachable / timeout' })),
        ]);
        apiStatus.responseTimeMs = Date.now() - t0;
        if (meRes.ok) {
          apiStatus.reachable = true;
          apiStatus.botInfo = meRes.result;
        } else {
          apiStatus.error = meRes.description;
        }
        if (whRes.ok) {
          webhookInfo = whRes.result;
        }
      } catch (e: any) {
        apiStatus.error = e?.message || 'Telegram connection error';
      }
    }

    // Determine diagnosis state, reason, and solution
    let state: 'healthy' | 'warning' | 'critical' = 'healthy';
    let title = 'البوت متصل ويعمل بشكل سليم';
    let reason = 'محرك السحب المباشر (Long Polling) يستقبل الرسائل من تليجرام دون أي تعارض أو حجب.';
    let solution = 'لا يتطلب أي إجراء حالياً، البوت جاهز ويستجيب للطلاب فوراً.';

    if (!token) {
      state = 'critical';
      title = 'لم يتم تعيين توكن البوت';
      reason = 'لا يوجد توكن مدخل في إعدادات المنظومة للاتصال بـ Telegram Bot API.';
      solution = 'انتقل إلى إعدادات البوت وأدخل توكن البوت الذي حصلت عليه من @BotFather.';
    } else if (!apiStatus.reachable) {
      state = 'critical';
      title = 'فشل الاتصال بخوادم تليجرام أو التوكن غير صالح';
      reason = apiStatus.error || 'خادم تليجرام يرفض التوكن أو غير متاح.';
      solution = 'تأكد من صحة التوكن من @BotFather ومن عدم حظر البوت أو حذفه.';
    } else if (webhookInfo?.url && webhookInfo.url.length > 0) {
      // If there is an active remote webhook URL
      if (webhookInfo.last_error_message) {
        state = 'warning';
        title = 'تليجرام يسجل أخطاء في تسليم الرسائل عبر الويب هوك';
        reason = `خطأ تليجرام: ${webhookInfo.last_error_message} (تحديثات معلقة: ${webhookInfo.pending_update_count || 0})`;
        solution = 'اضغط على "تفعيل السحب المباشر (Long Polling)" لحذف الويب هوك وسحب الرسائل مباشرة دون الاعتماد على دومين خارجي.';
      } else {
        state = 'warning';
        title = 'الويب هوك مفعل على تليجرام';
        reason = `الرسائل يتم توجيهها إلى: ${webhookInfo.url}`;
        solution = 'في بيئة المعاينة أو السحاب قد يعاد توجيه الروابط؛ إذا لم يستجب البوت انقر زر السحب المباشر.';
      }
    } else if (webhookInfo && webhookInfo.pending_update_count > 10) {
      state = 'warning';
      title = `توجد ${webhookInfo.pending_update_count} رسائل متراكمة في قائمة الانتظار`;
      reason = 'البوت كان متوقفاً لفترة وهناك رسائل قديمة بانتظار المعالجة.';
      solution = 'يقوم محرك السحب حالياً بمعالجة الرسائل تلقائياً.';
    }

    return {
      botTokenConfigured: Boolean(token),
      botUsername: settings.botUsername,
      botName: settings.botName,
      mode: webhookInfo?.url ? 'webhook' : (this.isPolling ? 'polling' : 'idle'),
      isPolling: this.isPolling,
      isWebhookSet: Boolean(settings.isWebhookSet || webhookInfo?.url),
      webhookUrl: webhookInfo?.url || settings.webhookUrl,
      telegramApiStatus: apiStatus,
      webhookInfo,
      lastUpdateReceivedAt: this.lastUpdateReceivedAt,
      totalUpdatesProcessed: this.totalUpdatesProcessed,
      recentLogs: this.connectionLogs,
      diagnosisSummary: {
        state,
        title,
        reason,
        solution,
      },
    };
  }

  public async sendTelegramMessage(chatId: string | number, text: string, replyMarkup?: { inline_keyboard: TelegramInlineButton[][] }) {
    const token = db.getSettings().botToken;
    if (!token) return { ok: false, description: 'No bot token configured' };

    const start = Date.now();
    try {
      const body: any = {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      };
      if (replyMarkup) {
        body.reply_markup = replyMarkup;
      }

      const res = await fetch(this.getApiUrl('sendMessage', token), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.ok) {
        console.error('Telegram sendMessage error details:', data);
        // Fallback retry without HTML formatting if parsing fails
        if (data.description && data.description.includes('can\'t parse entities')) {
          const plainBody: any = { chat_id: chatId, text: text.replace(/<[^>]+>/g, '') };
          if (replyMarkup) plainBody.reply_markup = replyMarkup;
          const retryRes = await fetch(this.getApiUrl('sendMessage', token), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(plainBody),
          });
          const retryData = await retryRes.json();
          this.addLog({
            type: 'send_message',
            direction: 'outbound',
            status: retryData.ok ? 'success' : 'error',
            statusCode: retryData.error_code || (retryData.ok ? 200 : 400),
            endpoint: 'sendMessage (retry plain)',
            summary: retryData.ok ? `إرسال رسالة نصية إلى ${chatId}` : `فشل إرسال الرسالة إلى ${chatId}: ${retryData.description}`,
            details: text.slice(0, 100),
            durationMs: Date.now() - start,
          });
          return retryData;
        }
      }

      this.addLog({
        type: 'send_message',
        direction: 'outbound',
        status: data.ok ? 'success' : 'error',
        statusCode: data.error_code || (data.ok ? 200 : 400),
        endpoint: 'sendMessage',
        summary: data.ok ? `تم إرسال رسالة بنجاح إلى شات ID: ${chatId}` : `فشل إرسال رسالة إلى ${chatId}: ${data.description}`,
        details: text.slice(0, 120),
        durationMs: Date.now() - start,
      });

      return data;
    } catch (err: any) {
      console.error('Failed to send Telegram message:', err);
      this.addLog({
        type: 'send_message',
        direction: 'outbound',
        status: 'error',
        endpoint: 'sendMessage',
        summary: `استثناء شبكة أثناء إرسال رسالة إلى ${chatId}`,
        details: err?.message,
        durationMs: Date.now() - start,
      });
      return { ok: false, description: err?.message };
    }
  }

  public async editTelegramMessage(chatId: string | number, messageId: number, text: string, replyMarkup?: { inline_keyboard: TelegramInlineButton[][] }) {
    const token = db.getSettings().botToken;
    if (!token) return { ok: false, description: 'No bot token configured' };

    try {
      const body: any = {
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'HTML',
      };
      if (replyMarkup) {
        body.reply_markup = replyMarkup;
      }

      const res = await fetch(this.getApiUrl('editMessageText', token), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.ok) {
        this.addLog({
          type: 'telegram_api',
          direction: 'outbound',
          status: 'error',
          statusCode: data.error_code || 400,
          endpoint: 'editMessageText',
          summary: 'خطأ أثناء تعديل الرسالة، سيتم إرسال رسالة جديدة كبديل',
          details: data.description || 'Unknown error',
        });
        // Fallback to sending a new message if editing is not possible
        return await this.sendTelegramMessage(chatId, text, replyMarkup);
      }
      
      this.addLog({
        type: 'send_message',
        direction: 'outbound',
        status: 'success',
        statusCode: 200,
        endpoint: 'editMessageText',
        summary: 'تم تعديل رسالة تفاعلية بنجاح (شات ID: ' + chatId + ')',
        details: text.substring(0, 100) + '...',
      });
      return data;
    } catch (err: any) {
      console.error('Failed to edit Telegram message:', err);
      return await this.sendTelegramMessage(chatId, text, replyMarkup);
    }
  }

  public async answerCallbackQuery(callbackQueryId: string, text?: string) {
    const token = db.getSettings().botToken;
    if (!token) return;
    try {
      await fetch(this.getApiUrl('answerCallbackQuery', token), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
      });
    } catch (err) {
      console.error('Error answering callback query:', err);
    }
  }

  private getAdminMenuKeyboard(): TelegramInlineButton[][] {
    return [
      [
        { text: '🗂️ إدارة الأقسام والمراحل', callback_data: 'admin:manage_cats' },
        { text: '📖 إدارة المواد الدراسية', callback_data: 'admin:manage_subs' }
      ],
      [
        { text: '📚 إدارة المذكرات والكتب', callback_data: 'admin:manage_books' }
      ],
      [
        { text: '🚪 تسجيل خروج', callback_data: 'admin:exit' }
      ]
    ];
  }

  private handleAdminCallback(chatId: string | number, callbackData: string): ProcessResult {
    // In-context deletion and immediate re-rendering
    if (callbackData.startsWith('admin:del_cat_id_remain:')) {
      const catId = callbackData.replace('admin:del_cat_id_remain:', '');
      db.deleteCategory(catId);
      return this.handleAction({ id: chatId } as any, 'callback', 'menu:categories');
    }

    if (callbackData.startsWith('admin:del_sub_id_remain:')) {
      const parts = callbackData.replace('admin:del_sub_id_remain:', '').split(':');
      const subId = parts[0];
      const catId = parts[1];
      db.deleteSubject(subId);
      return this.handleAction({ id: chatId } as any, 'callback', `cat:${catId}`);
    }

    if (callbackData.startsWith('admin:del_book_id_remain:')) {
      const parts = callbackData.replace('admin:del_book_id_remain:', '').split(':');
      const bookId = parts[0];
      const subId = parts[1];
      db.deleteBook(bookId);
      return this.handleAction({ id: chatId } as any, 'callback', `sub:${subId}`);
    }

    // Exit Admin Mode
    if (callbackData === 'admin:exit') {
      this.adminChatIds.delete(chatId);
      this.adminStates.delete(chatId);
      return {
        text: `🚪 تم تسجيل خروجك من لوحة التحكم بنجاح.\n\nتفضل بالعودة للقائمة الرئيسية للطلاب:`,
        inline_keyboard: [[{ text: '🏠 القائمة الرئيسية للطلاب', callback_data: 'menu:main' }]],
      };
    }

    // Main Admin Menu
    if (callbackData === 'admin:main') {
      this.adminStates.set(chatId, { step: 'none' });
      return {
        text: `🔑 <b>مرحباً بك مجدداً في لوحة تحكم المعلم السرية!</b> 🛠️\n\nأنت الآن في الوضع المطور. اختر الإجراء المطلوب أدناه للتحكم بالبوت:`,
        inline_keyboard: this.getAdminMenuKeyboard(),
      };
    }

    // 1. Manage Categories
    if (callbackData === 'admin:manage_cats') {
      this.adminStates.set(chatId, { step: 'none' });
      const categories = db.getCategories();
      return {
        text: `🗂️ <b>إدارة الأقسام والمراحل الدراسية:</b>\n\nإجمالي الأقسام الحالية: <b>${categories.length}</b> أقسام.\n\nالرجاء اختيار أحد الإجراءات المتاحة أدناه لمتابعة الإدارة:`,
        inline_keyboard: [
          [{ text: '➕ إضافة قسم دراسي جديد', callback_data: 'admin:add_cat' }],
          [{ text: '🗑️ حذف قسم تعليمي قائم', callback_data: 'admin:delete_cat_list' }],
          [{ text: '🔙 العودة للوحة التحكم الرئيسية', callback_data: 'admin:main' }]
        ],
      };
    }

    // Add Category Start
    if (callbackData === 'admin:add_cat') {
      this.adminStates.set(chatId, { step: 'add_cat_name', data: {} });
      return {
        text: `✍️ <b>يرجى إرسال اسم القسم أو المرحلة الدراسية الجديدة:</b>\nمثال: <code>الصف الأول الثانوي</code>\n\nاكتب الاسم وأرسله في رسالة الآن 👇`,
        inline_keyboard: [[{ text: '❌ إلغاء والتراجع', callback_data: 'admin:manage_cats' }]],
      };
    }

    // Delete Category List
    if (callbackData === 'admin:delete_cat_list') {
      const categories = db.getCategories();
      if (categories.length === 0) {
        return {
          text: `⚠️ لا توجد أقسام تعليمية مسجلة حالياً لحذفها!`,
          inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'admin:manage_cats' }]],
        };
      }
      const keyboard: TelegramInlineButton[][] = categories.map(cat => [
        { text: `❌ حذف: ${cat.icon || '🎓'} ${cat.name}`, callback_data: `admin:del_cat_id:${cat.id}` }
      ]);
      keyboard.push([{ text: '🔙 رجوع', callback_data: 'admin:manage_cats' }]);
      return {
        text: `⚠️ <b>تنبيه هام!</b>\nعند حذف أي قسم، سيتم حذف <b>جميع المواد والمذكرات</b> المرتبطة به فوراً.\n\nالرجاء اختيار القسم الذي ترغب في حذفه بحذر شديد:`,
        inline_keyboard: keyboard,
      };
    }

    // Delete Category Confirm
    if (callbackData.startsWith('admin:del_cat_id:')) {
      const catId = callbackData.replace('admin:del_cat_id:', '');
      const catName = db.getCategories().find(c => c.id === catId)?.name || 'القسم';
      db.deleteCategory(catId);
      return {
        text: `✅ <b>تم حذف القسم [${catName}] وجميع مواده ومذكراته بنجاح وفوراً!</b>`,
        inline_keyboard: [[{ text: '🔙 العودة لإدارة الأقسام', callback_data: 'admin:manage_cats' }]],
      };
    }

    // 2. Manage Subjects
    if (callbackData === 'admin:manage_subs') {
      this.adminStates.set(chatId, { step: 'none' });
      const subjects = db.getSubjects();
      return {
        text: `📖 <b>إدارة المواد الدراسية:</b>\n\nإجمالي المواد الحالية: <b>${subjects.length}</b> مادة.\n\nاختر أحد الإجراءات للتحكم بالمواد:`,
        inline_keyboard: [
          [{ text: '➕ إضافة مادة دراسية جديدة', callback_data: 'admin:add_sub' }],
          [{ text: '🗑️ حذف مادة دراسية قائمة', callback_data: 'admin:delete_sub_list' }],
          [{ text: '🔙 العودة للوحة التحكم الرئيسية', callback_data: 'admin:main' }]
        ],
      };
    }

    // Add Subject Select Parent Category
    if (callbackData === 'admin:add_sub') {
      const categories = db.getCategories();
      if (categories.length === 0) {
        return {
          text: `⚠️ <b>عفواً!</b> يجب عليك إنشاء قسم واحد على الأقل أولاً قبل البدء في إضافة المواد!`,
          inline_keyboard: [[{ text: '➕ إنشاء قسم دراسي أولاً', callback_data: 'admin:add_cat' }]],
        };
      }
      const keyboard: TelegramInlineButton[][] = categories.map(cat => [
        { text: `${cat.icon || '🎓'} ${cat.name}`, callback_data: `admin:add_sub_cat:${cat.id}` }
      ]);
      keyboard.push([{ text: '❌ إلغاء', callback_data: 'admin:manage_subs' }]);
      return {
        text: `📁 <b>اختر القسم أو الصف الدراسي الذي تتبع له المادة الجديدة:</b>`,
        inline_keyboard: keyboard,
      };
    }

    if (callbackData.startsWith('admin:add_sub_cat:')) {
      const catId = callbackData.replace('admin:add_sub_cat:', '');
      this.adminStates.set(chatId, { step: 'add_sub_name', data: { categoryId: catId } });
      return {
        text: `✍️ <b>جميل! يرجى الآن إرسال اسم المادة الدراسية الجديدة:</b>\nمثال: <code>الفيزياء</code>، <code>اللغة الإنجليزية</code>\n\nاكتب الاسم وأرسله الآن 👇`,
        inline_keyboard: [[{ text: '❌ إلغاء والتراجع', callback_data: 'admin:manage_subs' }]],
      };
    }

    // Delete Subject Select Category
    if (callbackData === 'admin:delete_sub_list') {
      const categories = db.getCategories();
      if (categories.length === 0) {
        return {
          text: `⚠️ لا توجد أقسام تعليمية مضافة لعرض موادها!`,
          inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'admin:manage_subs' }]],
        };
      }
      const keyboard: TelegramInlineButton[][] = categories.map(cat => [
        { text: `${cat.icon || '🎓'} ${cat.name}`, callback_data: `admin:del_sub_select_cat:${cat.id}` }
      ]);
      keyboard.push([{ text: '🔙 رجوع', callback_data: 'admin:manage_subs' }]);
      return {
        text: `📁 <b>اختر القسم الذي تنتمي له المادة التي تود حذفها:</b>`,
        inline_keyboard: keyboard,
      };
    }

    if (callbackData.startsWith('admin:del_sub_select_cat:')) {
      const catId = callbackData.replace('admin:del_sub_select_cat:', '');
      const subjects = db.getSubjects(catId);
      if (subjects.length === 0) {
        return {
          text: `⚠️ لا توجد أي مواد دراسية مضافة في هذا القسم حالياً!`,
          inline_keyboard: [[{ text: '🔙 اختر قسماً آخر', callback_data: 'admin:delete_sub_list' }]],
        };
      }
      const keyboard: TelegramInlineButton[][] = subjects.map(sub => [
        { text: `❌ حذف: ${sub.icon || '📖'} ${sub.name}`, callback_data: `admin:del_sub_id:${sub.id}` }
      ]);
      keyboard.push([{ text: '🔙 رجوع', callback_data: 'admin:delete_sub_list' }]);
      return {
        text: `⚠️ <b>تنبيه!</b> عند حذف المادة سيتم أيضاً حذف <b>جميع مذكرات الـ PDF المرفوعة بداخلها</b>.\n\nاختر المادة التي تود حذفها نهائياً:`,
        inline_keyboard: keyboard,
      };
    }

    if (callbackData.startsWith('admin:del_sub_id:')) {
      const subId = callbackData.replace('admin:del_sub_id:', '');
      const subName = db.getSubjects().find(s => s.id === subId)?.name || 'المادة';
      db.deleteSubject(subId);
      return {
        text: `✅ <b>تم حذف المادة [${subName}] ومذكراتها بالكامل فوراً!</b>`,
        inline_keyboard: [[{ text: '🔙 العودة لإدارة المواد', callback_data: 'admin:manage_subs' }]],
      };
    }

    // 3. Manage Books/Notes
    if (callbackData === 'admin:manage_books') {
      this.adminStates.set(chatId, { step: 'none' });
      const books = db.getBooks();
      return {
        text: `📚 <b>إدارة المذكرات والكتب الدراسية:</b>\n\nإجمالي المذكرات المتاحة للتحميل: <b>${books.length}</b> مذكرة.\n\nاختر أحد الإجراءات للمتابعة:`,
        inline_keyboard: [
          [{ text: '➕ رفع ونشر مذكرة PDF جديدة', callback_data: 'admin:add_book' }],
          [{ text: '🗑️ حذف مذكرة قائمة', callback_data: 'admin:delete_book_list' }],
          [{ text: '🔙 العودة للوحة التحكم الرئيسية', callback_data: 'admin:main' }]
        ],
      };
    }

    // Add Book Select Category
    if (callbackData === 'admin:add_book') {
      const categories = db.getCategories();
      if (categories.length === 0) {
        return {
          text: `⚠️ <b>عفواً!</b> يجب إنشاء قسم ومادة دراسية أولاً قبل تمكنك من رفع المذكرات.`,
          inline_keyboard: [[{ text: '➕ إنشاء قسم دراسي', callback_data: 'admin:add_cat' }]],
        };
      }
      const keyboard: TelegramInlineButton[][] = categories.map(cat => [
        { text: `${cat.icon || '🎓'} ${cat.name}`, callback_data: `admin:add_book_cat:${cat.id}` }
      ]);
      keyboard.push([{ text: '❌ إلغاء', callback_data: 'admin:manage_books' }]);
      return {
        text: `📁 <b>اختر القسم أو الصف الدراسي التابع له الكتاب الجديد:</b>`,
        inline_keyboard: keyboard,
      };
    }

    if (callbackData.startsWith('admin:add_book_cat:')) {
      const catId = callbackData.replace('admin:add_book_cat:', '');
      const subjects = db.getSubjects(catId);
      if (subjects.length === 0) {
        return {
          text: `⚠️ <b>عفواً!</b> لا توجد مواد مضافة في هذا القسم حالياً لتصنيف الكتب بداخلها. يرجى إنشاء مادة أولاً.`,
          inline_keyboard: [[{ text: '➕ إضافة مادة دراسية جديدة', callback_data: 'admin:add_sub' }]],
        };
      }
      const keyboard: TelegramInlineButton[][] = subjects.map(sub => [
        { text: `${sub.icon || '📖'} ${sub.name}`, callback_data: `admin:add_book_sub:${catId}:${sub.id}` }
      ]);
      keyboard.push([{ text: '🔙 رجوع للوراء', callback_data: 'admin:add_book' }]);
      return {
        text: `📖 <b>اختر المادة الدراسية التابع لها الكتاب الجديد:</b>`,
        inline_keyboard: keyboard,
      };
    }

    if (callbackData.startsWith('admin:add_book_sub:')) {
      const parts = callbackData.replace('admin:add_book_sub:', '').split(':');
      const catId = parts[0];
      const subId = parts[1];
      this.adminStates.set(chatId, {
        step: 'add_book_title',
        data: { categoryId: catId, subjectId: subId }
      });
      return {
        text: `✍️ <b>يرجى إرسال عنوان الكتاب أو المذكرة الجديدة:</b>\nمثال: <code>مذكرة الشرح الشامل في الفيزياء - الباب الأول 2026</code>\n\nاكتب العنوان المذكرة وأرسله الآن 👇`,
        inline_keyboard: [[{ text: '❌ إلغاء والتراجع', callback_data: 'admin:manage_books' }]],
      };
    }

    // Delete Book Select Category
    if (callbackData === 'admin:delete_book_list') {
      const categories = db.getCategories();
      if (categories.length === 0) {
        return {
          text: `⚠️ لا توجد أقسام لعرض كتبها حالياً!`,
          inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'admin:manage_books' }]],
        };
      }
      const keyboard: TelegramInlineButton[][] = categories.map(cat => [
        { text: `${cat.icon || '🎓'} ${cat.name}`, callback_data: `admin:del_book_select_cat:${cat.id}` }
      ]);
      keyboard.push([{ text: '🔙 رجوع', callback_data: 'admin:manage_books' }]);
      return {
        text: `📁 <b>اختر القسم الذي يتواجد به المذكرة التي تود حذفها:</b>`,
        inline_keyboard: keyboard,
      };
    }

    if (callbackData.startsWith('admin:del_book_select_cat:')) {
      const catId = callbackData.replace('admin:del_book_select_cat:', '');
      const subjects = db.getSubjects(catId);
      if (subjects.length === 0) {
        return {
          text: `⚠️ لا توجد أي مواد في هذا القسم!`,
          inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'admin:delete_book_list' }]],
        };
      }
      const keyboard: TelegramInlineButton[][] = subjects.map(sub => [
        { text: `${sub.icon || '📖'} ${sub.name}`, callback_data: `admin:del_book_select_sub:${sub.id}` }
      ]);
      keyboard.push([{ text: '🔙 رجوع لقائمة الأقسام', callback_data: 'admin:delete_book_list' }]);
      return {
        text: `📖 <b>اختر المادة الدراسية للمذكرة التي تريد حذفها:</b>`,
        inline_keyboard: keyboard,
      };
    }

    if (callbackData.startsWith('admin:del_book_select_sub:')) {
      const subId = callbackData.replace('admin:del_book_select_sub:', '');
      const books = db.getBooks(undefined, subId);
      if (books.length === 0) {
        return {
          text: `⚠️ لا توجد أي مذكرات PDF مرفوعة في هذه المادة حالياً!`,
          inline_keyboard: [[{ text: '🔙 رجوع', callback_data: `admin:delete_book_list` }]],
        };
      }
      const keyboard: TelegramInlineButton[][] = books.map(book => [
        { text: `❌ حذف: ${book.title}`, callback_data: `admin:del_book_id:${book.id}` }
      ]);
      keyboard.push([{ text: '🔙 رجوع للمواد', callback_data: `admin:delete_book_list` }]);
      return {
        text: `⚠️ <b>اختر المذكرة التي ترغب في حذفها فوراً:</b>`,
        inline_keyboard: keyboard,
      };
    }

    if (callbackData.startsWith('admin:del_book_id:')) {
      const bookId = callbackData.replace('admin:del_book_id:', '');
      const bookTitle = db.getBooks().find(b => b.id === bookId)?.title || 'المذكرة';
      db.deleteBook(bookId);
      return {
        text: `✅ <b>تم حذف المذكرة [${bookTitle}] نهائياً بنجاح!</b>`,
        inline_keyboard: [[{ text: '🔙 العودة لإدارة الكتب', callback_data: 'admin:manage_books' }]],
      };
    }

    return {
      text: `عفواً، لم يتم فهم الإجراء الإداري المحدد.`,
      inline_keyboard: this.getAdminMenuKeyboard(),
    };
  }

  private handleAdminStepInput(chatId: string | number, text: string, state: { step: string; data?: any }): ProcessResult {
    const trimmed = text.trim();

    // --- Add Category Flow ---
    if (state.step === 'add_cat_name') {
      state.data.name = trimmed;
      state.step = 'add_cat_icon';
      this.adminStates.set(chatId, state);
      return {
        text: `🎨 <b>رائع! تم تسجيل اسم القسم: "${trimmed}"</b>\n\nيرجى الآن إرسال الأيقونة التعبيرية (Emoji) المناسبة لهذا القسم:\nمثال: <code>🎓</code> أو <code>🎒</code> أو <code>📚</code> أو <code>🧠</code>`,
        inline_keyboard: [[{ text: '❌ إلغاء والتراجع', callback_data: 'admin:manage_cats' }]],
      };
    }

    if (state.step === 'add_cat_icon') {
      state.data.icon = trimmed;
      state.step = 'add_cat_desc';
      this.adminStates.set(chatId, state);
      return {
        text: `📝 <b>تم حفظ الأيقونة: ${trimmed}</b>\n\nأرسل الآن وصفاً قصيراً للقسم يوضح محتواه للطلاب، أو أرسل كلمة <code>تخطي</code> لتخطي هذه الخطوة:`,
        inline_keyboard: [[{ text: '❌ إلغاء والتراجع', callback_data: 'admin:manage_cats' }]],
      };
    }

    if (state.step === 'add_cat_desc') {
      const desc = (trimmed === 'تخطي' || trimmed === 'تخطي ') ? '' : trimmed;
      const { name, icon } = state.data;
      db.addCategory(name, desc, icon);
      this.adminStates.set(chatId, { step: 'none' });
      return {
        text: `🎉 <b>ألف مبروك! تم إنشاء القسم الجديد ونشره بنجاح!</b>\n\n📁 الاسم: <b>${name}</b>\n🎨 الأيقونة: <b>${icon || '🎓'}</b>\n📝 الوصف: <i>${desc || 'لا يوجد وصف مضاف.'}</i>\n\nسيظهر هذا القسم تلقائياً لجميع طلابك كزر في واجهة البوت فوراً!`,
        inline_keyboard: [
          [{ text: '🔙 الذهاب لرؤية الأقسام المحدثة', callback_data: 'menu:categories' }],
          [{ text: '🔙 العودة لإدارة الأقسام', callback_data: 'admin:manage_cats' }]
        ],
      };
    }

    // --- Add Subject Flow ---
    if (state.step === 'add_sub_name') {
      state.data.name = trimmed;
      state.step = 'add_sub_icon';
      this.adminStates.set(chatId, state);
      return {
        text: `🎨 <b>تم حفظ اسم المادة: "${trimmed}"</b>\n\nيرجى إرسال الأيقونة التعبيرية (Emoji) للمادة:\nمثال: <code>📝</code>، <code>🧪</code>، <code>📐</code>، <code>🌍</code>`,
        inline_keyboard: [[{ text: '❌ إلغاء والتراجع', callback_data: 'admin:manage_subs' }]],
      };
    }

    if (state.step === 'add_sub_icon') {
      state.data.icon = trimmed;
      state.step = 'add_sub_desc';
      this.adminStates.set(chatId, state);
      return {
        text: `📝 <b>تم حفظ الأيقونة للمادة: ${trimmed}</b>\n\nأرسل الآن وصفاً مبسطاً للمادة، أو أرسل كلمة <code>تخطي</code> لتخطيها:`,
        inline_keyboard: [[{ text: '❌ إلغاء والتراجع', callback_data: 'admin:manage_subs' }]],
      };
    }

    if (state.step === 'add_sub_desc') {
      const desc = (trimmed === 'تخطي' || trimmed === 'تخطي ') ? '' : trimmed;
      const { categoryId, name, icon } = state.data;
      db.addSubject(categoryId, name, desc, icon);
      this.adminStates.set(chatId, { step: 'none' });
      return {
        text: `🎉 <b>تم إنشاء المادة الدراسية بنجاح ونشرها للطلاب!</b>\n\n📖 المادة: <b>${name}</b>\n🎨 الأيقونة: <b>${icon || '📖'}</b>\n📝 الوصف: <i>${desc || 'لا يوجد وصف مضاف.'}</i>`,
        inline_keyboard: [
          [{ text: '🔙 الذهاب للقسم لرؤية المادة', callback_data: `cat:${categoryId}` }],
          [{ text: '🔙 العودة لإدارة المواد', callback_data: 'admin:manage_subs' }]
        ],
      };
    }

    // --- Add Book/Note Flow ---
    if (state.step === 'add_book_title') {
      state.data.title = trimmed;
      state.step = 'add_book_teacher';
      this.adminStates.set(chatId, state);
      return {
        text: `👨‍🏫 <b>تم تسجيل العنوان: "${trimmed}"</b>\n\nأرسل الآن اسم المدرس أو الأستاذ صاحب المذكرة (مثال: <code>مستر محمد صلاح</code>)، أو أرسل كلمة <code>تخطي</code> إذا لم تكن خاصة بمدرس معين:`,
        inline_keyboard: [[{ text: '❌ إلغاء والتراجع', callback_data: 'admin:manage_books' }]],
      };
    }

    if (state.step === 'add_book_teacher') {
      const teacherName = (trimmed === 'تخطي' || trimmed === 'تخطي ') ? '' : trimmed;
      state.data.teacherName = teacherName;
      state.step = 'add_book_url';
      this.adminStates.set(chatId, state);
      return {
        text: `🔗 <b>${teacherName ? `تم تسجيل اسم المدرس: "${teacherName}"` : 'تم التخطي'}</b>\n\nيرجى الآن إرسال رابط تحميل ملف الـ PDF المباشر:\nمثال: <code>https://example.com/file.pdf</code>`,
        inline_keyboard: [[{ text: '❌ إلغاء والتراجع', callback_data: 'admin:manage_books' }]],
      };
    }

    if (state.step === 'add_book_url') {
      if (!trimmed.startsWith('http')) {
        return {
          text: `❌ <b>رابط غير صالح!</b> يرجى إرسال رابط صحيح يبدأ بـ http:// أو https://:`,
          inline_keyboard: [[{ text: '❌ إلغاء والتراجع', callback_data: 'admin:manage_books' }]],
        };
      }
      state.data.fileUrl = trimmed;
      state.step = 'add_book_size';
      this.adminStates.set(chatId, state);
      return {
        text: `💾 <b>تم حفظ الرابط بنجاح!</b>\n\nيرجى إرسال حجم الملف التقريبي (مثال: <code>15 MB</code>) أو اكتب <code>تخطي</code> لوضع الافتراضي 'PDF':`,
        inline_keyboard: [[{ text: '❌ إلغاء والتراجع', callback_data: 'admin:manage_books' }]],
      };
    }

    if (state.step === 'add_book_size') {
      state.data.fileSize = (trimmed === 'تخطي' || trimmed === 'تخطي ') ? 'PDF' : trimmed;
      state.step = 'add_book_pages';
      this.adminStates.set(chatId, state);
      return {
        text: `📄 <b>تم تسجيل حجم الملف: ${state.data.fileSize}</b>\n\nأرسل الآن عدد صفحات المذكرة كـ رقم (مثال: <code>80</code>) أو أرسل <code>تخطي</code> لتخطي عدد الصفحات:`,
        inline_keyboard: [[{ text: '❌ إلغاء والتراجع', callback_data: 'admin:manage_books' }]],
      };
    }

    if (state.step === 'add_book_pages') {
      const pagesCount = (trimmed === 'تخطي' || trimmed === 'تخطي ') ? undefined : Number(trimmed);
      state.data.pagesCount = isNaN(Number(pagesCount)) ? undefined : Number(pagesCount);
      state.step = 'add_book_desc';
      this.adminStates.set(chatId, state);
      return {
        text: `📝 <b>جميل!</b> أرسل الآن وصفاً ومحتويات الكتاب ليظهر للطلاب عند تصفحه، أو أرسل <code>تخطي</code> لتخطي كتابة الوصف:`,
        inline_keyboard: [[{ text: '❌ إلغاء والتراجع', callback_data: 'admin:manage_books' }]],
      };
    }

    if (state.step === 'add_book_desc') {
      const description = (trimmed === 'تخطي' || trimmed === 'تخطي ') ? '' : trimmed;
      const { categoryId, subjectId, teacherName, title, fileUrl, fileSize, pagesCount } = state.data;
      db.addBook({
        categoryId,
        subjectId,
        teacherName: teacherName || undefined,
        title,
        fileUrl,
        fileSize,
        pagesCount,
        description,
      });
      this.adminStates.set(chatId, { step: 'none' });
      return {
        text: `🎉 <b>ألف مبروك! تم رفع ونشر المذكرة الجديدة بنجاح فوري!</b>\n\n📄 العنوان: <b>${title}</b>\n${teacherName ? `👨‍🏫 المدرس: <b>${teacherName}</b>\n` : ''}🔗 الرابط: <code>${fileUrl}</code>\n💾 الحجم: <b>${fileSize}</b>\n📖 الصفحات: <b>${pagesCount || 'غير محدد'} صفحة</b>\n📝 الوصف: <i>${description || 'لا يوجد وصف.'}</i>`,
        inline_keyboard: [
          [{ text: '🔙 الذهاب للمادة لرؤية المذكرة', callback_data: `sub:${subjectId}` }],
          [{ text: '🔙 العودة لإدارة الكتب', callback_data: 'admin:manage_books' }]
        ],
      };
    }

    return {
      text: `عفواً، تعذر معالجة البيانات المدخلة في هذه المرحلة.`,
      inline_keyboard: this.getAdminMenuKeyboard(),
    };
  }

  /**
   * Core dispatcher: handles any text or callback action for a user.
   * Used for both real Telegram webhook updates and browser-based Telegram simulator!
   */
  public handleAction(
    user: TelegramUser,
    actionType: 'text' | 'callback',
    content: string
  ): ProcessResult {
    const chatId = user.id;

    // 0. Intercept Admin Commands & States
    if (actionType === 'text') {
      const trimmed = content.trim();

      // Enter Admin mode via secret code
      if (trimmed === 'elgohry1') {
        this.adminChatIds.add(chatId);
        this.adminStates.set(chatId, { step: 'none' });
        return {
          text: `🔑 <b>مرحباً بك في لوحة تحكم المعلم السرية!</b> 🛠️\n\nلقد تم التعرف عليك كمسؤول للنظام بنجاح.\nيمكنك استخدام الأزرار التفاعلية الشفافة أدناه لإضافة أو حذف الأقسام والمواد والكتب بكل سهولة ومن مكان واحد في الشات:`,
          inline_keyboard: this.getAdminMenuKeyboard(),
        };
      }

      // If registered as admin and in an active data input step
      if (this.adminChatIds.has(chatId)) {
        const state = this.adminStates.get(chatId);
        if (state && state.step !== 'none') {
          return this.handleAdminStepInput(chatId, trimmed, state);
        }
      }
    }

    // Intercept Admin Callback Clicks
    if (actionType === 'callback' && content.startsWith('admin:')) {
      return this.handleAdminCallback(chatId, content);
    }

    const student = db.getStudentByChatId(chatId);
    const isSubscribedAndActive = student && student.status === 'active';

    // 1. Direct Start with code: e.g. "/start CODE-123"
    if (actionType === 'text' && content.startsWith('/start')) {
      const parts = content.trim().split(/\s+/);
      const codeParam = parts[1];

      if (codeParam) {
        const activation = db.activateStudentWithCode(chatId, codeParam, {
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
        });

        if (activation.success && activation.student) {
          const remainingDays = Math.max(
            0,
            Math.ceil((new Date(activation.student.expiresAt).getTime() - Date.now()) / (24 * 3600 * 1000))
          );
          return {
            text: `🎉 <b>مرحباً بك يا ${user.first_name || 'بطل'}!</b>\n\n✅ تم تفعيل اشتراكك بنجاح باستخدام الكود: <code>${codeParam}</code>\n⏳ مدة الصلاحية: <b>${remainingDays} يوم</b>\n📅 ينتهي في: <b>${new Date(activation.student.expiresAt).toLocaleDateString('ar-EG')}</b>\n\nتفضل باختيار المرحلة الدراسية أو تصفح المواد والكتب عبر الأزرار أدناه 👇`,
            inline_keyboard: this.getMainMenuKeyboard(),
          };
        } else {
          return {
            text: `❌ <b>فشل تفعيل الكود:</b>\n${activation.message}\n\nيرجى التأكد من كتابة الكود بشكل صحيح أو مراجعة إدارة المنصة.`,
            inline_keyboard: [
              [{ text: '📞 تواصل مع الدعم / المعلم', callback_data: 'menu:contact' }],
              [{ text: '🔄 إعادة المحاولة', callback_data: 'menu:retry_code' }],
            ],
          };
        }
      }

      // Plain /start
      if (isSubscribedAndActive) {
        const remainingDays = Math.max(
          0,
          Math.ceil((new Date(student.expiresAt).getTime() - Date.now()) / (24 * 3600 * 1000))
        );
        return {
          text: `👋 أهلاً بك مجدداً يا <b>${user.first_name || 'عزيزي الطالب'}</b>!\n\n✨ اشتراكك <b>نشط</b> (متبقي ${remainingDays} يوم).\nاختر من القائمة للوصول إلى كتبك ومذكراتك الدراسية:`,
          inline_keyboard: this.getMainMenuKeyboard(),
        };
      } else {
        // Not active or expired
        const reason = student?.status === 'expired' ? '⚠️ لقد انتهت فترة اشتراكك السابقة.' : '🔒 لم يتم تفعيل حسابك بعد.';
        return {
          text: `${reason}\n\n📚 <b>بوت المذكرات والكتب الدراسية</b>\nللدخول وتنزيل الملفات بصيغة PDF، يرجى إرسال <b>كود التفعيل</b> المخصص لك.\n\n👇 <i>أرسل كود التفعيل في رسالة الآن:</i>`,
          inline_keyboard: [
            [{ text: '📞 طلب كود اشتراك جديد', callback_data: 'menu:contact' }],
          ],
        };
      }
    }

    // 2. Handle Text (Could be an Activation Code or Book Search)
    if (actionType === 'text') {
      const trimmed = content.trim();

      // If text looks like a code or user is not active, try activating
      if (!isSubscribedAndActive || trimmed.startsWith('STU-') || trimmed.length >= 6) {
        const activation = db.activateStudentWithCode(chatId, trimmed, {
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
        });

        if (activation.success && activation.student) {
          const remainingDays = Math.max(
            0,
            Math.ceil((new Date(activation.student.expiresAt).getTime() - Date.now()) / (24 * 3600 * 1000))
          );
          return {
            text: `🎉 <b>ألف مبروك! تم تفعيل اشتراكك بنجاح!</b>\n\n👤 الطالب: <b>${user.first_name || user.username || 'طالب'}</b>\n⏳ الصلاحية: <b>${remainingDays} يوم</b>\n📅 تاريخ الانتهاء: <b>${new Date(activation.student.expiresAt).toLocaleDateString('ar-EG')}</b>\n\nتفضل باختيار ما ترغب في تصفحه من الأزرار الشفافة أدناه:`,
            inline_keyboard: this.getMainMenuKeyboard(),
          };
        } else if (!isSubscribedAndActive) {
          return {
            text: `❌ <b>كود غير صالح:</b>\n${activation.message}\n\nتأكد من كتابة الكود بشكل دقيق كما أرسله لك المعلم.`,
            inline_keyboard: [
              [{ text: '📞 تواصل للحصول على كود', callback_data: 'menu:contact' }],
            ],
          };
        }
      }

      // If active user is searching for books
      if (isSubscribedAndActive) {
        const foundBooks = db.getBooks(undefined, undefined, trimmed);
        if (foundBooks.length === 0) {
          return {
            text: `🔍 نتائج البحث عن: "<b>${trimmed}</b>"\n\nلم يتم العثور على مذكرات أو كتب مطابقة لهذا البحث. يمكنك تصفح الأقسام أو تجربة كلمة أخرى.`,
            inline_keyboard: [
              [{ text: '📂 تصفح المراحل الدراسية', callback_data: 'menu:categories' }],
              [{ text: '🏠 القائمة الرئيسية', callback_data: 'menu:main' }],
            ],
          };
        }

        const keyboard: TelegramInlineButton[][] = foundBooks.slice(0, 8).map(b => [
          { text: `📖 ${b.title} (${b.fileSize || 'PDF'})`, callback_data: `book:${b.id}` },
        ]);
        keyboard.push([{ text: '🏠 القائمة الرئيسية', callback_data: 'menu:main' }]);

        return {
          text: `🔍 تم العثور على <b>${foundBooks.length}</b> مذكرات/كتب مطابقة لـ "<b>${trimmed}</b>":\nاضغط على أي زر أدناه لعرض التفاصيل ورابط التحميل المباشر:`,
          inline_keyboard: keyboard,
        };
      }
    }

    // 3. Handle Callbacks (Inline Button Clicks)
    const callbackData = content;

    // Custom buttons text replies handler
    if (callbackData.startsWith('custom_btn:')) {
      const btnId = callbackData.replace('custom_btn:', '');
      const settings = db.getSettings();
      const customBtn = settings.customMenuButtons?.find(b => b.id === btnId);
      if (customBtn) {
        return {
          text: customBtn.value,
          inline_keyboard: [
            [{ text: '🔙 العودة للقائمة الرئيسية', callback_data: 'menu:main' }]
          ],
        };
      }
    }

    // Contact menu
    if (callbackData === 'menu:contact') {
      const settings = db.getSettings();
      return {
        text: `📞 <b>الدعم الفني والاشتراكات:</b>\n\n${settings.contactMessage || 'تواصل مع إدارة المنصة للحصول على كود الاشتراك.'}`,
        inline_keyboard: [
          [{ text: '🔙 رجوع', callback_data: isSubscribedAndActive ? 'menu:main' : 'menu:start' }],
        ],
      };
    }

    if (callbackData === 'menu:start') {
      return this.handleAction(user, 'text', '/start');
    }

    // Check subscription access for deeper actions
    if (!isSubscribedAndActive) {
      return {
        text: `🔒 <b>عفواً، لا يمكنك الوصول للمحتوى بدون اشتراك ساري!</b>\nيرجى إرسال كود التفعيل في الشات للتسجيل أو التجديد.`,
        inline_keyboard: [
          [{ text: '📞 طلب كود تفعيل', callback_data: 'menu:contact' }],
        ],
      };
    }

    // Main Menu
    if (callbackData === 'menu:main') {
      return {
        text: `🏠 <b>القائمة الرئيسية:</b>\nاختر القسم المطلوب للتصفح أو متابعة حالة اشتراكك:`,
        inline_keyboard: this.getMainMenuKeyboard(),
      };
    }

    // Subscription status
    if (callbackData === 'menu:status') {
      const remainingDays = student ? Math.max(0, Math.ceil((new Date(student.expiresAt).getTime() - Date.now()) / (24 * 3600 * 1000))) : 0;
      return {
        text: `👤 <b>بيانات حسابك واشتراكك:</b>\n\n` +
          `• الاسم: <b>${student?.firstName || user.first_name || 'طالب'}</b>\n` +
          `• معرف الحساب: <code>${chatId}</code>\n` +
          `• الكود المستخدم: <code>${student?.codeUsed || 'غير متوفر'}</code>\n` +
          `• تاريخ التفعيل: <b>${student ? new Date(student.startDate).toLocaleDateString('ar-EG') : '-'}</b>\n` +
          `• تاريخ الانتهاء: <b>${student ? new Date(student.expiresAt).toLocaleDateString('ar-EG') : '-'}</b>\n` +
          `• الأيام المتبقية: <b>${remainingDays} يوم</b> ⏳\n` +
          `• إجمالي التحميلات: <b>${student?.downloadsCount || 0}</b> ملف`,
        inline_keyboard: [
          [{ text: '🔄 تجديد أو تمديد الاشتراك', callback_data: 'menu:contact' }],
          [{ text: '🏠 القائمة الرئيسية', callback_data: 'menu:main' }],
        ],
      };
    }

    // Categories list (المراحل الدراسية)
    if (callbackData === 'menu:categories') {
      const categories = db.getCategories();
      const isAdmin = this.adminChatIds.has(chatId);

      if (categories.length === 0) {
        return {
          text: isAdmin 
            ? `🛠️ <b>[وضع التحكم] لا توجد مراحل دراسية مضافة حالياً.</b>\n\nاضغط على زر الإضافة أدناه لإنشاء أول مرحلة دراسية أو قسم دراسي جديد فوراً:`
            : `📂 لا توجد مراحل دراسية مضافة حالياً. يرجى مراجعة المعلم.`,
          inline_keyboard: isAdmin
            ? [
                [{ text: '➕ إضافة قسم دراسي جديد', callback_data: 'admin:add_cat' }],
                [{ text: '🏠 القائمة الرئيسية', callback_data: 'menu:main' }]
              ]
            : [[{ text: '🏠 القائمة الرئيسية', callback_data: 'menu:main' }]],
        };
      }

      const keyboard: TelegramInlineButton[][] = [];
      if (isAdmin) {
        categories.forEach(cat => {
          keyboard.push([
            { text: `${cat.icon || '🎓'} ${cat.name}`, callback_data: `cat:${cat.id}` }
          ]);
          keyboard.push([
            { text: `❌ حذف قسم: ${cat.name}`, callback_data: `admin:del_cat_id_remain:${cat.id}` }
          ]);
        });
        keyboard.push([{ text: '➕ إضافة قسم دراسي جديد', callback_data: 'admin:add_cat' }]);
      } else {
        categories.forEach(cat => {
          keyboard.push([
            { text: `${cat.icon || '📚'} ${cat.name}`, callback_data: `cat:${cat.id}` },
          ]);
        });
      }
      keyboard.push([{ text: '🏠 القائمة الرئيسية', callback_data: 'menu:main' }]);

      return {
        text: isAdmin
          ? `🛠️ <b>[لوحة تحكم المعلم] تصفح وإدارة الأقسام:</b>\n\nتصفح الأقسام بالضغط عليها، أو اضغط على أزرار الحذف السريع لإزالة أي قسم بالكامل ومواده فوراً:`
          : `📂 <b>المراحل والصفوف الدراسية:</b>\nيرجى اختيار مرحلتك الدراسية لعرض المواد والمذكرات المتاحة لها:`,
        inline_keyboard: keyboard,
      };
    }

    // Subjects under Category
    if (callbackData.startsWith('cat:')) {
      const categoryId = callbackData.replace('cat:', '');
      const category = db.getCategories().find(c => c.id === categoryId);
      const subjects = db.getSubjects(categoryId);
      const isAdmin = this.adminChatIds.has(chatId);

      if (subjects.length === 0) {
        return {
          text: isAdmin
            ? `🛠️ <b>[وضع التحكم] مرحلة: ${category?.name || 'محددة'}</b>\n\nلا توجد مواد دراسية مضافة في هذا القسم حالياً.\nاضغط على الزر أدناه لإضافة أول مادة دراسية فوراً:`
            : `📂 مرحلة: <b>${category?.name || 'محددة'}</b>\n\nلا توجد مواد دراسية مضافة لهذه المرحلة حتى الآن.`,
          inline_keyboard: isAdmin
            ? [
                [{ text: '➕ إضافة مادة دراسية جديدة هنا', callback_data: `admin:add_sub_cat:${categoryId}` }],
                [{ text: '🗑️ حذف هذا القسم بالكامل', callback_data: `admin:del_cat_id_remain:${categoryId}` }],
                [{ text: '🔙 العودة للمراحل', callback_data: 'menu:categories' }],
                [{ text: '🏠 الرئيسية', callback_data: 'menu:main' }]
              ]
            : [
                [{ text: '🔙 العودة للمراحل', callback_data: 'menu:categories' }],
                [{ text: '🏠 القائمة الرئيسية', callback_data: 'menu:main' }],
              ],
        };
      }

      const keyboard: TelegramInlineButton[][] = [];
      if (isAdmin) {
        subjects.forEach(sub => {
          keyboard.push([
            { text: `${sub.icon || '📖'} ${sub.name}`, callback_data: `sub:${sub.id}` }
          ]);
          keyboard.push([
            { text: `❌ حذف مادة: ${sub.name}`, callback_data: `admin:del_sub_id_remain:${sub.id}:${categoryId}` }
          ]);
        });
        keyboard.push([
          { text: '➕ إضافة مادة دراسية جديدة هنا', callback_data: `admin:add_sub_cat:${categoryId}` }
        ]);
        keyboard.push([
          { text: '🗑️ حذف هذا القسم بالكامل', callback_data: `admin:del_cat_id_remain:${categoryId}` }
        ]);
      } else {
        subjects.forEach(sub => {
          keyboard.push([
            { text: `${sub.icon || '📖'} ${sub.name}`, callback_data: `sub:${sub.id}` }
          ]);
        });
      }

      keyboard.push([
        { text: '🔙 رجوع للمراحل', callback_data: 'menu:categories' },
        { text: '🏠 الرئيسية', callback_data: 'menu:main' },
      ]);

      return {
        text: isAdmin
          ? `🛠️ <b>[لوحة تحكم المعلم] مرحلة: ${category?.name}</b>\n\nتصفح المواد بالضغط عليها، أو اضغط على أزرار الحذف السريع لإزالة أي مادة أو القسم بالكامل:`
          : `📚 <b>${category?.name || 'المواد الدراسية'}:</b>\nاختر المادة الدراسية لعرض الكتب والمذكرات المقررة:`,
        inline_keyboard: keyboard,
      };
    }

    // Books under Subject
    if (callbackData.startsWith('sub:')) {
      const subjectId = callbackData.replace('sub:', '');
      const subject = db.getSubjects().find(s => s.id === subjectId);
      const category = db.getCategories().find(c => c.id === subject?.categoryId);
      const books = db.getBooks(undefined, subjectId);
      const isAdmin = this.adminChatIds.has(chatId);

      if (books.length === 0) {
        return {
          text: isAdmin
            ? `🛠️ <b>[وضع التحكم] مادة: ${subject?.name || 'محددة'}</b>\n\nلا توجد كتب أو مذكرات مرفوعة لهذه المادة حالياً.\nاضغط على الزر أدناه لإضافة ورفع أول كتاب فوراً:`
            : `📖 مادة: <b>${subject?.name || 'محددة'}</b>\n\nلا توجد كتب أو مذكرات مرفوعة لهذه المادة حالياً. يتم العمل على إضافتها قريباً.`,
          inline_keyboard: isAdmin
            ? [
                [{ text: '➕ رفع ونشر كتاب/مذكرة هنا', callback_data: `admin:add_book_sub:${subject?.categoryId}:${subjectId}` }],
                [{ text: '🗑️ حذف هذه المادة بالكامل', callback_data: `admin:del_sub_id_remain:${subjectId}:${subject?.categoryId}` }],
                [{ text: '🔙 رجوع للمواد', callback_data: `cat:${subject?.categoryId || 'none'}` }],
                [{ text: '🏠 القائمة الرئيسية', callback_data: 'menu:main' }]
              ]
            : [
                [{ text: '🔙 رجوع للمواد', callback_data: `cat:${subject?.categoryId || 'none'}` }],
                [{ text: '🏠 القائمة الرئيسية', callback_data: 'menu:main' }],
              ],
        };
      }

      // Check if there are teacher-specific books in this subject
      const teachersMap = new Map<string, number>();
      books.forEach(b => {
        if (b.teacherName && b.teacherName.trim()) {
          const t = b.teacherName.trim();
          teachersMap.set(t, (teachersMap.get(t) || 0) + 1);
        }
      });

      const teachersList = Array.from(teachersMap.keys());
      // If teachers exist and we are in "كتب المدرسين" or have distinct teachers
      if (teachersList.length > 0) {
        const keyboard: TelegramInlineButton[][] = [];
        teachersList.forEach(teacher => {
          const count = teachersMap.get(teacher);
          keyboard.push([
            { text: `👨‍🏫 ${teacher} (${count} ${count === 1 ? 'مذكرة' : 'مذكرات'})`, callback_data: `sub_teacher:${subjectId}:${encodeURIComponent(teacher)}` }
          ]);
        });

        keyboard.push([
          { text: `📚 عرض جميع مذكرات المادة (${books.length})`, callback_data: `sub_all:${subjectId}` }
        ]);

        if (isAdmin) {
          keyboard.push([
            { text: '➕ رفع ونشر مذكرة/كتاب لمدرس هنا', callback_data: `admin:add_book_sub:${subject?.categoryId}:${subjectId}` }
          ]);
          keyboard.push([
            { text: '🗑️ حذف هذه المادة بالكامل', callback_data: `admin:del_sub_id_remain:${subjectId}:${subject?.categoryId}` }
          ]);
        }

        keyboard.push([
          { text: '🔙 رجوع للمواد', callback_data: `cat:${subject?.categoryId || 'none'}` },
          { text: '🏠 الرئيسية', callback_data: 'menu:main' },
        ]);

        return {
          text: `👨‍🏫 <b>مادة ${subject?.name}:</b>\nالقسم: <b>${category?.name || ''}</b>\n\nاختر المدرس لعرض مذكراته وملازمه الخاصة:` +
            (isAdmin ? `\n\n🛠️ <i>[وضع التحكم] يمكنك رفع مذكرات جديدة للمدرسين بالضغط على الزر أدناه:</i>` : ''),
          inline_keyboard: keyboard,
        };
      }

      const keyboard: TelegramInlineButton[][] = [];
      if (isAdmin) {
        books.forEach(book => {
          keyboard.push([
            { text: `📄 ${book.title}`, callback_data: `book:${book.id}` }
          ]);
          keyboard.push([
            { text: `❌ حذف كتاب: ${book.title}`, callback_data: `admin:del_book_id_remain:${book.id}:${subjectId}` }
          ]);
        });
        keyboard.push([
          { text: '➕ رفع ونشر كتاب/مذكرة هنا', callback_data: `admin:add_book_sub:${subject?.categoryId}:${subjectId}` }
        ]);
        keyboard.push([
          { text: '🗑️ حذف هذه المادة بالكامل', callback_data: `admin:del_sub_id_remain:${subjectId}:${subject?.categoryId}` }
        ]);
      } else {
        books.forEach(book => {
          keyboard.push([
            { text: `📄 ${book.title}`, callback_data: `book:${book.id}` }
          ]);
        });
      }

      keyboard.push([
        { text: '🔙 رجوع للمواد', callback_data: `cat:${subject?.categoryId || 'none'}` },
        { text: '🏠 الرئيسية', callback_data: 'menu:main' },
      ]);

      return {
        text: isAdmin
          ? `🛠️ <b>[لوحة تحكم المعلم] مادة: ${subject?.name}</b> (${category?.name || ''})\nعدد الكتب: <b>${books.length}</b>\n\nاختر المذكرة لمشاهدتها، أو استخدم أزرار الحذف والرفع السريعة:`
          : `📖 مادة: <b>${subject?.name}</b> (${category?.name || ''})\nعدد الملفات: <b>${books.length}</b>\n\nاختر المذكرة أو الكتاب لتحميله:`,
        inline_keyboard: keyboard,
      };
    }

    // Books under specific Teacher
    if (callbackData.startsWith('sub_teacher:')) {
      const rest = callbackData.replace('sub_teacher:', '');
      const firstColon = rest.indexOf(':');
      const subjectId = firstColon !== -1 ? rest.substring(0, firstColon) : rest;
      const rawTeacher = firstColon !== -1 ? rest.substring(firstColon + 1) : '';
      const teacherName = decodeURIComponent(rawTeacher);

      const subject = db.getSubjects().find(s => s.id === subjectId);
      const category = db.getCategories().find(c => c.id === subject?.categoryId);
      const allBooks = db.getBooks(undefined, subjectId);
      const books = allBooks.filter(b => b.teacherName === teacherName);
      const isAdmin = this.adminChatIds.has(chatId);

      const keyboard: TelegramInlineButton[][] = [];
      if (isAdmin) {
        books.forEach(book => {
          keyboard.push([
            { text: `📄 ${book.title}`, callback_data: `book:${book.id}` }
          ]);
          keyboard.push([
            { text: `❌ حذف: ${book.title}`, callback_data: `admin:del_book_id_remain:${book.id}:${subjectId}` }
          ]);
        });
        keyboard.push([
          { text: `➕ رفع مذكرة جديدة لـ ${teacherName}`, callback_data: `admin:add_book_sub:${subject?.categoryId}:${subjectId}` }
        ]);
      } else {
        books.forEach(book => {
          keyboard.push([
            { text: `📄 ${book.title}`, callback_data: `book:${book.id}` }
          ]);
        });
      }

      keyboard.push([
        { text: `🔙 رجوع لقائمة مدرسي ${subject?.name || ''}`, callback_data: `sub:${subjectId}` },
        { text: '🏠 الرئيسية', callback_data: 'menu:main' },
      ]);

      return {
        text: `👨‍🏫 <b>مذكرات: ${teacherName}</b>\n` +
          `📖 مادة: <b>${subject?.name || ''}</b> (${category?.name || ''})\n` +
          `عدد الملفات المتوفرة: <b>${books.length}</b> ملف\n\n` +
          `اختر المذكرة التي تريد تحميلها:`,
        inline_keyboard: keyboard,
      };
    }

    // View all books under subject
    if (callbackData.startsWith('sub_all:')) {
      const subjectId = callbackData.replace('sub_all:', '');
      const subject = db.getSubjects().find(s => s.id === subjectId);
      const category = db.getCategories().find(c => c.id === subject?.categoryId);
      const books = db.getBooks(undefined, subjectId);
      const isAdmin = this.adminChatIds.has(chatId);

      const keyboard: TelegramInlineButton[][] = [];
      if (isAdmin) {
        books.forEach(book => {
          keyboard.push([
            { text: `📄 ${book.teacherName ? `[${book.teacherName}] ` : ''}${book.title}`, callback_data: `book:${book.id}` }
          ]);
          keyboard.push([
            { text: `❌ حذف: ${book.title}`, callback_data: `admin:del_book_id_remain:${book.id}:${subjectId}` }
          ]);
        });
      } else {
        books.forEach(book => {
          keyboard.push([
            { text: `📄 ${book.teacherName ? `[${book.teacherName}] ` : ''}${book.title}`, callback_data: `book:${book.id}` }
          ]);
        });
      }

      keyboard.push([
        { text: `🔙 رجوع لقائمة المدرسين`, callback_data: `sub:${subjectId}` },
        { text: '🏠 الرئيسية', callback_data: 'menu:main' },
      ]);

      return {
        text: `📚 <b>جميع مذكرات وكتب: ${subject?.name}</b> (${category?.name || ''})\n` +
          `إجمالي الملفات: <b>${books.length}</b>\n\n` +
          `اختر المذكرة المطلوبة:`,
        inline_keyboard: keyboard,
      };
    }

    // Single Book details & direct download
    if (callbackData.startsWith('book:')) {
      const bookId = callbackData.replace('book:', '');
      const book = db.getBookById(bookId);
      const isAdmin = this.adminChatIds.has(chatId);

      if (!book) {
        return {
          text: `❌ عذراً، لم نتمكن من العثور على هذا الكتاب، ربما تم حذفه أو نقله.`,
          inline_keyboard: [[{ text: '🏠 القائمة الرئيسية', callback_data: 'menu:main' }]],
        };
      }

      // Track download stats
      db.incrementDownload(bookId);
      if (student) {
        student.downloadsCount = (student.downloadsCount || 0) + 1;
      }

      const subject = db.getSubjects().find(s => s.id === book.subjectId);

      const keyboard: TelegramInlineButton[][] = [
        // Direct download URL button
        [
          { text: '📥 تنزيل الكتاب مباشرة (PDF)', url: book.fileUrl }
        ],
      ];

      if (isAdmin) {
        keyboard.push([
          { text: '🗑️ حذف هذه المذكرة نهائياً', callback_data: `admin:del_book_id_remain:${bookId}:${book.subjectId}` }
        ]);
      }

      keyboard.push([
        { text: '🔙 رجوع لقائمة المادة', callback_data: `sub:${book.subjectId}` },
        { text: '🏠 القائمة الرئيسية', callback_data: 'menu:main' },
      ]);

      return {
        text: `📕 <b>${book.title}</b>\n\n` +
          (book.teacherName ? `👨‍🏫 المعلم / المدرس: <b>${book.teacherName}</b>\n` : '') +
          `📌 المادة: <b>${subject?.name || 'عامة'}</b>\n` +
          `📄 عدد الصفحات: <b>${book.pagesCount || 'غير محدد'} صفحة</b>\n` +
          `💾 حجم الملف: <b>${book.fileSize || 'PDF'}</b>\n` +
          `📥 عدد مرات التحميل: <b>${book.downloadCount}</b>\n\n` +
          `📝 <b>الوصف والنبذة:</b>\n${book.description || 'مذكرة دراسية مخصصة للطلاب شاملة الشرح والأسئلة.'}\n\n` +
          `اضغط على الزر أدناه لبدء التحميل المباشر فوراً 👇`,
        inline_keyboard: keyboard,
      };
    }

    // Default fallback
    return {
      text: `مرحباً بك! يمكنك استخدام الأزرار أدناه للتنقل داخل البوت:`,
      inline_keyboard: this.getMainMenuKeyboard(),
    };
  }

  private getMainMenuKeyboard(): TelegramInlineButton[][] {
    const kb: TelegramInlineButton[][] = [
      [
        { text: '📚 تصفح المراحل والمواد', callback_data: 'menu:categories' },
      ],
      [
        { text: '👤 حسابي واشتراكي', callback_data: 'menu:status' },
        { text: '📞 الدعم والمعلم', callback_data: 'menu:contact' },
      ],
    ];

    const settings = db.getSettings();
    if (settings.customMenuButtons && settings.customMenuButtons.length > 0) {
      const sorted = [...settings.customMenuButtons].sort((a, b) => (a.order || 0) - (b.order || 0));
      sorted.forEach(btn => {
        const icon = btn.icon ? btn.icon + ' ' : '';
        if (btn.type === 'link') {
          let url = btn.value ? btn.value.trim() : '';
          // Ensure valid HTTP/HTTPS url for Telegram API compatibility
          if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('tg://')) {
            kb.push([{ text: `${icon}${btn.label}`, url }]);
          } else if (url.startsWith('t.me/') || url.startsWith('www.')) {
            kb.push([{ text: `${icon}${btn.label}`, url: `https://${url}` }]);
          } else {
            // Fallback to text callback if link is not a valid URL
            kb.push([{ text: `${icon}${btn.label}`, callback_data: `custom_btn:${btn.id}` }]);
          }
        } else {
          kb.push([{ text: `${icon}${btn.label}`, callback_data: `custom_btn:${btn.id}` }]);
        }
      });
    }

    return kb;
  }

  /**
   * Handle real webhook payload from Telegram server
   */
  public async handleWebhookUpdate(update: any) {
    if (update.message) {
      const msg = update.message;
      const text = msg.text || '';
      const from = msg.from || {};
      const chatId = msg.chat?.id;

      if (!chatId) return;

      const result = this.handleAction(
        {
          id: chatId,
          username: from.username,
          first_name: from.first_name,
          last_name: from.last_name,
        },
        'text',
        text
      );

      await this.sendTelegramMessage(chatId, result.text, result.inline_keyboard ? { inline_keyboard: result.inline_keyboard } : undefined);
    } else if (update.callback_query) {
      const cb = update.callback_query;
      const data = cb.data || '';
      const from = cb.from || {};
      const chatId = cb.message?.chat?.id;
      const messageId = cb.message?.message_id;

      if (!chatId) return;

      await this.answerCallbackQuery(cb.id);

      const result = this.handleAction(
        {
          id: chatId,
          username: from.username,
          first_name: from.first_name,
          last_name: from.last_name,
        },
        'callback',
        data
      );

      if (messageId) {
        await this.editTelegramMessage(chatId, messageId, result.text, result.inline_keyboard ? { inline_keyboard: result.inline_keyboard } : undefined);
      } else {
        await this.sendTelegramMessage(chatId, result.text, result.inline_keyboard ? { inline_keyboard: result.inline_keyboard } : undefined);
      }
    }
  }

  /**
   * Simulator method for Web UI testing without needing external Telegram Webhook
   */
  public simulateInteraction(
    chatId: string | number,
    type: 'text' | 'callback',
    content: string,
    userInfo: { username?: string; firstName?: string }
  ): TelegramSimulationResponse {
    const result = this.handleAction(
      {
        id: chatId,
        username: userInfo.username || 'student_demo',
        first_name: userInfo.firstName || 'طالب تجريبي',
      },
      type,
      content
    );

    const student = db.getStudentByChatId(chatId);
    const isSubscribed = Boolean(student && student.status === 'active');
    const remainingDays = student && isSubscribed
      ? Math.max(0, Math.ceil((new Date(student.expiresAt).getTime() - Date.now()) / (24 * 3600 * 1000)))
      : 0;

    return {
      text: result.text,
      replyMarkup: result.inline_keyboard ? { inline_keyboard: result.inline_keyboard } : undefined,
      studentStatus: {
        isSubscribed,
        remainingDays,
        expiresAt: student?.expiresAt,
        studentName: student?.firstName || userInfo.firstName,
      },
    };
  }
}

// Prevent multiple instances in development due to module reloading
const globalForBot = global as unknown as { telegramBot: TelegramBotService };
export const telegramBot = globalForBot.telegramBot || new TelegramBotService();
if (process.env.NODE_ENV !== 'production') globalForBot.telegramBot = telegramBot;
