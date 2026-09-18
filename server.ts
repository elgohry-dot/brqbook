import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.js';
import { telegramBot } from './server/telegramBot.js';

// Prevent process crashes from unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Statistics
  app.get('/api/stats', (req: Request, res: Response) => {
    res.json(db.getStats());
  });

  // Categories (المراحل الدراسية)
  app.get('/api/categories', (req: Request, res: Response) => {
    res.json(db.getCategories());
  });

  app.post('/api/categories', (req: Request, res: Response) => {
    const { name, description, icon } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'اسم المرحلة/القسم مطلوب' });
    }
    const cat = db.addCategory(name, description, icon);
    res.status(201).json(cat);
  });

  app.put('/api/categories/:id', (req: Request, res: Response) => {
    const updated = db.updateCategory(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'المرحلة غير موجودة' });
    res.json(updated);
  });

  app.delete('/api/categories/:id', (req: Request, res: Response) => {
    const success = db.deleteCategory(req.params.id);
    res.json({ success });
  });

  // Subjects (المواد الدراسية)
  app.get('/api/subjects', (req: Request, res: Response) => {
    const categoryId = req.query.categoryId as string | undefined;
    res.json(db.getSubjects(categoryId));
  });

  app.post('/api/subjects', (req: Request, res: Response) => {
    const { categoryId, name, description, icon } = req.body;
    if (!categoryId || !name) {
      return res.status(400).json({ error: 'المرحلة واسم المادة مطلوبان' });
    }
    const subject = db.addSubject(categoryId, name, description, icon);
    res.status(201).json(subject);
  });

  app.put('/api/subjects/:id', (req: Request, res: Response) => {
    const updated = db.updateSubject(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'المادة غير موجودة' });
    res.json(updated);
  });

  app.delete('/api/subjects/:id', (req: Request, res: Response) => {
    const success = db.deleteSubject(req.params.id);
    res.json({ success });
  });

  // Books (الكتب والمذكرات PDF)
  app.get('/api/books', (req: Request, res: Response) => {
    const { categoryId, subjectId, query } = req.query as {
      categoryId?: string;
      subjectId?: string;
      query?: string;
    };
    res.json(db.getBooks(categoryId, subjectId, query));
  });

  app.post('/api/books', (req: Request, res: Response) => {
    const { categoryId, subjectId, title, description, fileUrl, fileSize, pagesCount } = req.body;
    if (!categoryId || !subjectId || !title || !fileUrl) {
      return res.status(400).json({ error: 'يرجى ملء جميع الحقول الإلزامية (المرحلة، المادة، العنوان، ورابط الملف)' });
    }
    const newBook = db.addBook({
      categoryId,
      subjectId,
      title,
      description: description || '',
      fileUrl,
      fileSize: fileSize || 'PDF',
      pagesCount: pagesCount ? Number(pagesCount) : undefined,
    });
    res.status(201).json(newBook);
  });

  app.put('/api/books/:id', (req: Request, res: Response) => {
    const updated = db.updateBook(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'الكتاب غير موجود' });
    res.json(updated);
  });

  app.delete('/api/books/:id', (req: Request, res: Response) => {
    const success = db.deleteBook(req.params.id);
    res.json({ success });
  });

  app.post('/api/books/:id/download', (req: Request, res: Response) => {
    db.incrementDownload(req.params.id);
    res.json({ success: true });
  });

  // Activation Codes (أكواد التفعيل)
  app.get('/api/codes', (req: Request, res: Response) => {
    res.json(db.getCodes());
  });

  app.post('/api/codes/generate', (req: Request, res: Response) => {
    const { durationDays, studentName, note, customCode } = req.body;
    const days = Number(durationDays) || 30;
    const code = db.generateCode(days, studentName, note, customCode);
    res.status(201).json(code);
  });

  app.post('/api/codes/bulk', (req: Request, res: Response) => {
    const { count, durationDays, notePrefix } = req.body;
    const qty = Math.min(50, Math.max(1, Number(count) || 5));
    const days = Number(durationDays) || 30;
    const codes = db.generateBulkCodes(qty, days, notePrefix);
    res.status(201).json(codes);
  });

  app.post('/api/codes/:code/revoke', (req: Request, res: Response) => {
    const success = db.revokeCode(req.params.code);
    res.json({ success });
  });

  app.delete('/api/codes/:code', (req: Request, res: Response) => {
    const success = db.deleteCode(req.params.code);
    res.json({ success });
  });

  // Students & Subscriptions (الطلاب والاشتراكات)
  app.get('/api/students', (req: Request, res: Response) => {
    res.json(db.getStudents());
  });

  app.post('/api/students/:chatId/renew', (req: Request, res: Response) => {
    const days = Number(req.body.days) || 30;
    const student = db.renewStudentSubscription(req.params.chatId, days);
    if (!student) return res.status(404).json({ error: 'الطالب غير موجود' });
    res.json(student);
  });

  app.post('/api/students/:chatId/toggle-block', (req: Request, res: Response) => {
    const student = db.toggleStudentBlock(req.params.chatId);
    if (!student) return res.status(404).json({ error: 'الطالب غير موجود' });
    res.json(student);
  });

  // Bot Settings & Webhook
  app.get('/api/bot/settings', (req: Request, res: Response) => {
    res.json(db.getSettings());
  });

  app.post('/api/bot/settings', (req: Request, res: Response) => {
    const updated = db.updateSettings(req.body);
    res.json(updated);
  });

  app.post('/api/bot/test-token', async (req: Request, res: Response) => {
    const token = req.body.token || db.getSettings().botToken;
    const result = await telegramBot.getBotInfo(token);
    res.json(result);
  });

  app.post('/api/bot/set-webhook', async (req: Request, res: Response) => {
    const url = req.body.url;
    const token = req.body.token || db.getSettings().botToken;
    if (!url) return res.status(400).json({ error: 'Webhook URL is required' });
    const result = await telegramBot.setWebhook(url, token);
    res.json(result);
  });

  app.post('/api/bot/delete-webhook', async (req: Request, res: Response) => {
    const token = req.body.token || db.getSettings().botToken;
    const result = await telegramBot.deleteWebhook(token);
    res.json(result);
  });

  app.get('/api/bot/webhook-info', async (req: Request, res: Response) => {
    const token = (req.query.token as string) || db.getSettings().botToken;
    const result = await telegramBot.getWebhookInfo(token);
    res.json(result);
  });

  // Diagnostics and Connection Logs
  app.get('/api/bot/diagnostics', async (req: Request, res: Response) => {
    try {
      const diagnostics = await telegramBot.getDiagnostics();
      res.json(diagnostics);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to fetch diagnostics' });
    }
  });

  app.get('/api/bot/logs', (req: Request, res: Response) => {
    res.json(telegramBot.getConnectionLogs());
  });

  app.post('/api/bot/logs/clear', (req: Request, res: Response) => {
    telegramBot.clearConnectionLogs();
    res.json({ success: true });
  });

  app.post('/api/bot/test-connection', async (req: Request, res: Response) => {
    try {
      const token = req.body.token || db.getSettings().botToken;
      const info = await telegramBot.getBotInfo(token);
      const webhook = await telegramBot.getWebhookInfo(token);
      res.json({
        ok: info.ok,
        botInfo: info.result,
        webhookInfo: webhook.result,
        error: info.description || webhook.description,
      });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message });
    }
  });

  // Telegram incoming webhook endpoint from real Telegram servers
  app.post('/api/bot/webhook', async (req: Request, res: Response) => {
    try {
      await telegramBot.handleWebhookUpdate(req.body);
      res.json({ ok: true });
    } catch (err: any) {
      console.error('Webhook error:', err);
      res.status(500).json({ ok: false, error: err?.message });
    }
  });

  // Telegram Simulator for testing directly in dashboard
  app.post('/api/bot/simulate', (req: Request, res: Response) => {
    const { chatId, type, content, userInfo } = req.body;
    if (!chatId || !content) {
      return res.status(400).json({ error: 'chatId and content are required' });
    }
    const response = telegramBot.simulateInteraction(chatId, type || 'text', content, userInfo || {});
    res.json(response);
  });

  // Vite middleware for development vs static in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Telegram Bot & Portal Server running on http://localhost:${PORT}`);
  });
}

startServer();
