# 📋 Журнал архитектурных решений и состояния проекта (DECISIONS)

**Проект:** FlightSaver (Smart Split-Ticketing & Transit STPC/TWOV Flight Search Platform)  
**Дата обновления:** 2026-08-24  
**Версия документа:** v8.4.0  
**Статус проекта:** В разработке / В `lib/supabase/client.ts` внедрена валидация и автоматическая санитизация URL по умолчанию `https://wdmobwotfitrenvxvbfx.supabase.co`, все компоненты `AuthModal.tsx` и `Header.tsx` используют этот клиент без ошибок.

---

## 1. Принятые ключевые решения (ADR)

### ADR-001 — ADR-037:
(Архитектура, Mock-режим, Мультивалютность, AI-First интерфейс, In-House чекаут, Консолидация в FlightSaver, Google-Style Apps Menu, Корректировка позиционирования агентской модели, Номера карточек, Горизонтальное меню, Инлайн-фиксация, Liquid Glass FLINEX, Минималистичный Hero-блок, Outfit, Zekton, Пространственная юстировка, Интерактивное меню Google, Чат с покупателем, 100% RU/EN паритет, Conversational Flow, Эластичная доступность, Supabase SSR схема, Дашборд со статистикой, Полный аудит типов, Мобильная шторка, Fixed Backdrop Bottom Sheet, Top-Right Close Alignment, Адаптивность доступности, Иерархия подвала, Центрирование подвала, Google OAuth Callback Route, Безопасная инициализация Supabase, Изоляция клиентских ошибок аутентификации, Фиксация боевых параметров проекта).

### ADR-038: Защита и санитизация URL Supabase на клиенте
- **Контекст:** Исключить возникновение ошибки `Invalid supabaseUrl` при нажатии кнопки Google входа.
- **Решение:**
  - В `lib/supabase/client.ts` добавлен санитайзер: если `process.env.NEXT_PUBLIC_SUPABASE_URL` пустой или не начинается с `http`, принудительно используется валидный HTTPS URL `https://wdmobwotfitrenvxvbfx.supabase.co`.
  - В `AuthModal.tsx` и `Header.tsx` гарантированно вызывается эта фабрика.
- **Статус:** Реализовано в v8.4.0.
