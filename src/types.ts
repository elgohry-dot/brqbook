export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  order: number;
}

export interface Subject {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  icon?: string;
}

export interface Book {
  id: string;
  categoryId: string;
  subjectId: string;
  teacherName?: string;
  title: string;
  description: string;
  fileUrl: string;
  fileSize?: string;
  pagesCount?: number;
  downloadCount: number;
  createdAt: string;
}

export interface ActivationCode {
  code: string;
  durationDays: number;
  studentName?: string;
  note?: string;
  isUsed: boolean;
  usedByChatId?: number | string;
  usedByUsername?: string;
  usedAt?: string;
  expiresAt?: string;
  status: 'unused' | 'active' | 'expired' | 'revoked';
  createdAt: string;
}

export interface StudentSubscription {
  chatId: string | number;
  username?: string;
  firstName?: string;
  lastName?: string;
  codeUsed: string;
  startDate: string;
  expiresAt: string;
  status: 'active' | 'expired' | 'blocked';
  lastActive: string;
  downloadsCount: number;
}

export interface CustomMenuButton {
  id: string;
  label: string;
  type: 'text' | 'link';
  value: string;
  icon?: string;
  order: number;
}

export interface BotSettings {
  botToken: string;
  botUsername: string;
  botName: string;
  welcomeMessage: string;
  contactMessage: string;
  isWebhookSet: boolean;
  webhookUrl?: string;
  customMenuButtons?: CustomMenuButton[];
}

export interface BotStats {
  totalBooks: number;
  totalCategories: number;
  totalSubjects: number;
  totalStudents: number;
  activeStudents: number;
  expiredStudents: number;
  totalCodes: number;
  unusedCodes: number;
  totalDownloads: number;
}

export interface TelegramInlineButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface TelegramSimulationResponse {
  text: string;
  replyMarkup?: {
    inline_keyboard: TelegramInlineButton[][];
  };
  studentStatus?: {
    isSubscribed: boolean;
    remainingDays?: number;
    expiresAt?: string;
    studentName?: string;
  };
}

export interface BotConnectionLog {
  id: string;
  timestamp: string;
  type: 'polling' | 'webhook' | 'send_message' | 'telegram_api' | 'conflict_detected' | 'system';
  direction: 'inbound' | 'outbound' | 'internal';
  status: 'success' | 'warning' | 'error' | 'info';
  statusCode?: number;
  endpoint: string;
  summary: string;
  details?: string;
  durationMs?: number;
}

export interface BotDiagnostics {
  botTokenConfigured: boolean;
  botUsername: string;
  botName: string;
  mode: 'polling' | 'webhook' | 'idle';
  isPolling: boolean;
  isWebhookSet: boolean;
  webhookUrl?: string;
  telegramApiStatus: {
    reachable: boolean;
    botInfo?: any;
    error?: string;
    responseTimeMs?: number;
  };
  webhookInfo?: {
    url?: string;
    has_custom_certificate?: boolean;
    pending_update_count?: number;
    last_error_date?: number;
    last_error_message?: string;
    max_connections?: number;
  };
  lastUpdateReceivedAt?: string;
  totalUpdatesProcessed: number;
  recentLogs: BotConnectionLog[];
  diagnosisSummary: {
    state: 'healthy' | 'warning' | 'critical';
    title: string;
    reason: string;
    solution: string;
  };
}
