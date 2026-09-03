'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Mail,
  User,
  ShieldAlert,
  Search,
} from 'lucide-react';

interface StaffMember {
  id: string;
  email: string;
  fullName: string;
  role: 'super_admin' | 'concierge' | 'auditor' | 'support';
  status: string;
  lastLogin: string;
  createdAt: string;
}

export default function StaffManagementPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Форма добавления сотрудника
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'concierge' | 'auditor' | 'support'>('concierge');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchStaff = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/staff');
      const data = await res.json();
      if (data.success) {
        setStaff(data.staff);
      }
    } catch (e) {
      console.warn('Failed to load staff:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, fullName: newName, role: newRole }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Не удалось пригласить сотрудника');
      }

      setSuccessMessage(`Сотрудник ${newName || newEmail} успешно добавлен с ролью ${newRole}`);
      setNewEmail('');
      setNewName('');
      setIsModalOpen(false);
      fetchStaff();
    } catch (err: any) {
      setErrorMessage(err.message || 'Ошибка сервера');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (staffMember: StaffMember) => {
    const nextStatus = staffMember.status === 'active' ? 'suspended' : 'active';
    try {
      await fetch('/api/admin/staff', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: staffMember.id, status: nextStatus }),
      });
      fetchStaff();
    } catch {}
  };

  const roleBadges: Record<string, { label: string; color: string; icon: string }> = {
    super_admin: {
      label: '👑 Super Admin',
      color: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      icon: '👑',
    },
    concierge: {
      label: '✈️ Travel Concierge (L2 Ops)',
      color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      icon: '✈️',
    },
    auditor: {
      label: '🔒 Security Auditor / QA',
      color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      icon: '🔒',
    },
    support: {
      label: '🎧 Customer Support (L1)',
      color: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
      icon: '🎧',
    },
  };

  const filteredStaff = staff.filter(
    (s) =>
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Заголовок страницы и кнопка добавления */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-5 h-5 text-amber-400" />
            <span>Управление персоналом и матрица ролей (RBAC)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Назначение прав доступа: Super Admin, Консьерж-операторы, Аудиторы и Техподдержка.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-450 hover:to-amber-550 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Пригласить сотрудника</span>
        </button>
      </div>

      {/* Уведомление об успехе */}
      {successMessage && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Поиск сотрудников */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск по имени, email или роли..."
          className="w-full h-11 pl-10 pr-4 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
        />
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
      </div>

      {/* Таблица персонала */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-5">Сотрудник</th>
                <th className="py-3.5 px-5">Роль в системе</th>
                <th className="py-3.5 px-5">Статус</th>
                <th className="py-3.5 px-5">Последний вход</th>
                <th className="py-3.5 px-5 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    <span>Загрузка команды...</span>
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    Сотрудники не найдены
                  </td>
                </tr>
              ) : (
                filteredStaff.map((member) => {
                  const roleConfig = roleBadges[member.role] || {
                    label: member.role,
                    color: 'bg-slate-800 text-slate-300 border-slate-700',
                  };
                  const isRootAdmin = member.role === 'super_admin';

                  return (
                    <tr key={member.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-white border border-slate-700">
                            {member.fullName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-white">{member.fullName}</p>
                            <p className="text-[11px] text-slate-500">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border ${roleConfig.color}`}>
                          {roleConfig.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            member.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              member.status === 'active' ? 'bg-emerald-400' : 'bg-rose-400'
                            }`}
                          />
                          <span>{member.status === 'active' ? 'Активен' : 'Заблокирован'}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-slate-400 text-[11px] font-mono">
                        {member.lastLogin}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        {isRootAdmin ? (
                          <span className="text-[10px] text-slate-500 italic">Главный владелец</span>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(member)}
                            className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                              member.status === 'active'
                                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
                                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                            }`}
                          >
                            {member.status === 'active' ? 'Блокировать' : 'Активировать'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модальное окно приглашения сотрудника */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                <span>Пригласить сотрудника</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleAddStaff} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-400">ФИО сотрудника</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Иван Соколов"
                  className="w-full h-10 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-400">Рабочий Email</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="ivan.sokolov@flightsaver.com"
                  className="w-full h-10 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-400">Назначаемая роль (RBAC)</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full h-10 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="concierge">✈️ Travel Concierge (L2 Ops — бронирования, PNR, STPC)</option>
                  <option value="auditor">🔒 Security Auditor / QA (Read-only логи, compliance)</option>
                  <option value="support">🎧 Customer Support (L1 — забота о клиентах, чаты)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Создать учетную запись</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
