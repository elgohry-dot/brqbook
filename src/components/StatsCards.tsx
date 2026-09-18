import React from 'react';
import { BookOpen, Users, KeyRound, Download, ArrowUpRight } from 'lucide-react';
import { BotStats } from '../types.js';

interface StatsCardsProps {
  stats: BotStats | null;
  onNavigateTab: (tab: 'content' | 'codes' | 'students' | 'simulator' | 'settings') => void;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, onNavigateTab }) => {
  if (!stats) return null;

  const cards = [
    {
      title: 'إجمالي الكتب والمذكرات',
      value: stats.totalBooks,
      subtext: `${stats.totalCategories} مراحل • ${stats.totalSubjects} مواد`,
      icon: BookOpen,
      color: 'blue',
      badge: 'مكتبة PDF',
      action: () => onNavigateTab('content'),
    },
    {
      title: 'الطلاب النشطون',
      value: stats.activeStudents,
      subtext: `من إجمالي ${stats.totalStudents} طالب مسجل`,
      icon: Users,
      color: 'emerald',
      badge: 'اشتراكات سارية',
      action: () => onNavigateTab('students'),
    },
    {
      title: 'أكواد التفعيل المتاحة',
      value: stats.unusedCodes,
      subtext: `من أصل ${stats.totalCodes} كود مولّد`,
      icon: KeyRound,
      color: 'amber',
      badge: 'جاهزة للتوزيع',
      action: () => onNavigateTab('codes'),
    },
    {
      title: 'إجمالي التحميلات',
      value: stats.totalDownloads,
      subtext: 'عمليات تنزيل ناجحة للكتب',
      icon: Download,
      color: 'indigo',
      badge: 'تفاعل الطلاب',
      action: () => onNavigateTab('content'),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <div
            key={idx}
            onClick={card.action}
            className="group relative bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-50 border border-slate-100 group-hover:scale-105 transition-transform text-slate-700">
                <IconComponent className="w-5 h-5 text-slate-800" />
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700">
                {card.badge}
              </span>
            </div>

            <div className="mt-4">
              <span className="text-xs text-slate-500 font-medium block">
                {card.title}
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  {card.value.toLocaleString('ar-EG')}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                <span>{card.subtext}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
