import fs from 'fs';
import path from 'path';
import { Category, Subject, Book, ActivationCode, StudentSubscription, BotSettings } from '../src/types.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export interface DatabaseSchema {
  categories: Category[];
  subjects: Subject[];
  books: Book[];
  codes: ActivationCode[];
  students: StudentSubscription[];
  settings: BotSettings;
}

const DEFAULT_SETTINGS: BotSettings = {
  botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  botUsername: 'StudentBooksBot',
  botName: 'بوت الكتب والمذكرات الدراسية',
  welcomeMessage: 'مرحباً بك في بوت الكتب والمذكرات الدراسية 📚\nنظام مخصص لتوفير جميع المناهج والمذكرات الدراسية للطلاب بجودة عالية وروابط سريعة.',
  contactMessage: 'للحصول على كود اشتراك أو الاستفسار والدعم الفني، يرجى التواصل مع إدارة المنصة:\n📱 واتساب: 01000000000\n💬 تليجرام: @TeacherAdmin',
  isWebhookSet: false,
  customMenuButtons: [],
};

const INITIAL_DATA: DatabaseSchema = {
  categories: [
    { id: 'cat-teachers', name: 'كتب المدرسين', description: 'مذكرات وملازم كبار مدرسي الثانوية العامة مقسمة حسب المواد والمعلمين', icon: '👨‍🏫', order: 1 },
    { id: 'cat-1', name: 'الصف الأول الثانوي', description: 'المناهج والمذكرات المعتمدة للصف الأول الثانوي', icon: '🎒', order: 2 },
    { id: 'cat-2', name: 'الصف الثاني الثانوي', description: 'شعبة علمي وأدبي للصف الثاني الثانوي', icon: '📖', order: 3 },
    { id: 'cat-3', name: 'الصف الثالث الثانوي (الثانوية العامة)', description: 'مذكرات المراجعات النهائية ونماذج الامتحانات للثانوية العامة', icon: '🎓', order: 4 },
  ],
  subjects: [
    { id: 'sub-teach-ar', categoryId: 'cat-teachers', name: 'اللغة العربية', icon: '📝', description: 'مذكرات كبار مدرسي اللغة العربية' },
    { id: 'sub-teach-eng', categoryId: 'cat-teachers', name: 'اللغة الإنجليزية', icon: '🇬🇧', description: 'مذكرات كبار مدرسي اللغة الإنجليزية' },
    { id: 'sub-teach-fr', categoryId: 'cat-teachers', name: 'اللغة الفرنسية', icon: '🇫🇷', description: 'مذكرات كبار مدرسي الفرنساوي' },
    { id: 'sub-teach-phy', categoryId: 'cat-teachers', name: 'الفيزياء', icon: '⚡', description: 'مذكرات كبار مدرسي الفيزياء' },
    { id: 'sub-teach-chem', categoryId: 'cat-teachers', name: 'الكيمياء', icon: '🧪', description: 'مذكرات كبار مدرسي الكيمياء' },
    { id: 'sub-teach-bio', categoryId: 'cat-teachers', name: 'الأحياء', icon: '🔬', description: 'مذكرات كبار مدرسي الأحياء' },
    { id: 'sub-teach-pure-math', categoryId: 'cat-teachers', name: 'الرياضيات البحتة', icon: '📐', description: 'مذكرات مدرسي التفاضل والتكامل والجبر والهندسة' },
    { id: 'sub-teach-appl-math', categoryId: 'cat-teachers', name: 'الرياضيات التطبيقية', icon: '⚙️', description: 'مذكرات مدرسي الاستاتيكا والديناميكا' },
    { id: 'sub-teach-geo', categoryId: 'cat-teachers', name: 'الجيولوجيا', icon: '🌍', description: 'مذكرات كبار مدرسي الجيولوجيا وعلوم البيئة' },
    { id: 'sub-teach-stat', categoryId: 'cat-teachers', name: 'الإحصاء', icon: '📊', description: 'مذكرات مدرسي مادة الإحصاء' },
    { id: 'sub-teach-geography', categoryId: 'cat-teachers', name: 'الجغرافيا', icon: '🗺️', description: 'مذكرات كبار مدرسي الجغرافيا' },
    { id: 'sub-teach-history', categoryId: 'cat-teachers', name: 'التاريخ', icon: '📜', description: 'مذكرات كبار مدرسي التاريخ' },
    { id: 'sub-teach-azhar', categoryId: 'cat-teachers', name: 'كتب الأزهر', icon: '🕌', description: 'مذكرات كبار مدرسي مواد الأزهر' },
    { id: 'sub-cat1-geo', categoryId: 'cat-1', name: 'الجغرافيا', icon: '🗺️', description: 'مذكرات وتلخيصات مادة الجغرافيا' },
    { id: 'sub-cat1-hist', categoryId: 'cat-1', name: 'التاريخ', icon: '📜', description: 'مذكرات وتلخيصات مادة التاريخ' },
    { id: 'sub-cat1-azhar', categoryId: 'cat-1', name: 'كتب الأزهر', icon: '🕌', description: 'كتب ومذكرات المواد الأزهرية' },
    { id: 'sub-cat2-geo', categoryId: 'cat-2', name: 'الجغرافيا', icon: '🗺️', description: 'مذكرات وتلخيصات مادة الجغرافيا' },
    { id: 'sub-cat2-hist', categoryId: 'cat-2', name: 'التاريخ', icon: '📜', description: 'مذكرات وتلخيصات مادة التاريخ' },
    { id: 'sub-cat2-azhar', categoryId: 'cat-2', name: 'كتب الأزهر', icon: '🕌', description: 'كتب ومذكرات المواد الأزهرية' },
    { id: 'sub-cat3-geo', categoryId: 'cat-3', name: 'الجغرافيا', icon: '🗺️', description: 'مذكرات وتلخيصات مادة الجغرافيا' },
    { id: 'sub-cat3-hist', categoryId: 'cat-3', name: 'التاريخ', icon: '📜', description: 'مذكرات وتلخيصات مادة التاريخ' },
    { id: 'sub-cat3-azhar', categoryId: 'cat-3', name: 'كتب الأزهر', icon: '🕌', description: 'كتب ومذكرات المواد الأزهرية' },
    { id: 'sub-1', categoryId: 'cat-3', name: 'اللغة العربية', icon: '📝', description: 'النحو، البلاغة، القراءة والنصوص' },
    { id: 'sub-2', categoryId: 'cat-3', name: 'الفيزياء', icon: '⚡', description: 'الكهربية والفيزياء الحديثة' },
    { id: 'sub-3', categoryId: 'cat-3', name: 'الكيمياء', icon: '🧪', description: 'الكيمياء العامة والعضوية' },
    { id: 'sub-pure-math', categoryId: 'cat-3', name: 'الرياضيات البحتة', icon: '📐', description: 'التفاضل والتكامل، الجبر العام والهندسة الفراغية' },
    { id: 'sub-applied-math', categoryId: 'cat-3', name: 'الرياضيات التطبيقية', icon: '⚙️', description: 'الاستاتيكا والديناميكا (الميكانيكا)' },
    { id: 'sub-5', categoryId: 'cat-2', name: 'الأحياء', icon: '🔬', description: 'علم الأحياء والوراثة' },
    { id: 'sub-6', categoryId: 'cat-1', name: 'اللغة الإنجليزية', icon: '🌍', description: 'Grammar and Vocabulary' },
    { id: 'sub-7', categoryId: 'cat-3', name: 'الإحصاء', icon: '📊', description: 'مذكرات وتلخيصات مادة الإحصاء وأسئلة الامتحانات' },
    { id: 'sub-ar-cat-1', categoryId: 'cat-1', name: 'اللغة العربية', icon: '📝', description: 'مذكرات وتلخيصات مادة اللغة العربية' },
    { id: 'sub-eng-cat-1', categoryId: 'cat-1', name: 'اللغة الإنجليزية', icon: '🇬🇧', description: 'مذكرات وتلخيصات مادة اللغة الإنجليزية' },
    { id: 'sub-fr-cat-1', categoryId: 'cat-1', name: 'اللغة الفرنسية', icon: '🇫🇷', description: 'مذكرات وتلخيصات مادة اللغة الفرنسية' },
    { id: 'sub-phy-cat-1', categoryId: 'cat-1', name: 'الفيزياء', icon: '⚡', description: 'مذكرات وتلخيصات مادة الفيزياء' },
    { id: 'sub-chem-cat-1', categoryId: 'cat-1', name: 'الكيمياء', icon: '🧪', description: 'مذكرات وتلخيصات مادة الكيمياء' },
    { id: 'sub-bio-cat-1', categoryId: 'cat-1', name: 'الأحياء', icon: '🔬', description: 'مذكرات وتلخيصات مادة الأحياء' },
    { id: 'sub-pure-math-cat-1', categoryId: 'cat-1', name: 'الرياضيات البحتة', icon: '📐', description: 'مذكرات وتلخيصات مادة الرياضيات البحتة' },
    { id: 'sub-appl-math-cat-1', categoryId: 'cat-1', name: 'الرياضيات التطبيقية', icon: '⚙️', description: 'مذكرات وتلخيصات مادة الرياضيات التطبيقية' },
    { id: 'sub-geology-cat-1', categoryId: 'cat-1', name: 'الجيولوجيا', icon: '🌍', description: 'مذكرات وتلخيصات مادة الجيولوجيا وعلوم البيئة' },
    { id: 'sub-stat-cat-1', categoryId: 'cat-1', name: 'الإحصاء', icon: '📊', description: 'مذكرات وتلخيصات مادة الإحصاء' },
    { id: 'sub-ar-cat-2', categoryId: 'cat-2', name: 'اللغة العربية', icon: '📝', description: 'مذكرات وتلخيصات مادة اللغة العربية' },
    { id: 'sub-eng-cat-2', categoryId: 'cat-2', name: 'اللغة الإنجليزية', icon: '🇬🇧', description: 'مذكرات وتلخيصات مادة اللغة الإنجليزية' },
    { id: 'sub-fr-cat-2', categoryId: 'cat-2', name: 'اللغة الفرنسية', icon: '🇫🇷', description: 'مذكرات وتلخيصات مادة اللغة الفرنسية' },
    { id: 'sub-phy-cat-2', categoryId: 'cat-2', name: 'الفيزياء', icon: '⚡', description: 'مذكرات وتلخيصات مادة الفيزياء' },
    { id: 'sub-chem-cat-2', categoryId: 'cat-2', name: 'الكيمياء', icon: '🧪', description: 'مذكرات وتلخيصات مادة الكيمياء' },
    { id: 'sub-bio-cat-2', categoryId: 'cat-2', name: 'الأحياء', icon: '🔬', description: 'مذكرات وتلخيصات مادة الأحياء' },
    { id: 'sub-pure-math-cat-2', categoryId: 'cat-2', name: 'الرياضيات البحتة', icon: '📐', description: 'مذكرات وتلخيصات مادة الرياضيات البحتة' },
    { id: 'sub-appl-math-cat-2', categoryId: 'cat-2', name: 'الرياضيات التطبيقية', icon: '⚙️', description: 'مذكرات وتلخيصات مادة الرياضيات التطبيقية' },
    { id: 'sub-geology-cat-2', categoryId: 'cat-2', name: 'الجيولوجيا', icon: '🌍', description: 'مذكرات وتلخيصات مادة الجيولوجيا وعلوم البيئة' },
    { id: 'sub-stat-cat-2', categoryId: 'cat-2', name: 'الإحصاء', icon: '📊', description: 'مذكرات وتلخيصات مادة الإحصاء' },
    { id: 'sub-fr-cat-3', categoryId: 'cat-3', name: 'اللغة الفرنسية', icon: '🇫🇷', description: 'مذكرات وتلخيصات مادة اللغة الفرنسية' },
    { id: 'sub-geology-cat-3', categoryId: 'cat-3', name: 'الجيولوجيا', icon: '🌍', description: 'مذكرات وتلخيصات مادة الجيولوجيا وعلوم البيئة' },
  ],
  books: [
    {
      id: 'book-1',
      categoryId: 'cat-3',
      subjectId: 'sub-1',
      title: 'مذكرة النحو الشاملة - مراجعة ليلة الامتحان 2026',
      description: 'شرح مبسط لكافة القواعد النحوية المقررة مع 500 سؤال مجاب عنها ونماذج وزارية سابقة.',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      fileSize: '14.2 MB',
      pagesCount: 85,
      downloadCount: 142,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'book-2',
      categoryId: 'cat-3',
      subjectId: 'sub-2',
      title: 'كتاب الشامل في الفيزياء - مسائل وقوانين الفصل الأول والثاني',
      description: 'تجميعة شاملة لأهم المسائل والأفكار المتوقعة في دوائر التيار المستمر والمغناطيسية.',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      fileSize: '18.5 MB',
      pagesCount: 120,
      downloadCount: 230,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'book-3',
      categoryId: 'cat-3',
      subjectId: 'sub-3',
      title: 'ملخص الكيمياء العضوية في 40 صفحة فقط',
      description: 'تسمية المركبات، التفاعلات، والمعادلات الكيميائية بطريقة المخططات الذهنية الميسرة.',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      fileSize: '9.8 MB',
      pagesCount: 40,
      downloadCount: 315,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'book-4',
      categoryId: 'cat-3',
      subjectId: 'sub-4',
      title: 'بنك أسئلة التفاضل والتكامل - 1000 تمرين محلول',
      description: 'أقوى تجميعة مسائل مستويات عليا في التفاضل والتكامل مع الشرح خطوة بخطوة.',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      fileSize: '22.0 MB',
      pagesCount: 160,
      downloadCount: 188,
      createdAt: new Date().toISOString(),
    },
  ],
  codes: [
    {
      code: 'STUDENT-2026-VIP',
      durationDays: 30,
      studentName: 'أحمد محمود',
      note: 'طالب متفوق - اشتراك شهر',
      isUsed: false,
      status: 'unused',
      createdAt: new Date().toISOString(),
    },
    {
      code: 'THANAWYA-90D-XYZ',
      durationDays: 90,
      studentName: 'سارة خالد',
      note: 'مجموعة الأحد والثلاثاء',
      isUsed: false,
      status: 'unused',
      createdAt: new Date().toISOString(),
    },
    {
      code: 'FULLYEAR-365D-PRO',
      durationDays: 365,
      studentName: 'عمر إبراهيم',
      note: 'اشتراك سنوي شامل كل الفصول',
      isUsed: true,
      usedByChatId: '123456789',
      usedByUsername: 'omar_student',
      usedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      expiresAt: new Date(Date.now() + 360 * 86400000).toISOString(),
      status: 'active',
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
    {
      code: 'EXPIRED-TEST-CODE',
      durationDays: 7,
      studentName: 'طالب تجريبي سابق',
      note: 'منتهي الصلاحية للاختبار',
      isUsed: true,
      usedByChatId: '987654321',
      usedByUsername: 'test_user',
      usedAt: new Date(Date.now() - 15 * 86400000).toISOString(),
      expiresAt: new Date(Date.now() - 8 * 86400000).toISOString(),
      status: 'expired',
      createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    }
  ],
  students: [
    {
      chatId: '123456789',
      username: 'omar_student',
      firstName: 'عمر',
      lastName: 'إبراهيم',
      codeUsed: 'FULLYEAR-365D-PRO',
      startDate: new Date(Date.now() - 5 * 86400000).toISOString(),
      expiresAt: new Date(Date.now() + 360 * 86400000).toISOString(),
      status: 'active',
      lastActive: new Date().toISOString(),
      downloadsCount: 8,
    },
    {
      chatId: '987654321',
      username: 'test_user',
      firstName: 'كريم',
      lastName: 'السيد',
      codeUsed: 'EXPIRED-TEST-CODE',
      startDate: new Date(Date.now() - 15 * 86400000).toISOString(),
      expiresAt: new Date(Date.now() - 8 * 86400000).toISOString(),
      status: 'expired',
      lastActive: new Date(Date.now() - 8 * 86400000).toISOString(),
      downloadsCount: 3,
    }
  ],
  settings: DEFAULT_SETTINGS,
};

class FileDatabase {
  private data: DatabaseSchema;

  constructor() {
    this.ensureDataDir();
    this.data = this.loadData();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadData(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          ...INITIAL_DATA,
          ...parsed,
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
        };
      }
    } catch (e) {
      console.error('Error loading db.json, fallback to initial data', e);
    }
    this.saveData(INITIAL_DATA);
    return JSON.parse(JSON.stringify(INITIAL_DATA));
  }

  private saveData(dataToSave: DatabaseSchema) {
    try {
      this.ensureDataDir();
      fs.writeFileSync(DB_FILE, JSON.stringify(dataToSave, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving db.json', e);
    }
  }

  public getCategories(): Category[] {
    return this.data.categories.sort((a, b) => a.order - b.order);
  }

  public addCategory(name: string, description?: string, icon?: string): Category {
    const newCat: Category = {
      id: 'cat-' + Date.now(),
      name,
      description: description || '',
      icon: icon || '📚',
      order: this.data.categories.length + 1,
    };
    this.data.categories.push(newCat);
    this.saveData(this.data);
    return newCat;
  }

  public updateCategory(id: string, updates: Partial<Category>): Category | null {
    const idx = this.data.categories.findIndex(c => c.id === id);
    if (idx === -1) return null;
    this.data.categories[idx] = { ...this.data.categories[idx], ...updates };
    this.saveData(this.data);
    return this.data.categories[idx];
  }

  public deleteCategory(id: string): boolean {
    const initialLen = this.data.categories.length;
    this.data.categories = this.data.categories.filter(c => c.id !== id);
    this.data.subjects = this.data.subjects.filter(s => s.categoryId !== id);
    this.data.books = this.data.books.filter(b => b.categoryId !== id);
    this.saveData(this.data);
    return this.data.categories.length < initialLen;
  }

  public getSubjects(categoryId?: string): Subject[] {
    if (categoryId) {
      return this.data.subjects.filter(s => s.categoryId === categoryId);
    }
    return this.data.subjects;
  }

  public addSubject(categoryId: string, name: string, description?: string, icon?: string): Subject {
    const newSubject: Subject = {
      id: 'sub-' + Date.now(),
      categoryId,
      name,
      description: description || '',
      icon: icon || '📖',
    };
    this.data.subjects.push(newSubject);
    this.saveData(this.data);
    return newSubject;
  }

  public updateSubject(id: string, updates: Partial<Subject>): Subject | null {
    const idx = this.data.subjects.findIndex(s => s.id === id);
    if (idx === -1) return null;
    this.data.subjects[idx] = { ...this.data.subjects[idx], ...updates };
    this.saveData(this.data);
    return this.data.subjects[idx];
  }

  public deleteSubject(id: string): boolean {
    const initialLen = this.data.subjects.length;
    this.data.subjects = this.data.subjects.filter(s => s.id !== id);
    this.data.books = this.data.books.filter(b => b.subjectId !== id);
    this.saveData(this.data);
    return this.data.subjects.length < initialLen;
  }

  public getBooks(categoryId?: string, subjectId?: string, query?: string): Book[] {
    let result = this.data.books;
    if (categoryId) {
      result = result.filter(b => b.categoryId === categoryId);
    }
    if (subjectId) {
      result = result.filter(b => b.subjectId === subjectId);
    }
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(b =>
        b.title.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        (b.teacherName && b.teacherName.toLowerCase().includes(q))
      );
    }
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getBookById(id: string): Book | undefined {
    return this.data.books.find(b => b.id === id);
  }

  public addBook(book: Omit<Book, 'id' | 'downloadCount' | 'createdAt'>): Book {
    const newBook: Book = {
      ...book,
      id: 'book-' + Date.now(),
      downloadCount: 0,
      createdAt: new Date().toISOString(),
    };
    this.data.books.push(newBook);
    this.saveData(this.data);
    return newBook;
  }

  public updateBook(id: string, updates: Partial<Book>): Book | null {
    const idx = this.data.books.findIndex(b => b.id === id);
    if (idx === -1) return null;
    this.data.books[idx] = { ...this.data.books[idx], ...updates };
    this.saveData(this.data);
    return this.data.books[idx];
  }

  public deleteBook(id: string): boolean {
    const initialLen = this.data.books.length;
    this.data.books = this.data.books.filter(b => b.id !== id);
    this.saveData(this.data);
    return this.data.books.length < initialLen;
  }

  public incrementDownload(id: string) {
    const book = this.data.books.find(b => b.id === id);
    if (book) {
      book.downloadCount += 1;
      this.saveData(this.data);
    }
  }

  public getCodes(): ActivationCode[] {
    // Update expired statuses dynamically
    const now = new Date();
    this.data.codes.forEach(c => {
      if (c.status === 'active' && c.expiresAt && new Date(c.expiresAt) < now) {
        c.status = 'expired';
      }
    });
    return [...this.data.codes].reverse();
  }

  public generateCode(durationDays: number, studentName?: string, note?: string, customCode?: string): ActivationCode {
    const code = customCode
      ? customCode.trim().toUpperCase()
      : 'STU-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

    const newCode: ActivationCode = {
      code,
      durationDays: Math.max(1, durationDays),
      studentName: studentName || '',
      note: note || '',
      isUsed: false,
      status: 'unused',
      createdAt: new Date().toISOString(),
    };

    this.data.codes.push(newCode);
    this.saveData(this.data);
    return newCode;
  }

  public generateBulkCodes(count: number, durationDays: number, notePrefix?: string): ActivationCode[] {
    const generated: ActivationCode[] = [];
    for (let i = 1; i <= count; i++) {
      const code = this.generateCode(durationDays, undefined, notePrefix ? `${notePrefix} (#${i})` : `دفعة تلقائية (#${i})`);
      generated.push(code);
    }
    return generated;
  }

  public revokeCode(codeStr: string): boolean {
    const item = this.data.codes.find(c => c.code === codeStr);
    if (!item) return false;
    item.status = 'revoked';
    this.saveData(this.data);
    return true;
  }

  public deleteCode(codeStr: string): boolean {
    const initialLen = this.data.codes.length;
    this.data.codes = this.data.codes.filter(c => c.code !== codeStr);
    this.saveData(this.data);
    return this.data.codes.length < initialLen;
  }

  public getStudents(): StudentSubscription[] {
    const now = new Date();
    this.data.students.forEach(s => {
      if (s.status === 'active' && new Date(s.expiresAt) < now) {
        s.status = 'expired';
      }
    });
    return this.data.students;
  }

  public getStudentByChatId(chatId: string | number): StudentSubscription | undefined {
    const student = this.data.students.find(s => String(s.chatId) === String(chatId));
    if (student && student.status === 'active' && new Date(student.expiresAt) < new Date()) {
      student.status = 'expired';
      this.saveData(this.data);
    }
    return student;
  }

  public activateStudentWithCode(
    chatId: string | number,
    codeStr: string,
    userInfo: { username?: string; firstName?: string; lastName?: string }
  ): { success: boolean; message: string; student?: StudentSubscription } {
    const cleanedCode = codeStr.trim().toUpperCase();
    const codeItem = this.data.codes.find(c => c.code.toUpperCase() === cleanedCode);

    if (!codeItem) {
      return { success: false, message: 'الكود غير موجود في النظام. يرجى التحقق من صحته.' };
    }

    if (codeItem.status === 'revoked') {
      return { success: false, message: 'هذا الكود تم إلغاؤه من قبل إدارة المنصة.' };
    }

    if (codeItem.isUsed && String(codeItem.usedByChatId) !== String(chatId)) {
      return { success: false, message: 'هذا الكود مستخدم بالفعل من قبل طالب آخر. الأكواد فردية وخاصة.' };
    }

    const now = new Date();
    const durationMs = codeItem.durationDays * 24 * 60 * 60 * 1000;
    const expiresAtDate = new Date(now.getTime() + durationMs);

    // Update code
    codeItem.isUsed = true;
    codeItem.usedByChatId = chatId;
    codeItem.usedByUsername = userInfo.username || '';
    codeItem.usedAt = now.toISOString();
    codeItem.expiresAt = expiresAtDate.toISOString();
    codeItem.status = 'active';

    // Check if student already exists -> update or create
    let student = this.data.students.find(s => String(s.chatId) === String(chatId));
    if (student) {
      student.codeUsed = cleanedCode;
      student.startDate = now.toISOString();
      student.expiresAt = expiresAtDate.toISOString();
      student.status = 'active';
      student.lastActive = now.toISOString();
      if (userInfo.username) student.username = userInfo.username;
      if (userInfo.firstName) student.firstName = userInfo.firstName;
      if (userInfo.lastName) student.lastName = userInfo.lastName;
    } else {
      student = {
        chatId,
        username: userInfo.username || '',
        firstName: userInfo.firstName || '',
        lastName: userInfo.lastName || '',
        codeUsed: cleanedCode,
        startDate: now.toISOString(),
        expiresAt: expiresAtDate.toISOString(),
        status: 'active',
        lastActive: now.toISOString(),
        downloadsCount: 0,
      };
      this.data.students.push(student);
    }

    this.saveData(this.data);
    return {
      success: true,
      message: `تم التفعيل بنجاح! اشتراكك نشط لمدة ${codeItem.durationDays} يوم حتى ${expiresAtDate.toLocaleDateString('ar-EG')}`,
      student,
    };
  }

  public renewStudentSubscription(chatId: string | number, additionalDays: number): StudentSubscription | null {
    const student = this.data.students.find(s => String(s.chatId) === String(chatId));
    if (!student) return null;

    const baseTime = Math.max(Date.now(), new Date(student.expiresAt).getTime());
    const newExpires = new Date(baseTime + additionalDays * 24 * 60 * 60 * 1000);
    student.expiresAt = newExpires.toISOString();
    student.status = 'active';
    this.saveData(this.data);
    return student;
  }

  public toggleStudentBlock(chatId: string | number): StudentSubscription | null {
    const student = this.data.students.find(s => String(s.chatId) === String(chatId));
    if (!student) return null;
    student.status = student.status === 'blocked' ? 'active' : 'blocked';
    this.saveData(this.data);
    return student;
  }

  public getSettings(): BotSettings {
    return this.data.settings;
  }

  public updateSettings(updates: Partial<BotSettings>): BotSettings {
    this.data.settings = { ...this.data.settings, ...updates };
    this.saveData(this.data);
    return this.data.settings;
  }

  public getStats() {
    const categories = this.getCategories();
    const subjects = this.getSubjects();
    const books = this.getBooks();
    const codes = this.getCodes();
    const students = this.getStudents();

    const totalDownloads = books.reduce((acc, b) => acc + (b.downloadCount || 0), 0);
    const activeStudents = students.filter(s => s.status === 'active').length;
    const expiredStudents = students.filter(s => s.status === 'expired').length;
    const unusedCodes = codes.filter(c => c.status === 'unused').length;

    return {
      totalBooks: books.length,
      totalCategories: categories.length,
      totalSubjects: subjects.length,
      totalStudents: students.length,
      activeStudents,
      expiredStudents,
      totalCodes: codes.length,
      unusedCodes,
      totalDownloads,
    };
  }
}

export const db = new FileDatabase();
