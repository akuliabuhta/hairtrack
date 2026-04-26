# App Store Connect — метаданные HairTrack v1.0

Готовые тексты для каждого поля. Лимиты Apple указаны в `()`.
Дата подготовки: 2026-04-21.

---

## 1. Базовое

| Поле | Значение |
|---|---|
| App name (30) | `HairTrack` |
| Bundle ID | (см. `app.json` → `ios.bundleIdentifier`) |
| Primary category | Health & Fitness |
| Secondary category | Lifestyle |
| Age rating | 12+ (Infrequent/Mild Medical/Treatment Information) |
| Pricing | Free, no IAP |

---

## 2. Subtitle (30 chars)

**RU:** `Лечение волос: фото и ИИ` *(24 символа)*
**EN:** `Hair regrowth: photos & AI` *(26 символов)*

Альтернативы RU:
- `Прогресс волос с ИИ-анализом` (28)
- `Минoксидил и фото-прогресс` (26)

Альтернативы EN:
- `Track minoxidil & beard growth` (30)
- `Hair journey tracker with AI` (28)

---

## 3. Promotional Text (170 chars, можно менять без revisit)

**RU** *(165):*
> Фиксируйте процедуры по миноксидилу, финастериду, дермароллеру. Снимайте прогресс, сравнивайте «до/после» и получайте ИИ-анализ от Claude по фото головы.

**EN** *(165):*
> Track minoxidil, finasteride and dermaroller routines. Capture progress photos, compare before/after, and get AI analysis from Claude Sonnet on your scalp.

---

## 4. Description (4000 chars)

### RU

```
HairTrack — личный дневник лечения волос. Фиксируйте каждую процедуру,
снимайте прогресс по фото и видите динамику в одном приложении.

— ОТСЛЕЖИВАНИЕ ПРОЦЕДУР —
Добавьте свои лечения: миноксидил, финастерид, Vikinord, лосьоны,
дермароллер, шампуни, пептиды, массаж. Настройте частоту 1–4 раза в день
и получайте локальные напоминания в нужное время. На главном экране
видно, сколько процедур уже сделано сегодня и сколько осталось.

— ФОТО ПРОГРЕССА —
Снимайте макушку, линию роста, виски, бороду или брови — каждый снимок
сохраняется с датой и зоной. Все фото шифруются и доступны только вам.

— СЛАЙДЕР «ДО И ПОСЛЕ» —
Главный мотиватор: тяните бегунок и видите изменения за месяц, три, год.
Вручную выбирайте любую пару фото или используйте автоматический режим
(самое раннее vs последнее).

— ИИ-АНАЛИЗ —
Запустите анализ — модель Claude Sonnet оценит до 3 ваших фото и вернёт
структурированный отчёт: предполагаемая стадия Норвуда/Людвига, плотность,
самая слабая зона, асимметрия, общий health score 0–100, рекомендации.
Не диагноз, а ориентир для разговора с трихологом.

— ЖУРНАЛ —
Записывайте побочные эффекты, настроение, наблюдения. Со временем
получится живая картина того, как ваше тело реагирует на лечение.

— БАЗА ЗНАНИЙ —
Раздел «Статьи»: коротко по делу про основные действующие вещества,
циклы роста, типичные ошибки и режимы.

— СИНХРОНИЗАЦИЯ —
Войдите в аккаунт — данные синхронизируются между iPhone и iPad.
Без аккаунта всё работает локально, ничего не уходит в сеть.

— ПРИВАТНОСТЬ —
Мы не продаём данные, не показываем рекламу, не используем аналитику
поведения. Фотографии хранятся в защищённом облаке Cloudflare R2 и
доступны только по вашему JWT. Полный экспорт и удаление данных — в
один тап в Настройках.

ВАЖНО: HairTrack — не медицинский прибор. ИИ-анализ и рекомендации
носят информационный характер. Решения о лечении принимайте только
после консультации с врачом.
```

### EN

