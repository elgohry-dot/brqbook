import {
  Category,
  Subject,
  Book,
  ActivationCode,
  StudentSubscription,
  BotSettings,
  BotStats,
  TelegramSimulationResponse,
  BotDiagnostics,
  BotConnectionLog,
} from './types.js';

export const api = {
  // Stats
  async getStats(): Promise<BotStats> {
    const res = await fetch('/api/stats');
    return res.json();
  },

  // Categories
  async getCategories(): Promise<Category[]> {
    const res = await fetch('/api/categories');
    return res.json();
  },

  async addCategory(data: { name: string; description?: string; icon?: string }): Promise<Category> {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to add category');
    return res.json();
  },

  async updateCategory(id: string, data: Partial<Category>): Promise<Category> {
    const res = await fetch(`/api/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to update category');
    return res.json();
  },

  async deleteCategory(id: string): Promise<boolean> {
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    return res.ok;
  },

  // Subjects
  async getSubjects(categoryId?: string): Promise<Subject[]> {
    const url = categoryId ? `/api/subjects?categoryId=${categoryId}` : '/api/subjects';
    const res = await fetch(url);
    return res.json();
  },

  async addSubject(data: { categoryId: string; name: string; description?: string; icon?: string }): Promise<Subject> {
    const res = await fetch('/api/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to add subject');
    return res.json();
  },

  async updateSubject(id: string, data: Partial<Subject>): Promise<Subject> {
    const res = await fetch(`/api/subjects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to update subject');
    return res.json();
  },

  async deleteSubject(id: string): Promise<boolean> {
    const res = await fetch(`/api/subjects/${id}`, { method: 'DELETE' });
    return res.ok;
  },

  // Books
  async getBooks(categoryId?: string, subjectId?: string, query?: string): Promise<Book[]> {
    const params = new URLSearchParams();
    if (categoryId) params.append('categoryId', categoryId);
    if (subjectId) params.append('subjectId', subjectId);
    if (query) params.append('query', query);

    const res = await fetch(`/api/books?${params.toString()}`);
    return res.json();
  },

  async addBook(data: {
    categoryId: string;
    subjectId: string;
    title: string;
    description: string;
    fileUrl: string;
    fileSize?: string;
    pagesCount?: number;
  }): Promise<Book> {
    const res = await fetch('/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to add book');
    return res.json();
  },

  async updateBook(id: string, data: Partial<Book>): Promise<Book> {
    const res = await fetch(`/api/books/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to update book');
    return res.json();
  },

  async deleteBook(id: string): Promise<boolean> {
    const res = await fetch(`/api/books/${id}`, { method: 'DELETE' });
    return res.ok;
  },

  async incrementDownload(id: string): Promise<void> {
    await fetch(`/api/books/${id}/download`, { method: 'POST' });
  },

  // Codes
  async getCodes(): Promise<ActivationCode[]> {
    const res = await fetch('/api/codes');
    return res.json();
  },

  async generateCode(data: {
    durationDays: number;
    studentName?: string;
    note?: string;
    customCode?: string;
  }): Promise<ActivationCode> {
    const res = await fetch('/api/codes/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to generate code');
    return res.json();
  },

  async generateBulkCodes(data: {
    count: number;
    durationDays: number;
    notePrefix?: string;
  }): Promise<ActivationCode[]> {
    const res = await fetch('/api/codes/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to generate bulk codes');
    return res.json();
  },

  async revokeCode(code: string): Promise<boolean> {
    const res = await fetch(`/api/codes/${code}/revoke`, { method: 'POST' });
    return res.ok;
  },

  async deleteCode(code: string): Promise<boolean> {
    const res = await fetch(`/api/codes/${code}`, { method: 'DELETE' });
    return res.ok;
  },

  // Students
  async getStudents(): Promise<StudentSubscription[]> {
    const res = await fetch('/api/students');
    return res.json();
  },

  async renewStudent(chatId: string | number, days: number): Promise<StudentSubscription> {
    const res = await fetch(`/api/students/${chatId}/renew`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to renew subscription');
    return res.json();
  },

  async toggleBlockStudent(chatId: string | number): Promise<StudentSubscription> {
    const res = await fetch(`/api/students/${chatId}/toggle-block`, { method: 'POST' });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to toggle block');
    return res.json();
  },

  // Bot Settings & Webhook
  async getSettings(): Promise<BotSettings> {
    const res = await fetch('/api/bot/settings');
    return res.json();
  },

  async updateSettings(data: Partial<BotSettings>): Promise<BotSettings> {
    const res = await fetch('/api/bot/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async testBotToken(token?: string): Promise<{ ok: boolean; result?: any; description?: string }> {
    const res = await fetch('/api/bot/test-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    return res.json();
  },

  async setWebhook(url: string, token?: string): Promise<{ ok: boolean; description?: string }> {
    const res = await fetch('/api/bot/set-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, token }),
    });
    return res.json();
  },

  async deleteWebhook(token?: string): Promise<{ ok: boolean; description?: string }> {
    const res = await fetch('/api/bot/delete-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    return res.json();
  },

  async getDiagnostics(): Promise<BotDiagnostics> {
    const res = await fetch('/api/bot/diagnostics');
    if (!res.ok) throw new Error('Failed to fetch diagnostics');
    return res.json();
  },

  async getLogs(): Promise<BotConnectionLog[]> {
    const res = await fetch('/api/bot/logs');
    if (!res.ok) throw new Error('Failed to fetch logs');
    return res.json();
  },

  async clearLogs(): Promise<{ success: boolean }> {
    const res = await fetch('/api/bot/logs/clear', { method: 'POST' });
    return res.json();
  },

  async testConnection(token?: string): Promise<{ ok: boolean; botInfo?: any; webhookInfo?: any; error?: string }> {
    const res = await fetch('/api/bot/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    return res.json();
  },

  // Simulator
  async simulateInteraction(data: {
    chatId: string | number;
    type: 'text' | 'callback';
    content: string;
    userInfo?: { username?: string; firstName?: string };
  }): Promise<TelegramSimulationResponse> {
    const res = await fetch('/api/bot/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Simulation failed');
    return res.json();
  },
};
