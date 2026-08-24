# 📋 Журнал архитектурных решений и состояния проекта (DECISIONS)

**Проект:** FlightSaver (Smart Split-Ticketing & Transit STPC/TWOV Flight Search Platform)  
**Дата обновления:** 2026-08-24  
**Версия документа:** v8.8.0  
**Статус проекта:** В разработке / Функция `handleGoogleLogin` переведена на прямой вызов с навигацией `window.location.assign(data.url)`.

---

## 1. Принятые ключевые решения (ADR)

### ADR-001 — ADR-041:
(Архитектура, Mock-режим, Мультивалютность, AI-First интерфейс, In-House чекаут, Консолидация в FlightSaver, Google-Style Apps Menu, Корректировка позиционирования агентской модели, Номера карточек, Горизонтальное меню, Инлайн-фиксация, Liquid Glass FLINEX, Минималистичный Hero-блок, Outfit, Zekton, Пространственная юстировка, Интерактивное меню Google, Чат с покупателем, 100% RU/EN паритет, Conversational Flow, Эластичная доступность, Supabase SSR схема, Дашборд со статистикой, Полный аудит типов, Мобильная шторка, Fixed Backdrop Bottom Sheet, Top-Right Close Alignment, Адаптивность доступности, Иерархия подвала, Центрирование подвала, Google OAuth Callback Route, Безопасная инициализация Supabase, Изоляция клиентских ошибок аутентификации, Фиксация боевых параметров проекта, Защита и санитизация URL, Удаление тестового пользователя, Канонический Header, Расширение Tailwind).

### ADR-042: Прямой переход через window.location.assign
- **Контекст:** Гарантировать мгновенную переадресацию браузера на страницу авторизации Google без задержек.
- **Решение:**
  - В `components/AuthModal.tsx` функция `handleGoogleLogin` вызывает `window.location.assign(data.url)`.
- **Статус:** Реализовано в v8.8.0.