```
HairTrack is a personal hair regrowth journal. Track every treatment,
capture progress photos and see the trend — all in one app.

— TREATMENT TRACKING —
Add your routines: minoxidil, finasteride, lotions, dermaroller,
shampoos, peptides, scalp massage. Set frequency from 1× to 4× a day
and get local reminders at the right time. The home screen shows how
many treatments you've done today and what's left.

— PROGRESS PHOTOS —
Capture your crown, hairline, temples, beard or brows — every shot is
saved with its date and zone. All photos are encrypted and only
visible to you.

— BEFORE & AFTER SLIDER —
The motivator: drag the slider and see how your scalp changed over a
month, three, a year. Pick any pair manually or let the app default to
oldest vs newest.

— AI ANALYSIS —
Run an analysis — Claude Sonnet evaluates up to 3 of your photos and
returns a structured report: estimated Norwood/Ludwig stage, density,
weakest zone, asymmetry, overall health score 0–100, recommendations.
Not a diagnosis — a starting point for a conversation with a
trichologist.

— JOURNAL —
Log side effects, mood, observations. Over time you build a living
picture of how your body responds to treatment.

— KNOWLEDGE BASE —
Articles section with concise pieces on active ingredients, hair-growth
cycles, common mistakes and routines.

— SYNC —
Sign in to sync between iPhone and iPad. Without an account everything
runs locally — nothing leaves the device.

— PRIVACY —
We don't sell data, show ads, or run behavioural analytics. Photos
live in encrypted Cloudflare R2 storage, accessible only with your
JWT. One-tap data export and full reset in Settings.

IMPORTANT: HairTrack is not a medical device. AI analysis and
recommendations are informational. Make treatment decisions only after
consulting a doctor.
```

---

## 5. Keywords (100 chars, comma-separated, no spaces)

**RU** *(99):*
```
волосы,рост,миноксидил,финастерид,vikinord,дермароллер,борода,брови,трихолог,прогресс,лечение,фото
```

**EN** *(98):*
```
hair,regrowth,minoxidil,finasteride,dermaroller,beard,brows,scalp,tracker,trichology,norwood,ludwig
```

---

## 6. URL-ы (обязательные)

- **Support URL:** нужен реальный сайт. Минимум — одностраничник на GitHub Pages с email и FAQ. Заглушка: `https://github.com/<твой-логин>/hairtrack` (если публичный репо).
- **Privacy Policy URL:** тоже нужен публичный URL. Скопируй текст из `app/privacy.tsx` на сайт. Варианты: GitHub Pages, Notion (publish), карбон-страница.
- **Marketing URL:** опционально. Можно тот же лендинг, что и Support.

⚠️ Без публичных URL submit невозможен. Минимальное решение — выложить
один HTML с privacy + поддержкой на GitHub Pages за час.

---

## 7. Скриншоты

iPhone (iPhone 16 Pro Max — 6.9", 1320×2868):
1. Главный экран «Сегодня» с процедурами и стрик-счётчиком
2. Слайдер «До и после» в действии (нужна реальная пара фото)
3. Экран ИИ-анализа с примером результата
4. Список процедур с зонами
5. Прогресс-сетка с фото
6. Журнал с тегами симптомов

Required dimensions для App Store:
- 6.9" / 6.7" — обязательно
- 5.5" — обязательно для legacy iPhone
- iPad — если поддерживаешь

Сделать в Simulator: открой Xcode → Window → Devices and Simulators →
запусти симулятор → ⌘+S сохраняет скриншот в Desktop.

---

## 8. App Privacy секция (App Store Connect → App Privacy)

Apple спросит: какие данные собираешь, для чего, привязаны ли к личности.
Шпаргалка из `app/privacy.tsx`:

| Data Type | Linked to user? | Purpose |
|---|---|---|
| Email Address | Yes | App Functionality (auth) |
| User Content → Photos | Yes | App Functionality |
| User Content → Other (procedures, journal) | Yes | App Functionality |
| Health & Fitness → Health (опционально, если считаешь стадию волос как health) | Yes | App Functionality |
| Identifiers → User ID | Yes | App Functionality (Supabase JWT) |

Чего НЕ собираешь (отметить «No»): Location, Contacts, Browsing History,
Search History, Advertising Data, Diagnostics, Usage Data, Device ID
для трекинга.

Третьи стороны: Supabase (Firebase Functions equivalent), Cloudflare R2,
Anthropic. Они — обработчики данных, не контролёры. В App Store Connect
их декларировать не нужно отдельно, но в твоей privacy policy они
названы (см. `app/privacy.tsx`).

---

## 9. Что нового (Release Notes для v1.0)

```
Первый релиз HairTrack:
• Расписание процедур и локальные напоминания
• Фото прогресса по зонам с слайдером «до/после»
• ИИ-анализ от Claude Sonnet
• Журнал, статьи, синхронизация между устройствами
```

---

## 10. Checklist перед submit

- [ ] Финальная иконка (не плейсхолдер)
- [ ] Splash screen
- [ ] Все скриншоты в нужных разрешениях
- [ ] Support URL — публично доступный
- [ ] Privacy Policy URL — публично доступный
- [ ] App Privacy секция заполнена в App Store Connect
- [ ] TestFlight beta пройдена минимум один раунд
- [ ] Email `andreisharkk@gmail.com` действительно проверяется
- [ ] App.json bundleId совпадает с App Store Connect Bundle ID
- [ ] EAS Build production собран и загружен
