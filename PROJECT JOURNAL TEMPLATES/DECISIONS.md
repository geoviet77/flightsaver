# 📋 Журнал архитектурных решений и состояния проекта (DECISIONS)

**Проект:** FlightSaver (Smart Split-Ticketing & Transit STPC/TWOV Flight Search Platform)  
**Дата обновления:** 2026-08-24  
**Версия документа:** v8.3.0  
**Статус проекта:** В разработке / Зафиксированы точный боевой URL `https://wdmobwotfitrenvxvbfx.supabase.co` и публичный ключ `sb_publishable_Ec3unvJULowI7TVD0LsLbg_Zay6j` в `lib/supabase/client.ts`, `.env.local` и серверных клиентах.

---

## 1. Принятые ключевые решения (ADR)

### ADR-001 — ADR-036:
(Архитектура, Mock-режим, Мультивалютность, AI-First интерфейс, In-House чекаут, Консолидация в FlightSaver, Google-Style Apps Menu, Корректировка позиционирования агентской модели, Номера карточек, Горизонтальное меню, Инлайн-фиксация, Liquid Glass FLINEX, Минималистичный Hero-блок, Outfit, Zekton, Пространственная юстировка, Интерактивное меню Google, Чат с покупателем, 100% RU/EN паритет, Conversational Flow, Эластичная доступность, Supabase SSR схема, Дашборд со статистикой, Полный аудит типов, Мобильная шторка, Fixed Backdrop Bottom Sheet, Top-Right Close Alignment, Адаптивность доступности, Иерархия подвала, Центрирование подвала, Google OAuth Callback Route, Безопасная инициализация Supabase, Изоляция клиентских ошибок аутентификации).

### ADR-037: Фиксация боевых параметров проекта Supabase
- **Контекст:** Предотвратить сбои `Invalid supabaseUrl` при пустых `process.env`.
- **Решение:**
  - В `lib/supabase/client.ts` и `lib/supabase/server.ts` прописаны дефолтные значения `https://wdmobwotfitrenvxvbfx.supabase.co` и `sb_publishable_Ec3unvJULowI7TVD0LsLbg_Zay6j`.
  - Синхронизирован `.env.local`.
- **Статус:** Реализовано в v8.3.0.
