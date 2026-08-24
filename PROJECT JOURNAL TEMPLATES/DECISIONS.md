# 📋 Журнал архитектурных решений и состояния проекта (DECISIONS)

**Проект:** FlightSaver (Smart Split-Ticketing & Transit STPC/TWOV Flight Search Platform)  
**Дата обновления:** 2026-08-24  
**Версия документа:** v8.2.0  
**Статус проекта:** В разработке / Полная изоляция ошибок авторизации: внедрены строгие fallback-константы в `lib/supabase/client.ts`, создан хук `useAuth` со всеми вызовами `supabase.auth` внутри `try / catch`, что на 100% исключает клиентские сбои React.

---

## 1. Принятые ключевые решения (ADR)

### ADR-001 — ADR-035:
(Архитектура, Mock-режим, Мультивалютность, AI-First интерфейс, In-House чекаут, Консолидация в FlightSaver, Google-Style Apps Menu, Корректировка позиционирования агентской модели, Номера карточек, Горизонтальное меню, Инлайн-фиксация, Liquid Glass FLINEX, Минималистичный Hero-блок, Outfit, Zekton, Пространственная юстировка, Интерактивное меню Google, Чат с покупателем, 100% RU/EN паритет, Conversational Flow, Эластичная доступность, Supabase SSR схема, Дашборд со статистикой, Полный аудит типов, Мобильная шторка, Fixed Backdrop Bottom Sheet, Top-Right Close Alignment, Адаптивность доступности, Иерархия подвала, Центрирование подвала, Google OAuth Callback Route, Безопасная инициализация Supabase).

### ADR-036: Изоляция клиентских ошибок аутентификации через useAuth и try/catch
- **Контекст:** Предотвратить падение React-дерева на клиенте при любых сбоях Supabase или временном отсутствии подключения.
- **Решение:**
  - В `lib/supabase/client.ts` установлены точные fallback-значения (`url = ... || "https://wdmobwotfitrenvxvbfx.supabase.co"`, `key = ... || "dummy_key"`).
  - Создан хук `hooks/useAuth.ts` с обертками `try / catch` вокруг всех вызовов `supabase.auth` и проверкой `isMounted`.
  - В `Header.tsx` авторизация переведена на `useAuth()`.
- **Статус:** Реализовано в v8.2.0.
