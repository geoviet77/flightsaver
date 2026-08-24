# 📋 Журнал архитектурных решений и состояния проекта (DECISIONS)

**Проект:** FlightSaver (Smart Split-Ticketing & Transit STPC/TWOV Flight Search Platform)  
**Дата обновления:** 2026-08-24  
**Версия документа:** v8.0.0  
**Статус проекта:** В разработке / Фейковая авторизация полностью удалена: кнопка «Войти через Google» вызывает реальный Supabase OAuth с редиректом на `/auth/callback`, серверный роут выставляет куки сессии, а клиентские компоненты слушают `onAuthStateChange`.

---

## 1. Принятые ключевые решения (ADR)

### ADR-001 — ADR-033:
(Архитектура, Mock-режим, Мультивалютность, AI-First интерфейс, In-House чекаут, Консолидация в FlightSaver, Google-Style Apps Menu, Корректировка позиционирования агентской модели, Номера карточек, Горизонтальное меню, Инлайн-фиксация, Liquid Glass FLINEX, Минималистичный Hero-блок, Outfit, Zekton, Пространственная юстировка, Интерактивное меню Google, Чат с покупателем, 100% RU/EN паритет, Conversational Flow, Эластичная доступность, Supabase SSR схема, Дашборд со статистикой, Полный аудит типов, Мобильная шторка, Fixed Backdrop Bottom Sheet, Top-Right Close Alignment, Адаптивность доступности, Иерархия подвала, Центрирование подвала).

### ADR-035: Прямой вызов Supabase Google OAuth без заглушек
- **Контекст:** Удалить все искусственные заглушки и симуляции из потока аутентификации.
- **Решение:**
  - В `components/AuthModal.tsx` подключен прямой вызов `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } })` через `createBrowserClient`.
  - Все fallback таймеры и демо-профили из кнопки Google удалены.
- **Статус:** Реализовано в v8.0.0.
