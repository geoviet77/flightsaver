# 📋 Журнал архитектурных решений и состояния проекта (DECISIONS)

**Проект:** FlightSaver (Smart Split-Ticketing & Transit STPC/TWOV Flight Search Platform)  
**Дата обновления:** 2026-08-24  
**Версия документа:** v8.12.0  
**Статус проекта:** В разработке / В `lib/supabase/client.ts` настроены `flowType: "pkce"` и `detectSessionInUrl: true`, в `AuthModal.tsx` редирект переведен на `window.location.origin`, а в `Header.tsx` активна реактивная синхронизация сессии.

---

## 1. Принятые ключевые решения (ADR)

### ADR-001 — ADR-045:
(Архитектура, Mock-режим, Мультивалютность, AI-First интерфейс, In-House чекаут, Консолидация в FlightSaver, Google-Style Apps Menu, Корректировка позиционирования агентской модели, Номера карточек, Горизонтальное меню, Инлайн-фиксация, Liquid Glass FLINEX, Минималистичный Hero-блок, Outfit, Zekton, Пространственная юстировка, Интерактивное меню Google, Чат с покупателем, 100% RU/EN паритет, Conversational Flow, Эластичная доступность, Supabase SSR схема, Дашборд со статистикой, Полный аудит типов, Мобильная шторка, Fixed Backdrop Bottom Sheet, Top-Right Close Alignment, Адаптивность доступности, Иерархия подвала, Центрирование подвала, Google OAuth Callback Route, Безопасная инициализация Supabase, Изоляция клиентских ошибок аутентификации, Фиксация боевых параметров проекта, Защита и санитизация URL, Удаление тестового пользователя, Канонический Header, Расширение Tailwind, Прямой переход через window.location.assign, PostCSS и Tailwind сборка, Единый модуль lib/auth.ts, Явная запись Cookie в NextResponse).

### ADR-046: Клиентская авторизация Google OAuth с PKCE
- **Контекст:** Настроить стандартный клиентский PKCE-поток Supabase с автоматическим обнаружением токенов/кода в URL.
- **Решение:**
  - В `lib/supabase/client.ts` переданы параметры `{ auth: { flowType: "pkce", detectSessionInUrl: true } }`.
  - В `components/AuthModal.tsx` параметр `redirectTo` установлен в `window.location.origin`.
  - В `components/Header.tsx` сессия считывается через `getSession()` и отслеживается через `onAuthStateChange()`.
- **Статус:** Реализовано в v8.12.0.
