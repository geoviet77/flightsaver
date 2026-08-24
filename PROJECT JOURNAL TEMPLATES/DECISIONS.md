# 📋 Журнал архитектурных решений и состояния проекта (DECISIONS)

**Проект:** FlightSaver (Smart Split-Ticketing & Transit STPC/TWOV Flight Search Platform)  
**Дата обновления:** 2026-08-24  
**Версия документа:** v8.11.0  
**Статус проекта:** В разработке / В `package.json` обновлена версия Next.js (`^14.2.24`), в `app/auth/callback/route.ts` реализовано прямое прикрепление кук к объекту `response.cookies.set()`, а в `components/Header.tsx` обеспечено моментальное чтение сессии через `getSession()`.

---

## 1. Принятые ключевые решения (ADR)

### ADR-001 — ADR-044:
(Архитектура, Mock-режим, Мультивалютность, AI-First интерфейс, In-House чекаут, Консолидация в FlightSaver, Google-Style Apps Menu, Корректировка позиционирования агентской модели, Номера карточек, Горизонтальное меню, Инлайн-фиксация, Liquid Glass FLINEX, Минималистичный Hero-блок, Outfit, Zekton, Пространственная юстировка, Интерактивное меню Google, Чат с покупателем, 100% RU/EN паритет, Conversational Flow, Эластичная доступность, Supabase SSR схема, Дашборд со статистикой, Полный аудит типов, Мобильная шторка, Fixed Backdrop Bottom Sheet, Top-Right Close Alignment, Адаптивность доступности, Иерархия подвала, Центрирование подвала, Google OAuth Callback Route, Безопасная инициализация Supabase, Изоляция клиентских ошибок аутентификации, Фиксация боевых параметров проекта, Защита и санитизация URL, Удаление тестового пользователя, Канонический Header, Расширение Tailwind, Прямой переход через window.location.assign, PostCSS и Tailwind сборка, Единый модуль lib/auth.ts).

### ADR-045: Явная запись Cookie в NextResponse и Next.js ^14.2.24
- **Контекст:** Обеспечить 100% надежное сохранение сессионных кук в браузере при завершении OAuth редиректа.
- **Решение:**
  - В `app/auth/callback/route.ts` добавлен вызов `response.cookies.set({ name, value, ...options })`.
  - В `package.json` версия `next` обновлена до `^14.2.24`.
  - В `components/Header.tsx` добавлен вызов `supabase.auth.getSession()`.
- **Статус:** Реализовано в v8.11.0.
