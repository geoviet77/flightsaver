# 📋 Журнал архитектурных решений и состояния проекта (DECISIONS)

**Проект:** FlightSaver (Smart Split-Ticketing & Transit STPC/TWOV Flight Search Platform)  
**Дата обновления:** 2026-08-24  
**Версия документа:** v8.13.0  
**Статус проекта:** В разработке / В `components/Header.tsx` внедрен прямой обмен `?code=` на сессию пользователя на клиенте и автоматическая очистка URL от технических параметров.

---

## 1. Принятые ключевые решения (ADR)

### ADR-001 — ADR-046:
(Архитектура, Mock-режим, Мультивалютность, AI-First интерфейс, In-House чекаут, Консолидация в FlightSaver, Google-Style Apps Menu, Корректировка позиционирования агентской модели, Номера карточек, Горизонтальное меню, Инлайн-фиксация, Liquid Glass FLINEX, Минималистичный Hero-блок, Outfit, Zekton, Пространственная юстировка, Интерактивное меню Google, Чат с покупателем, 100% RU/EN паритет, Conversational Flow, Эластичная доступность, Supabase SSR схема, Дашборд со статистикой, Полный аудит типов, Мобильная шторка, Fixed Backdrop Bottom Sheet, Top-Right Close Alignment, Адаптивность доступности, Иерархия подвала, Центрирование подвала, Google OAuth Callback Route, Безопасная инициализация Supabase, Изоляция клиентских ошибок аутентификации, Фиксация боевых параметров проекта, Защита и санитизация URL, Удаление тестового пользователя, Канонический Header, Расширение Tailwind, Прямой переход через window.location.assign, PostCSS и Tailwind сборка, Единый модуль lib/auth.ts, Явная запись Cookie в NextResponse, Клиентская авторизация Google OAuth с PKCE).

### ADR-047: Клиентский обмен OAuth Code и очистка URL
- **Контекст:** Обеспечить моментальную инициализацию сессии прямо на главной странице при возврате от Google OAuth и сохранять красивый URL.
- **Решение:**
  - В `components/Header.tsx` перехватывается `?code=`, вызывается `supabase.auth.exchangeCodeForSession(code)` и выполняется `window.history.replaceState`.
- **Статус:** Реализовано в v8.13.0.
