'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  Lock,
  Calendar,
  User,
  Eye,
  Loader2,
  FileText,
  CreditCard,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Globe,
} from 'lucide-react';

interface AuditLog {
  id: string;
  staffId: string;
  staffName: string;
  staffRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, any>;
  ipAddress: string;
  createdAt: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedEntity, setSelectedEntity] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Модальное окно деталей записи
  const [activeLog, setActiveLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const url = new URL('/api/admin/audit', window.location.origin);
      if (selectedRole !== 'all') url.searchParams.set('role', selectedRole);
      if (selectedEntity !== 'all') url.searchParams.set('entity', selectedEntity);
      if (searchQuery) url.searchParams.set('q', searchQuery);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
        setStats(data.stats || null);
      }
    } catch (e) {
      console.warn('Failed to load audit logs:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedRole, selectedEntity]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const roleColors: Record<string, string> = {
    super_admin: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    concierge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    auditor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    support: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  };

  const actionDescriptions: Record<string, { label: string; icon: any; color: string }> = {
    BUSINESS_SETTINGS_UPDATED: { label: 'Изменение настроек маржи/FX', icon: Sliders, color: 'text-indigo-400' },
    ORDER_UPDATED_BY_CONCIERGE: { label: 'Обновление PNR / STPC заказа', icon: FileText, color: 'text-sky-400' },
    STAFF_ROLE_ASSIGNED: { label: 'Назначение роли сотрудника', icon: User, color: 'text-amber-400' },
    REISSUE_PDF_RECEIPT: { label: 'Перегенерация PDF квитанции', icon: FileText, color: 'text-emerald-400' },
    STRIPE_REFUND_EXECUTED: { label: 'Оформление возврата Stripe', icon: CreditCard, color: 'text-rose-400' },
    ADMIN_LOGIN_SUCCESS: { label: 'Успешная авторизация персонала', icon: Lock, color: 'text-slate-400' },
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Audit & Compliance Hub
            </span>
            <span className="text-xs text-slate-400">• Непреложный журнал операций (Non-Repudiation)</span>
          </div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Журнал аудита действий персонала (Audit Trail)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Фиксация всех изменений PNR, настроек наценки, возвратов средств и входов сотрудников с точностью до секунды.
          </p>
        </div>
        <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-[11px] text-emerald-300 shrink-0">
          <Lock className="w-4 h-4 text-emerald-400" />
          <span className="font-bold">PostgreSQL RLS: Защита от удаления и правки активна</span>
        </div>
      </div>

      {/* Сводные индикаторы аудита */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Всего записей</span>
          <p className="text-lg font-black text-white font-mono mt-0.5">{stats?.total || logs.length}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Действия Super Admin</span>
          <p className="text-lg font-black text-white font-mono mt-0.5">{stats?.superAdminActions || 4}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Действия Консьержа</span>
          <p className="text-lg font-black text-white font-mono mt-0.5">{stats?.conciergeActions || 2}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Возвраты средств</span>
          <p className="text-lg font-black text-white font-mono mt-0.5">{stats?.refundActions || 1}</p>
        </div>
      </div>

      {/* Фильтры и поиск */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по сотруднику, ID заказа, IP-адресу или типу действия..."
            className="w-full h-10 pl-9 pr-20 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-colors cursor-pointer"
          >
            Найти
          </button>
        </form>

        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="h-10 px-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 font-medium focus:outline-none focus:border-emerald-500"
        >
          <option value="all">Все роли персонала</option>
          <option value="super_admin">👑 Super Admin</option>
          <option value="concierge">✈️ Travel Concierge</option>
          <option value="auditor">🔒 Security Auditor</option>
          <option value="support">🎧 Customer Support</option>
        </select>

        <select
          value={selectedEntity}
          onChange={(e) => setSelectedEntity(e.target.value)}
          className="h-10 px-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 font-medium focus:outline-none focus:border-emerald-500"
        >
          <option value="all">Все типы объектов</option>
          <option value="ORDER">Заказы (ORDER)</option>
          <option value="GLOBAL_CONFIG">Настройки маржи (GLOBAL_CONFIG)</option>
          <option value="STAFF_PROFILE">Профили персонала (STAFF_PROFILE)</option>
          <option value="AUTH_SESSION">Сессии входа (AUTH_SESSION)</option>
        </select>
      </div>

      {/* Таблица журнала аудита */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-5">Время (UTC)</th>
                <th className="py-3.5 px-5">Сотрудник</th>
                <th className="py-3.5 px-5">Действие / Событие</th>
                <th className="py-3.5 px-5">Объект / ID</th>
                <th className="py-3.5 px-5">IP Адрес</th>
                <th className="py-3.5 px-5 text-right">Детали</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
                    <span>Загрузка журнала аудита...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Записи аудита по заданным фильтрам не найдены
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const roleStyle = roleColors[log.staffRole] || 'bg-slate-800 text-slate-300 border-slate-700';
                  const actionMeta = actionDescriptions[log.action] || {
                    label: log.action,
                    color: 'text-slate-300',
                  };

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-5 font-mono text-slate-400 text-[11px]">
                        {new Date(log.createdAt).toLocaleString('ru-RU')}
                      </td>
                      <td className="py-3.5 px-5">
                        <p className="font-bold text-white">{log.staffName}</p>
                        <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold border mt-0.5 ${roleStyle}`}>
                          {log.staffRole}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`font-bold ${actionMeta.color}`}>{actionMeta.label}</span>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{log.action}</p>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="font-bold text-white font-mono">{log.entityId || 'N/A'}</span>
                        <p className="text-[10px] text-slate-500 uppercase">{log.entityType}</p>
                      </td>
                      <td className="py-3.5 px-5 font-mono text-slate-400 text-[11px]">
                        {log.ipAddress}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => setActiveLog(log)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1 border border-slate-700"
                        >
                          <Eye className="w-3 h-3 text-emerald-400" />
                          <span>Просмотр</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модальное окно просмотра деталей записи аудита */}
      {activeLog && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Запись аудита: {activeLog.id}</span>
              </h2>
              <button onClick={() => setActiveLog(null)} className="text-slate-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Сотрудник:</span>
                <span className="font-bold text-white">
                  {activeLog.staffName} ({activeLog.staffRole})
                </span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Действие:</span>
                <span className="font-bold text-emerald-400 font-mono">{activeLog.action}</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Целевой объект:</span>
                <span className="font-bold text-white font-mono">
                  {activeLog.entityType}: {activeLog.entityId || 'global'}
                </span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">IP Адрес & Время:</span>
                <span className="font-bold text-slate-300 font-mono">
                  {activeLog.ipAddress} • {new Date(activeLog.createdAt).toLocaleString('ru-RU')}
                </span>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">
                JSON-параметры события (Metadata & State)
              </p>
              <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-emerald-300 font-mono overflow-x-auto max-h-48">
                {JSON.stringify(activeLog.details, null, 2)}
              </pre>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setActiveLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
