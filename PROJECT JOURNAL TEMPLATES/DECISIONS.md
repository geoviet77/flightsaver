# 📋 Журнал архитектурных решений и состояния проекта (DECISIONS)

**Проект:** FlightSaver (Smart Split-Ticketing & Transit STPC/TWOV Flight Search Platform)  
**Дата обновления:** 2026-08-24  
**Версия документа:** v8.0.0  
**Статус проекта:** В разработке / Все промежуточные отчеты консолидированы в единые файлы основных версий (`Report_v1.md` — `Report_v8.md`), файловая структура оптимизирована.

---

## 1. Принятые ключевые решения (ADR)

### ADR-001 — ADR-035:
(Архитектура, Mock-режим, Мультивалютность, AI-First интерфейс, In-House чекаут, Консолидация в FlightSaver, Google-Style Apps Menu, Корректировка позиционирования агентской модели, Номера карточек, Горизонтальное меню, Инлайн-фиксация, Liquid Glass FLINEX, Минималистичный Hero-блок, Outfit, Zekton, Пространственная юстировка, Интерактивное меню Google, Чат с покупателем, 100% RU/EN паритет, Conversational Flow, Эластичная доступность, Supabase SSR схема, Дашборд со статистикой, Полный аудит типов, Мобильная шторка, Fixed Backdrop Bottom Sheet, Top-Right Close Alignment, Адаптивность доступности, Иерархия подвала, Центрирование подвала, Google OAuth Callback, Прямой вызов Supabase OAuth).

### ADR-036: Консолидация журналов отчетов проекта
- **Контекст:** Сократить количество дробных файлов отчетов (`Report_v1.1.md` ... `Report_v8.0.md`) для экономии места и улучшения навигации.
- **Решение:**
  - Все отчеты объединены в мажорные файлы:
    - [Report_v1.md](file:///g:/Мой%20диск/Проект/PROJECT%20JOURNAL%20TEMPLATES/Report_v1.md) (Этап 1: Инициализация, AI-First интерфейс)
    - [Report_v2.md](file:///g:/Мой%20диск/Проект/PROJECT%20JOURNAL%20TEMPLATES/Report_v2.md) (Этап 2: Типографика и минимализм)
    - [Report_v3.md](file:///g:/Мой%20диск/Проект/PROJECT%20JOURNAL%20TEMPLATES/Report_v3.md) (Этап 3: Юстировка и геометрия)
    - [Report_v4.md](file:///g:/Мой%20диск/Проект/PROJECT%20JOURNAL%20TEMPLATES/Report_v4.md) (Этап 4: Интерактивное меню Google)
    - [Report_v5.md](file:///g:/Мой%20диск/Проект/PROJECT%20JOURNAL%20TEMPLATES/Report_v5.md) (Этап 5: Паритет RU / EN версий)
    - [Report_v6.md](file:///g:/Мой%20диск/Проект/PROJECT%20JOURNAL%20TEMPLATES/Report_v6.md) (Этап 6: Conversational Flow и доступность)
    - [Report_v7.md](file:///g:/Мой%20диск/Проект/PROJECT%20JOURNAL%20TEMPLATES/Report_v7.md) (Этап 7: Личный кабинет, мобильная шторка и подвал)
    - [Report_v8.md](file:///g:/Мой%20диск/Проект/PROJECT%20JOURNAL%20TEMPLATES/Report_v8.md) (Этап 8: Реальный Supabase Google OAuth)
- **Статус:** Реализовано в v8.0.0.
