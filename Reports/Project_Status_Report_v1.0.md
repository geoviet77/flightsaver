# 📑 Аналитическая сводка: Состояние проекта FlightSaver (v1.2.0)

**Дата:** 27 августа 2026 г.  
**Проект:** [FlightSaver](file:///c:/FlightSaver)  
**Ветка/Окружение:** Local Dev (`C:\FlightSaver`)  
**Статус готовности:** 🟢 100% готов к запуску в тестовом/разработческом контуре.

---

## 1. Сводная таблица компонентов

| Модуль | Технологии | Статус тестов / сборки | Доступные функции |
|---|---|---|---|
| **Backend API** | Python 3.12, FastAPI, Pydantic, httpx | ✅ 5/5 pytest PASS | Split-ticketing поиск, Transit STPC/TWOV, Supplier Hub (Amadeus, Duffel, Mystifly, TravelFusion, Mock), динамическая наценка, расчет валют, управление бронированиями. |
| **Frontend & API App** | Next.js 14+ (App Router), React 18, TypeScript 5.6 | ✅ 0 ошибок (tsc clean, build PASS) | Минималистичный AI-поиск (Google-style single input), Web Speech API голосовой ввод, карточки рейсов, STPC бейджи, прозрачный расчет цены, агентский чекаут бронирования. |
| **Pricing & STPC** | TypeScript, Zod, CurrencyConverter | ✅ 26/26 Node.js PASS | Изолированная модель ценообразования (Net + 1.5% FX + Fee), MCT Self-Transfer риск-анализ, Stopover матрица для 9 хабовых авиалиний. |
| **Журналы и регламенты** | Markdown, ADR | ✅ Актуализировано | Журнал решений [DECISIONS.md](file:///c:/FlightSaver/PROJECT%20JOURNAL%20TEMPLATES/DECISIONS.md), отчеты версий [Report_v1.md](file:///c:/FlightSaver/PROJECT%20JOURNAL%20TEMPLATES/Report_v1.md) — [Report_v5.md](file:///c:/FlightSaver/PROJECT%20JOURNAL%20TEMPLATES/Report_v5.md). |

---

## 2. Инструкция по локальному запуску

```powershell
npm run dev
```
- Web Application: [http://localhost:3000](http://localhost:3000)
