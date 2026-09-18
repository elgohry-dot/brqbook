import React, { useState } from 'react';
import {
  FolderPlus,
  BookPlus,
  FileText,
  Search,
  Trash2,
  Edit2,
  ExternalLink,
  Download,
  Filter,
  Plus,
  Check,
  AlertTriangle,
  Folder,
  BookOpen,
} from 'lucide-react';
import { Category, Subject, Book } from '../types.js';
import { api } from '../api.js';

interface ContentManagerProps {
  categories: Category[];
  subjects: Subject[];
  books: Book[];
  onRefresh: () => void;
}

export const ContentManager: React.FC<ContentManagerProps> = ({
  categories,
  subjects,
  books,
  onRefresh,
}) => {
  // Inner Sub-Tab State
  const [subTab, setSubTab] = useState<'books' | 'categories' | 'subjects'>('books');

  // Filter states (for books tab)
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
  const [showSubjectModal, setShowSubjectModal] = useState<boolean>(false);
  const [showBookModal, setShowBookModal] = useState<boolean>(false);

  // Edit states
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  // Category form state
  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');
  const [categoryIcon, setCategoryIcon] = useState('🎓');

  // Subject form state
  const [subjectCatId, setSubjectCatId] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [subjectDesc, setSubjectDesc] = useState('');
  const [subjectIcon, setSubjectIcon] = useState('📖');

  // Book form state
  const [bookCatId, setBookCatId] = useState('');
  const [bookSubjectId, setBookSubjectId] = useState('');
  const [bookTeacherName, setBookTeacherName] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [bookDesc, setBookDesc] = useState('');
  const [bookUrl, setBookUrl] = useState('');
  const [bookSize, setBookSize] = useState('15 MB');
  const [bookPages, setBookPages] = useState('80');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filtered lists
  const currentSubjectsForFilter = subjects.filter(s =>
    selectedCategory === 'all' ? true : s.categoryId === selectedCategory
  );

  // Unique teachers list for filter
  const availableTeachers = Array.from(
    new Set(
      books
        .filter(b => (selectedCategory === 'all' || b.categoryId === selectedCategory) && (selectedSubject === 'all' || b.subjectId === selectedSubject))
        .map(b => b.teacherName?.trim())
        .filter((t): t is string => Boolean(t && t.length > 0))
    )
  );

  const filteredBooks = books.filter(book => {
    const matchesCategory = selectedCategory === 'all' || book.categoryId === selectedCategory;
    const matchesSubject = selectedSubject === 'all' || book.subjectId === selectedSubject;
    const matchesTeacher = selectedTeacher === 'all' || book.teacherName === selectedTeacher;
    const matchesQuery =
      !searchQuery.trim() ||
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (book.teacherName && book.teacherName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSubject && matchesTeacher && matchesQuery;
  });

  // Handlers for Category
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryDesc('');
    setCategoryIcon('🎓');
    setErrorMsg(null);
    setShowCategoryModal(true);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setCategoryDesc(cat.description || '');
    setCategoryIcon(cat.icon || '🎓');
    setErrorMsg(null);
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      setErrorMsg('يرجى إدخال اسم المرحلة أو القسم');
      return;
    }
    setLoading(true);
    try {
      if (editingCategory) {
        await api.updateCategory(editingCategory.id, {
          name: categoryName.trim(),
          description: categoryDesc.trim(),
          icon: categoryIcon.trim(),
        });
      } else {
        await api.addCategory({
          name: categoryName.trim(),
          description: categoryDesc.trim(),
          icon: categoryIcon.trim(),
        });
      }
      setShowCategoryModal(false);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف قسم "${name}"؟ سيتم أيضاً حذف جميع المواد والكتب التابعة له.`)) {
      try {
        await api.deleteCategory(id);
        if (selectedCategory === id) setSelectedCategory('all');
        onRefresh();
      } catch (err: any) {
        alert(err.message || 'فشل حذف القسم');
      }
    }
  };

  // Handlers for Subject
  const handleOpenAddSubject = () => {
    setEditingSubject(null);
    setSubjectCatId(selectedCategory !== 'all' ? selectedCategory : categories[0]?.id || '');
    setSubjectName('');
    setSubjectDesc('');
    setSubjectIcon('📖');
    setErrorMsg(null);
    setShowSubjectModal(true);
  };

  const handleOpenEditSubject = (sub: Subject) => {
    setEditingSubject(sub);
    setSubjectCatId(sub.categoryId);
    setSubjectName(sub.name);
    setSubjectDesc(sub.description || '');
    setSubjectIcon(sub.icon || '📖');
    setErrorMsg(null);
    setShowSubjectModal(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectCatId || !subjectName.trim()) {
      setErrorMsg('يرجى اختيار المرحلة وإدخال اسم المادة');
      return;
    }
    setLoading(true);
    try {
      if (editingSubject) {
        await api.updateSubject(editingSubject.id, {
          categoryId: subjectCatId,
          name: subjectName.trim(),
          description: subjectDesc.trim(),
          icon: subjectIcon.trim(),
        });
      } else {
        await api.addSubject({
          categoryId: subjectCatId,
          name: subjectName.trim(),
          description: subjectDesc.trim(),
          icon: subjectIcon.trim(),
        });
      }
      setShowSubjectModal(false);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ المادة');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubject = async (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف مادة "${name}" وجميع مذكراتها؟`)) {
      try {
        await api.deleteSubject(id);
        if (selectedSubject === id) setSelectedSubject('all');
        onRefresh();
      } catch (err: any) {
        alert(err.message || 'فشل حذف المادة');
      }
    }
  };

  // Handlers for Book
  const handleOpenAddBook = () => {
    setEditingBook(null);
    const initialCat = selectedCategory !== 'all' ? selectedCategory : categories[0]?.id || '';
    setBookCatId(initialCat);
    const relevantSubs = subjects.filter(s => s.categoryId === initialCat);
    setBookSubjectId(relevantSubs[0]?.id || '');
    setBookTeacherName('');
    setBookTitle('');
    setBookDesc('');
    setBookUrl('');
    setBookSize('12.5 MB');
    setBookPages('75');
    setErrorMsg(null);
    setShowBookModal(true);
  };

  const handleOpenEditBook = (book: Book) => {
    setEditingBook(book);
    setBookCatId(book.categoryId);
    setBookSubjectId(book.subjectId);
    setBookTeacherName(book.teacherName || '');
    setBookTitle(book.title);
    setBookDesc(book.description);
    setBookUrl(book.fileUrl);
    setBookSize(book.fileSize || 'PDF');
    setBookPages(book.pagesCount ? String(book.pagesCount) : '');
    setErrorMsg(null);
    setShowBookModal(true);
  };

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookCatId || !bookSubjectId || !bookTitle.trim() || !bookUrl.trim()) {
      setErrorMsg('يرجى ملء جميع الحقول الأساسية: المرحلة، المادة، العنوان ورابط التحميل');
      return;
    }
    setLoading(true);
    try {
      if (editingBook) {
        await api.updateBook(editingBook.id, {
          categoryId: bookCatId,
          subjectId: bookSubjectId,
          teacherName: bookTeacherName.trim() || undefined,
          title: bookTitle.trim(),
          description: bookDesc.trim(),
          fileUrl: bookUrl.trim(),
          fileSize: bookSize.trim() || 'PDF',
          pagesCount: bookPages ? Number(bookPages) : undefined,
        });
      } else {
        await api.addBook({
          categoryId: bookCatId,
          subjectId: bookSubjectId,
          teacherName: bookTeacherName.trim() || undefined,
          title: bookTitle.trim(),
          description: bookDesc.trim(),
          fileUrl: bookUrl.trim(),
          fileSize: bookSize.trim() || 'PDF',
          pagesCount: bookPages ? Number(bookPages) : undefined,
        });
      }
      setShowBookModal(false);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ الكتاب');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBook = async (id: string, title: string) => {
    if (confirm(`هل أنت متأكد من حذف المذكرة: "${title}"؟`)) {
      try {
        await api.deleteBook(id);
        onRefresh();
      } catch (err: any) {
        alert(err.message || 'فشل حذف المذكرة');
      }
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Page Title & Main Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              إدارة هيكل ومحتوى المناهج
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              أنشئ الأقسام والمراحل والصفوف التعليمية والمواد الدراسية بحرية كاملة، وارفع مذكرات الـ PDF
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleOpenAddCategory}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors border border-blue-100"
            >
              <FolderPlus className="w-4 h-4" />
              <span>إضافة قسم / مرحلة جديدة</span>
            </button>

            <button
              onClick={handleOpenAddSubject}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-colors border border-emerald-100"
            >
              <BookPlus className="w-4 h-4" />
              <span>إضافة مادة جديدة</span>
            </button>

            <button
              onClick={handleOpenAddBook}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>رفع ملف PDF جديد</span>
            </button>
          </div>
        </div>

        {/* Beautiful Inner Sub-Tabs for Absolute Control */}
        <div className="flex border-b border-slate-200 mt-6 -mx-5 px-5">
          {[
            { id: 'books', label: '📚 المذكرات والكتب', count: books.length },
            { id: 'categories', label: '🗂️ الأقسام والمراحل التعليمية', count: categories.length },
            { id: 'subjects', label: '📖 المواد الدراسية', count: subjects.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as any)}
              className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all relative whitespace-nowrap ${
                subTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span className="mr-1.5 px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold font-mono">
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Books Management */}
      {subTab === 'books' && (
        <div className="space-y-6">
          {/* Filters & Search Sub-Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Search box */}
            <div className="sm:col-span-6 relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ابحث عن اسم المذكرة أو الكتاب..."
                className="w-full pr-9 pl-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  مسح
                </button>
              )}
            </div>

            {/* Stage Filter */}
            <div className="sm:col-span-3">
              <select
                value={selectedCategory}
                onChange={e => {
                  setSelectedCategory(e.target.value);
                  setSelectedSubject('all');
                }}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
              >
                <option value="all">كل الأقسام والمراحل ({categories.length})</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.icon || '🎓'} {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Filter */}
            <div className="sm:col-span-3">
              <select
                value={selectedSubject}
                onChange={e => setSelectedSubject(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
              >
                <option value="all">كل المواد ({currentSubjectsForFilter.length})</option>
                {currentSubjectsForFilter.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.icon || '📖'} {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Categories filter buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1 shrink-0 ml-1">
              <Filter className="w-3.5 h-3.5" />
              فلترة سريعة بالقسم:
            </span>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedSubject('all');
              }}
              className={`px-3 py-1 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              الكل ({books.length})
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSelectedSubject('all');
                }}
                className={`px-3 py-1 text-xs font-bold rounded-lg whitespace-nowrap transition-all flex items-center gap-1 ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{cat.icon || '🎓'}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Books List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBooks.length === 0 ? (
              <div className="col-span-full bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">لا توجد كتب أو مذكرات مرفوعة</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  قم برفع مذكرات PDF جديدة من خلال الضغط على زر "رفع ملف PDF جديد" في الأعلى.
                </p>
              </div>
            ) : (
              filteredBooks.map(book => {
                const category = categories.find(c => c.id === book.categoryId);
                const subject = subjects.find(s => s.id === book.subjectId);

                return (
                  <div
                    key={book.id}
                    className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-blue-200 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Tags */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100">
                            {category?.icon || '🎓'} {category?.name || 'قسم عام'}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
                            {subject?.icon || '📖'} {subject?.name || 'مادة عامة'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono font-bold">
                          {book.fileSize || 'PDF'}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                        {book.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                        {book.description || 'لا يوجد وصف مضاف لهذه المذكرة.'}
                      </p>

                      {/* Stats */}
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Download className="w-3.5 h-3.5 text-slate-400" />
                          <span><b>{book.downloadCount}</b> تحميل من البوت</span>
                        </span>
                        <span>{book.pagesCount ? `${book.pagesCount} صفحة` : 'مذكرة شرح'}</span>
                      </div>
                    </div>

                    {/* Action controls */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <a
                        href={book.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200 transition-colors"
                        title="معاينة وتحميل ملف الـ PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>معاينة الرابط</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditBook(book)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors"
                          title="تعديل المذكرة"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteBook(book.id, book.title)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="حذف المذكرة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Custom Category System - Absolute Freedom */}
      {subTab === 'categories' && (
        <div className="space-y-6">
          <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl text-blue-950 text-xs sm:text-sm leading-relaxed flex items-start gap-2.5">
            <span className="text-lg">💡</span>
            <div>
              <p className="font-bold">نظام إدارة الأقسام والمراحل المرن:</p>
              <p className="text-xs text-blue-900/90 mt-0.5">
                يمكنك هنا إنشاء صفوف دراسية (مثل: أولى ثانوي)، أو أقسام عامة (مثل: مراجعات نهائية، مذكرات التأسيس).
                كل قسم تنشئه سيظهر مباشرة في البوت كزر تفاعلي يضغط عليه الطالب.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Create New Category Card */}
            <button
              onClick={handleOpenAddCategory}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center hover:bg-blue-50/20 transition-all flex flex-col items-center justify-center min-h-[170px] group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-slate-50 group-hover:bg-blue-50 border border-slate-200 group-hover:border-blue-200 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-all mb-3 shadow-xs">
                <Plus className="w-6 h-6" />
              </div>
              <span className="font-bold text-slate-800 group-hover:text-blue-700 text-xs sm:text-sm">
                إضافة قسم / مرحلة دراسية جديدة
              </span>
              <span className="text-[11px] text-slate-400 mt-1">
                اضغط لتوليد قسم أو صف جديد فوراً
              </span>
            </button>

            {categories.map(cat => {
              const matchingSubjects = subjects.filter(s => s.categoryId === cat.id);
              const matchingBooks = books.filter(b => b.categoryId === cat.id);

              return (
                <div
                  key={cat.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-blue-200 hover:shadow-md transition-all flex flex-col justify-between min-h-[170px]"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-150 flex items-center justify-center text-2xl shadow-xs">
                          {cat.icon || '🎓'}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm leading-tight">
                            {cat.name}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {cat.id}</p>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 mt-3 line-clamp-2 leading-relaxed">
                      {cat.description || 'لا يوجد وصف مضاف لهذا القسم التعليمي.'}
                    </p>
                  </div>

                  {/* Summary of inside contents & Controls */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex gap-1.5 text-[10px] font-bold">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                        {matchingSubjects.length} مواد
                      </span>
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">
                        {matchingBooks.length} كتب PDF
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditCategory(cat)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="تعديل هذا القسم"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="حذف هذا القسم بالكامل"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Subjects Management */}
      {subTab === 'subjects' && (
        <div className="space-y-6">
          <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl text-emerald-950 text-xs sm:text-sm leading-relaxed flex items-start gap-2.5">
            <span className="text-lg">📖</span>
            <div>
              <p className="font-bold">إدارة المواد الدراسية التابعة للأقسام:</p>
              <p className="text-xs text-emerald-900/90 mt-0.5">
                كل قسم قمت بإنشائه في التبويب السابق، يمكنك إضافة مواد بداخله هنا (مثل: مادة الفيزياء تحت قسم الصف الثالث الثانوي).
                عندما يختار الطالب قسماً في البوت، سيعرض له البوت فوراً المواد التابعة للقسم على هيئة أزرار شفافة.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Create New Subject Card */}
            <button
              onClick={handleOpenAddSubject}
              className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center hover:bg-emerald-50/20 transition-all flex flex-col items-center justify-center min-h-[170px] group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-slate-50 group-hover:bg-emerald-50 border border-slate-200 group-hover:border-emerald-200 flex items-center justify-center text-slate-400 group-hover:text-emerald-600 transition-all mb-3 shadow-xs">
                <Plus className="w-6 h-6" />
              </div>
              <span className="font-bold text-slate-800 group-hover:text-emerald-700 text-xs sm:text-sm">
                إضافة مادة دراسية جديدة
              </span>
              <span className="text-[11px] text-slate-400 mt-1">
                اربط مادة بداخل أي قسم تعليمي
              </span>
            </button>

            {subjects.map(sub => {
              const parentCategory = categories.find(c => c.id === sub.categoryId);
              const matchingBooks = books.filter(b => b.subjectId === sub.id);

              return (
                <div
                  key={sub.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-emerald-200 hover:shadow-md transition-all flex flex-col justify-between min-h-[170px]"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-150 flex items-center justify-center text-2xl shadow-xs">
                          {sub.icon || '📖'}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm leading-tight">
                            {sub.name}
                          </h4>
                          <span className="inline-flex items-center text-[10px] bg-slate-100 text-slate-600 px-2 py-0.2 rounded font-medium mt-1">
                            القسم: {parentCategory?.name || 'قسم غير محدد'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 mt-3 line-clamp-2 leading-relaxed">
                      {sub.description || 'لا يوجد وصف مضاف لهذه المادة.'}
                    </p>
                  </div>

                  {/* Summary of inside contents & Controls */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                      {matchingBooks.length} مذكرات PDF مرفوعة
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditSubject(sub)}
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="تعديل المادة"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSubject(sub.id, sub.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="حذف المادة ومذكراتها"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal: Category (المرحلة الدراسية / القسم) */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 text-right">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              {editingCategory ? '✏️ تعديل بيانات المرحلة / القسم' : '📁 إضافة مرحلة / قسم جديد'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              المراحل تساعد في تصنيف وترتيب المحتوى البرمجي والتعليمي للطلاب بوضوح تام.
            </p>

            {errorMsg && (
              <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveCategory} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم المرحلة أو الصف الدراسي *
                </label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={e => setCategoryName(e.target.value)}
                  placeholder="مثال: الصف الثالث الثانوي، المراجعات النهائية، إلخ."
                  required
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    أيقونة تعبيرية (Emoji)
                  </label>
                  <input
                    type="text"
                    value={categoryIcon}
                    onChange={e => setCategoryIcon(e.target.value)}
                    placeholder="🎓"
                    className="w-full px-3 py-2 text-sm text-center bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رموز سريعة
                  </label>
                  <div className="flex gap-1 pt-1">
                    {['🎓', '🎒', '📚', '🏫', '🧪', '🔥', '🧠', '⭐'].map(emoji => (
                      <button
                        type="button"
                        key={emoji}
                        onClick={() => setCategoryIcon(emoji)}
                        className="w-7 h-7 text-xs rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  وصف مختصر وملاحظات
                </label>
                <textarea
                  value={categoryDesc}
                  onChange={e => setCategoryDesc(e.target.value)}
                  rows={2}
                  placeholder="ملاحظات توضيحية تظهر للطالب في البوت عند اختيار القسم..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{loading ? 'جاري الحفظ...' : 'حفظ القسم'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Subject (المادة الدراسية) */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 text-right">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              {editingSubject ? '✏️ تعديل مادة دراسية' : '📖 إضافة مادة دراسية جديدة'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              اربط المادة بالقسم التعليمي المناسب لتظهر في قائمة الطلاب فوراً.
            </p>

            {errorMsg && (
              <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveSubject} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  القسم / المرحلة الدراسية التابعة لها *
                </label>
                <select
                  value={subjectCatId}
                  onChange={e => setSubjectCatId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">-- اختر القسم التعليمي --</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.icon || '🎓'} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم المادة الدراسية *
                </label>
                <input
                  type="text"
                  value={subjectName}
                  onChange={e => setSubjectName(e.target.value)}
                  placeholder="مثال: الرياضيات، النحو والصرف، الأحياء..."
                  required
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    أيقونة المادة
                  </label>
                  <input
                    type="text"
                    value={subjectIcon}
                    onChange={e => setSubjectIcon(e.target.value)}
                    placeholder="📝"
                    className="w-full px-3 py-2 text-sm text-center bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    أيقونات مقترحة
                  </label>
                  <div className="flex gap-1 pt-1">
                    {['📝', '🧪', '📐', '🧬', '🌍', '📐', '🧠', '💼'].map(emoji => (
                      <button
                        type="button"
                        key={emoji}
                        onClick={() => setSubjectIcon(emoji)}
                        className="w-7 h-7 text-xs rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  وصف المادة (اختياري)
                </label>
                <textarea
                  value={subjectDesc}
                  onChange={e => setSubjectDesc(e.target.value)}
                  rows={2}
                  placeholder="وصف محتوى المادة أو الفصول الدراسية المشمولة..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{loading ? 'جاري الحفظ...' : 'حفظ المادة'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Book (المذكرة أو الكتاب PDF) */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 text-right max-h-[90vh] overflow-y-auto">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              {editingBook ? '✏️ تعديل بيانات المذكرة' : '📚 رفع مذكرة / كتاب PDF جديد'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              املأ الحقول لرفع الكتاب وتوليد زر تنزيل آمن ومباشر للطلاب داخل البوت.
            </p>

            {errorMsg && (
              <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveBook} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    القسم / المرحلة *
                  </label>
                  <select
                    value={bookCatId}
                    onChange={e => {
                      const newCat = e.target.value;
                      setBookCatId(newCat);
                      const matching = subjects.filter(s => s.categoryId === newCat);
                      setBookSubjectId(matching[0]?.id || '');
                    }}
                    required
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">-- اختر القسم التعليمي --</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.icon || '🎓'} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المادة الدراسية التابعة لها *
                  </label>
                  <select
                    value={bookSubjectId}
                    onChange={e => setBookSubjectId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">-- اختر المادة --</option>
                    {subjects
                      .filter(s => (bookCatId ? s.categoryId === bookCatId : true))
                      .map(s => (
                        <option key={s.id} value={s.id}>
                          {s.icon || '📖'} {s.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  عنوان المذكرة أو الكتاب التعليمي *
                </label>
                <input
                  type="text"
                  value={bookTitle}
                  onChange={e => setBookTitle(e.target.value)}
                  placeholder="مثال: مذكرة التميز في الفيزياء الحديثة - الباب الخامس"
                  required
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    رابط ملف الـ PDF المباشر والآمن *
                  </label>
                  <button
                    type="button"
                    onClick={() => setBookUrl('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf')}
                    className="text-[11px] text-blue-600 hover:underline"
                  >
                    رابط ملف تجريبي (Dummy PDF)
                  </button>
                </div>
                <input
                  type="url"
                  value={bookUrl}
                  onChange={e => setBookUrl(e.target.value)}
                  placeholder="https://drive.google.com/uc?export=download&id=... أو أي رابط مباشر"
                  required
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-left"
                  dir="ltr"
                />
                <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                  يرجى التأكد من أن الرابط مباشر ويبدأ بـ HTTP/HTTPS لتنزيل فوري بدون عوائق للطلاب.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    حجم الملف (مثال: 12 MB)
                  </label>
                  <input
                    type="text"
                    value={bookSize}
                    onChange={e => setBookSize(e.target.value)}
                    placeholder="12 MB"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-left"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    عدد الصفحات المشمولة
                  </label>
                  <input
                    type="number"
                    value={bookPages}
                    onChange={e => setBookPages(e.target.value)}
                    placeholder="75"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  وصف ومكونات المذكرة
                </label>
                <textarea
                  value={bookDesc}
                  onChange={e => setBookDesc(e.target.value)}
                  rows={3}
                  placeholder="اكتب نبذة تظهر للطالب بداخل رسالة تليجرام عند اختيار هذه المذكرة..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBookModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{loading ? 'جاري الحفظ...' : 'حفظ ونشر المذكرة'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
