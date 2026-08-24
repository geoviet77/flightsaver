# 📋 Журнал архитектурных решений и состояния проекта (DECISIONS)

**Проект:** FlightSaver (Smart Split-Ticketing & Transit STPC/TWOV Flight Search Platform)  
**Дата обновления:** 2026-08-24  
**Версия документа:** v7.2.0  
**Статус проекта:** В разработке / Полный аудит завершен: 0 ошибок компиляции TypeScript, оптимизирован `globals.css` и `layout.tsx` (next/font/google), устранены несоответствия типов `Flight` и `CURRENCY_RATES`, настроены `<Suspense>` границы для App Router.

---

## 1. Принятые ключевые решения (ADR)

### ADR-001 — ADR-026:
(Архитектура, Mock-режим, Мультивалютность, AI-First интерфейс, In-House чекаут, Консолидация в FlightSaver, Google-Style Apps Menu, Корректировка позиционирования агентской модели, Номера карточек, Горизонтальное меню, Инлайн-фиксация, Liquid Glass FLINEX, Минималистичный Hero-блок, Outfit, Zekton, Пространственная юстировка, Интерактивное меню Google, Чат с покупателем, 100% RU/EN паритет, Conversational Flow, Эластичная доступность, Supabase SSR схема, Дашборд со статистикой).

### ADR-027: Полный аудит типов, очистка стилей и оптимизация Next.js
- **Контекст:** Устранить все ошибки типов в IDE, нормализовать работу Next.js 14 App Router и подготовить проект к следующим задачам.
- **Решение:**
  - Унифицированы интерфейсы `Flight`, `FlightSegment`, `PricingBreakdown` в `components/FlightCard.tsx` и `app/page.tsx`.
  - В `lib/i18n.ts` добавлены все объявленные валюты `THB`, `AED` в `CURRENCY_RATES`.
  - В `app/globals.css` восстановлены лаконичные `@tailwind` директивы без дубликатов.
  - В `app/layout.tsx` внедрен `next/font/google` с кириллическими сабсетами.
  - Обернуты компоненты, использующие `useSearchParams()`, в `<Suspense>`.
- **Статус:** Реализовано в v7.2.0.
