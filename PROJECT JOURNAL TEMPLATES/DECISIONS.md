# 📋 Журнал архитектурных решений и состояния проекта (DECISIONS)

**Проект:** FlightSaver (Smart Split-Ticketing & Transit STPC/TWOV Flight Search Platform)  
**Дата обновления:** 2026-08-24  
**Версия документа:** v8.16.0  
**Статус проекта:** В разработке / В `middleware.ts` внедрен официальный отказоустойчивый шаблон с пересозданием `supabaseResponse` в `setAll` и защитой `try / catch`, что полностью устранило ошибку `500: MIDDLEWARE_INVOCATION_FAILED`.

---

## 1. Принятые ключевые решения (ADR)

### ADR-001 — ADR-049:
(Архитектура, Mock-режим, Мультивалютность, AI-First интерфейс, In-House чекаут, Консолидация в FlightSaver, Google-Style Apps Menu, Корректировка позиционирования агентской модели, Номера карточек, Горизонтальное меню, Инлайн-фиксация, Liquid Glass FLINEX, Минималистичный Hero-блок, Outfit, Zekton, Пространственная юстировка, Интерактивное меню Google, Чат с покупателем, 100% RU/EN паритет, Conversational Flow, Эластичная доступность, Supabase SSR схема, Дашборд со статистикой, Полный аудит типов, Мобильная шторка, Fixed Backdrop Bottom Sheet, Top-Right Close Alignment, Адаптивность доступности, Иерархия подвала, Центрирование подвала, Google OAuth Callback Route, Безопасная инициализация Supabase, Изоляция клиентских ошибок аутентификации, Фиксация боевых параметров проекта, Защита и санитизация URL, Удаление тестового пользователя, Канонический Header, Расширение Tailwind, Прямой переход через window.location.assign, PostCSS и Tailwind сборка, Единый модуль lib/auth.ts, Явная запись Cookie в NextResponse, Клиентская авторизация Google OAuth с PKCE, Клиентский обмен OAuth Code и очистка URL, Подключение реальных данных Supabase в Dashboard, Серверная защита маршрутов через middleware.ts).

### ADR-050: Отказоустойчивый Middleware с защитой try/catch
- **Контекст:** Устранить падение `500: MIDDLEWARE_INVOCATION_FAILED` при обработке запросов в Edge Runtime.
- **Решение:**
  - В `middleware.ts` внедрена правильная мутация `supabaseResponse` внутри `setAll`.
  - Весь код обернут в `try / catch` с безопасным пропуском `NextResponse.next({ request })` в случае непредвиденных сбоев, обеспечивая работу клиентского guard в `page.tsx`.
- **Статус:** Реализовано в v8.16.0.
