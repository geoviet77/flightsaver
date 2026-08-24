# 📑 Аналитическая сводка: Состояние проекта FlightSaver (v1.0)

**Дата:** 2026-08-23  
**Проект:** [FlightSaver](file:///g:/Мой%20диск/Проект/FlightSaver)  
**Статус готовности:** 🟢 100% готов к запуску в тестовом/разработческом контуре.

---

## 1. Сводная таблица компонентов

| Модуль | Технологии | Статус тестов / сборки | Доступные функции |
|---|---|---|---|
| **Backend API** | Python 3.12, FastAPI, Pydantic | ✅ 12/12 pytest PASS | Split-ticketing поиск, Transit STPC/TWOV, Supplier Hub (Amadeus, Duffel, Mystifly, TravelFusion, Mock), динамическая наценка, расчет валют, управление бронированиями. |
| **Frontend App** | Next.js 16 (App Router), React 19, TypeScript | ✅ 0 ошибок (tsc clean) | Полный пользовательский путь: Поиск -> Результаты с фильтрами -> Детализация рейса и пересадок -> Бронирование -> Личный кабинет -> Авторизация/Регистрация. RU/EN локализация. |
| **Журналы и регламенты** | Markdown, ADR | ✅ Актуализировано | Журнал решений [DECISIONS.md](file:///g:/Мой%20диск/Проект/PROJECT%20JOURNAL%20TEMPLATES/DECISIONS.md), отчеты версий в [FlightSaver/Report_v1.0.md](file:///g:/Мой%20диск/Проект/FlightSaver/Report_v1.0.md). |

---

## 2. Инструкция по локальному запуску

### Запуск Backend (порт 8000)
```powershell
cd "g:\Мой диск\Проект\FlightSaver\backend"
$env:PYTHONPATH="."
.\venv\Scripts\uvicorn app.main:app --reload --port 8000
```
- Swagger API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### Запуск Frontend (порт 3000)
```powershell
cd "g:\Мой диск\Проект\FlightSaver\frontend"
npm run dev
```
- Web Application: [http://localhost:3000](http://localhost:3000)
