# Реестр сопоставления и контракт UI (Агент 1)

## 1. Матрица файлов проекта и макетов Stitch

| № | Рабочий файл проекта | Исходник Stitch | Интерактивные элементы, формы и обработчики (STRICT FREEZE) |
|---|---|---|---|
| 1 | `src/app/globals.css`, `tailwind.config.ts` | `liquid_glass_sky/DESIGN.md` | Стили стекла: `.liquid-glass-card`, `.liquid-glass-pill`, `.subtle-glass`, `.ambient-bg`, `.specular-rim`. Токены цветов: `brand: { 50..700 }`. Тени: `liquid-glow`, `liquid-active`, `glass-elevated`, `glass-inner`, `btn-shine`, `voice-ring`, `pill-capsule`. |
| 2 | `src/components/Header.tsx` | `flightsaver_liquid_glass_3/code.html` (Header), `flightsaver_liquid_glass_1/code.html` (Header) | - Логотип `Link href="/"`<br>- Кнопка профиля `id="btn-user-avatar" onClick={toggleProfileDropdown}`<br>- Дропдаун профиля (`/dashboard`, `/dashboard?tab=orders`, `/dashboard?tab=history`, `handleLogout`)<br>- Кнопка входа `id="btn-user-login" onClick={openAuthModal}`<br>- Кнопка настроек `id="menu-button" onClick={openSettingsModal}` |
| 3 | `src/app/page.tsx` | `flightsaver_liquid_glass_3/code.html` (Hero, Ambient, Layout) | - Фоновые светорассеивающие сферы (`ambient-glow`)<br>- Hero-заголовок `t.headlineMain`, `t.headlineSub`, подсказка `t.heroVoiceHint`<br>- Баннер успеха бронирования (закрытие `onClick`)<br>- Секция `AIInputBar`<br>- Секция `QuickSuggestions`<br>- Секция `FlightResultsList`<br>- Подвал: `t.footerSupport`, `t.footerFares`, `t.footerCopyright` |
| 4 | `src/components/AIInputBar.tsx` + `VoiceButton.tsx` | `flightsaver_liquid_glass_3/code.html` (SearchCapsule), `flightsaver_liquid_glass_1/code.html` (Search Bar) | - Поле `input` (`value={query}`, `onChange`, `onKeyDown`, `placeholder`)<br>- Кнопка очистки `handleClear` (`onClick`)<br>- Кнопка голоса `VoiceButton` (`onToggle={toggleListening}`, анимация `isListening`)<br>- Кнопка поиска `button type="submit"` (`disabled={!query.trim() \|\| isLoading}`)<br>- Дропдаун автокомплита аэропортов/городов (навигация стрелками, клик `handleSelectPlace`) |
| 5 | `src/components/QuickSuggestions.tsx` | `flightsaver_liquid_glass_3/code.html` (AiConciergeZone) | - Баббл приветствия ИИ (`t.aiChatBadge`, `t.aiChatMessage`)<br>- Интерактивная карточка-подсказка 1 (`onClick={() => onSelectSuggestion(t.chatPrompt1Query)}`)<br>- Интерактивная карточка-подсказка 2 (`onClick={() => onSelectSuggestion(t.chatPrompt2Query)}`) |
| 6 | `src/components/FlightCard.tsx` | `flightsaver_liquid_glass_1/code.html` (Flight Cards) | - Бейджи тарифа, дат, класса каюты, багажа, STPC отеля, пассажиров<br>- Таймлайн вылета, пересадки и прилета (`fullRoutePath`)<br>- Блок опций STPC / Прямой выписки<br>- Кнопка раскрытия разбивки цены `onClick={() => setIsDetailsOpen(true)}`<br>- Главная кнопка выбора `onClick={() => onSelect(flight)}` |
| 7 | `src/app/results/page.tsx` | `flightsaver_liquid_glass_1/code.html` (Results Cockpit) | - Фильтры сортировки `cheap`, `fast`, `stpc`<br>- Фильтры пересадок `all`, `direct`, `1stop`, `stpc`<br>- Список карточек `FlightCard`<br>- Модалка `BookingModal` |
| 8 | `src/components/ConciergeChat.tsx` | `flightsaver_liquid_glass_1/code.html` (AI Concierge Panel) | - Поток сообщений пользователя и модели<br>- Индикатор «В сети • Анализирует 740 авиалиний»<br>- Поле быстрого ввода и кнопка отправки `sendMessage`<br>- Чипы быстрого уточнения |
| 9 | `app/dashboard/page.tsx`, `src/app/dashboard/orders/page.tsx` | `flightsaver_liquid_glass_2/code.html` (Личный кабинет) | - Кнопка возврата «Вернуться на главную» (`Link href="/"`)<br>- Статистика: Всего потрачено, Сэкономлено, Всего поездок<br>- 4-шаговый статус-трекер заказа (`pending` ➔ `processing` ➔ `confirmed` ➔ `ticketed`)<br>- Скачивание маршрутной квитанции PDF (`/api/receipts/[id]`)<br>- Ваучер отеля STPC |

---

## 2. Аудит зависимостей и токенов (Субагент 1)

1. **Иконки (lucide-react):**
   - Все необходимые иконки (`Gem`, `User`, `LogOut`, `LayoutDashboard`, `Ticket`, `History`, `LayoutGrid`, `Menu`, `ChevronDown`, `Sparkles`, `Mic`, `ArrowRight`, `X`, `Loader2`, `Bot`, `ArrowUpRight`, `Hotel`, `Clock`, `Info`, `ShieldCheck`, `Calendar`, `Briefcase`, `Users`, `CreditCard`, `TrendingUp`, `Plane`, `FileText`, `Download`, `Search`, `ArrowLeft`, `RotateCw`, `CheckCircle2`) присутствуют в установленном пакете `lucide-react`.
2. **Шрифты:**
   - `Plus Jakarta Sans` (для заголовков, цифр и акцентных бейджей) и `Inter` (для текста интерфейса и параметров перелета) подключаются через единый оптимизированный Google Fonts `@import` в `src/app/globals.css`.
3. **Tailwind Config:**
   - Требуется расширить `tailwind.config.ts`:
     - Цвета: палитра `brand` (50: `#f0f7ff`, 100: `#e0effe`, 200: `#bae0fd`, 400: `#38bdf8`, 500: `#0ea5e9`, 600: `#0284c7`, 700: `#0369a1`).
     - Тени: `liquid-glow`, `liquid-active`, `glass-inner`, `glass-elevated`, `btn-shine`, `voice-ring`, `pill-capsule`, `card-glass`, `glass-edge`.
