'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Sliders,
  CreditCard,
  PlaneTakeoff,
  ShieldCheck,
  Headphones,
  LogOut,
  ShieldAlert,
  ChevronRight,
  Sparkles,
  Activity,
} from 'lucide-react';

interface StaffUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(null);

  // На странице логина показываем чистый layout без сайдбара
  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (!isLoginPage) {
      // Инициализируем данные администратора
      const rawUser = localStorage.getItem('fs_admin_profile');
      if (rawUser) {
        try {
          setCurrentUser(JSON.parse(rawUser));
        } catch {}
      } else {
        setCurrentUser({
          id: 'sa_root_001',
          email: 'owner@flightsaver.com',
          fullName: 'Главный Администратор',
          role: 'super_admin',
        });
      }
    }
  }, [isLoginPage]);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {}
    localStorage.removeItem('fs_admin_profile');
    router.push('/admin/login');
  };

  if (isLoginPage) {
    return <div className="min-h-screen bg-slate-950 text-slate-100">{children}</div>;
  }

  const navItems = [
    {
      label: 'Command Center',
      href: '/admin',
      icon: LayoutDashboard,
      badge: 'Real-time',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    },
    {
      label: 'Персонал и Роли',
      href: '/admin/staff',
      icon: Users,
      badge: 'Super Admin',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      label: 'Бизнес-настройки',
      href: '/admin/settings',
      icon: Sliders,
      badge: 'FX & Fees',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    },
    {
      label: 'Финансы и Возвраты',
      href: '/admin/finance',
      icon: CreditCard,
      badge: 'Stripe',
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    },
    {
      label: 'Заказы и PNR',
      href: '/admin/orders',
      icon: PlaneTakeoff,
      badge: 'Concierge Ops',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    },
    {
      label: 'Журнал аудита',
      href: '/admin/audit',
      icon: ShieldCheck,
      badge: 'Audit Trail',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    {
      label: 'Системный мониторинг',
      href: '/admin/system',
      icon: Activity,
      badge: 'SLA & Health',
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    },
    {
      label: 'Техподдержка',
      href: '/admin/support',
      icon: Headphones,
      badge: 'Этап 4',
      badgeColor: 'bg-slate-700/50 text-slate-400 border-slate-600',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row antialiased">
      {/* ЛЕВЫЙ БОКОВОЙ САЙДБАР */}
      <aside className="w-full md:w-72 bg-slate-900/90 border-b md:border-b-0 md:border-r border-slate-800/80 p-5 flex flex-col justify-between shrink-0 backdrop-blur-xl">
        <div className="space-y-6">
          {/* Бренд и заголовок */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-indigo-600 to-sky-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">FlightSaver</span>
                <span className="px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 rounded-md border border-amber-500/30">
                  OPS HUB
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Enterprise Back-Office v1.5</p>
            </div>
          </div>

          {/* Карточка текущего администратора */}
          <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-sm flex items-center justify-center shadow-md">
              👑
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{currentUser?.fullName || 'Super Admin'}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  {currentUser?.role || 'super_admin'}
                </span>
              </div>
            </div>
          </div>

          {/* Навигационное меню */}
          <nav className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
              Иерархия модулей (RBAC)
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400/30'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md border ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Нижний блок: выход и возврат на витрину */}
        <div className="pt-6 mt-6 border-t border-slate-800/80 space-y-2">
          <Link
            href="/"
            target="_blank"
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
          >
            <span>🌐 Открыть витрину сайта</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Завершить сессию</span>
          </button>
        </div>
      </aside>

      {/* ОСНОВНОЙ КОНТЕНТНЫЙ БЛОК */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Верхняя строка статуса */}
        <header className="h-16 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-semibold text-slate-300">
              Контур управления: <span className="text-emerald-400 font-bold">PRODUCTION LIVE</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              SLA p95: <span className="text-emerald-400">0.01ms</span> (L2 Hit)
            </span>
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 border border-slate-700 text-slate-300">
              v1.5.0
            </span>
          </div>
        </header>

        {/* Контент страницы */}
        <div className="p-6 md:p-8 flex-1 max-w-7xl w-full mx-auto">{children}</div>
      </main>
    </div>
  );
}
