# App Store Connect → App Privacy: пошаговая шпаргалка

Apple задаёт многоступенчатую анкету о data collection. Этот файл —
точные ответы для HairTrack, чтобы заполнить за 15 минут вместо 2 часов
гадания.

Открыть: **App Store Connect → твоё приложение → App Privacy → Edit**.

---

## Шаг 0. Предварительный экран

> «Does this app collect data?»

**Ответ:** **Yes, we collect data from this app.**

(Любой логин = collect data. Даже если работаешь без логина, отправка
фото в R2 = collect data.)

---

## Шаг 1. Data Types — что собираем

Apple показывает чекбоксы со всеми возможными типами. Отмечай **только
эти**:

### ✅ Contact Info
- ☑️ **Email Address** — для входа в аккаунт через Supabase Auth.
- Остальное (Name, Phone, Physical Address, Other) — **не отмечать**.

### ✅ User Content
- ☑️ **Photos or Videos** — фото прогресса.
- ☑️ **Other User Content** — процедуры, журнал, заметки, теги симптомов.
- Остальное (Audio, Gameplay, Customer Support, Emails or Text) — **не отмечать**.

### ✅ Identifiers
- ☑️ **User ID** — Supabase JWT/UUID юзера.
- ☐ Device ID — **не отмечать** (мы его не сохраняем).

### НЕ собираем (оставляешь пустыми):
- ❌ Health & Fitness — мы не пишем в HealthKit. ИИ-анализ — это
  «User Content», не Health data в Apple-смысле. Если отметишь
  Health — Apple повысит age rating и попросит больше деклараций.
- ❌ Financial Info, Payment Info — нет платежей.
- ❌ Location — нет геолокации.
- ❌ Sensitive Info — нет.
- ❌ Contacts — нет доступа к адресной книге.
- ❌ Browsing History, Search History — нет.
- ❌ Purchases — нет IAP.
- ❌ Usage Data → Product Interaction / Advertising Data / Other
  Usage Data — мы не собираем аналитику.
- ❌ Diagnostics → Crash, Performance, Other — нет SDK типа
  Sentry / Crashlytics. Оставить пустым.

---

## Шаг 2. Для каждого выбранного типа — детальные вопросы

Apple проведёт по 4 типам отдельно. Для каждого спрашивает то же самое:

### Email Address

| Вопрос Apple | Ответ |
|---|---|
| Used for tracking? | **No** |
| Linked to the user? | **Yes** |
| Purpose | **App Functionality** *(только)* |

Объяснение: email привязан к идентичности (это и есть login). Не
используется для рекламы / межпрограммного трекинга.

### Photos or Videos

| Вопрос Apple | Ответ |
|---|---|
| Used for tracking? | **No** |
| Linked to the user? | **Yes** |
| Purpose | **App Functionality** *(только)* |

### Other User Content (процедуры/журнал)

| Вопрос Apple | Ответ |
|---|---|
| Used for tracking? | **No** |
| Linked to the user? | **Yes** |
| Purpose | **App Functionality** *(только)* |

### User ID

| Вопрос Apple | Ответ |
|---|---|
| Used for tracking? | **No** |
| Linked to the user? | **Yes** |
| Purpose | **App Functionality** *(только)* |

---

## Шаг 3. Tracking declaration

> «Does this app use data for tracking?»

**Ответ:** **No**.

Apple-определение «tracking»: связывание данных юзера/устройства из
твоего приложения с данными из чужих приложений / сайтов для рекламы
или передачи дата-брокеру. Мы этого **не делаем**:
- Нет Facebook SDK / Google Ads / TikTok pixel.
- Нет атрибуции installs (Adjust, AppsFlyer, Branch).
- Нет передачи данных третьим сторонам, кроме обработчиков (Supabase,
  Cloudflare R2, Anthropic) — а это **не tracking** в смысле Apple,
  это data processors.

---

## Шаг 4. Final review

Apple покажет сводку:

```
Data Linked to You:
  ✓ Email Address                     (App Functionality)
  ✓ Photos or Videos                  (App Functionality)
  ✓ Other User Content                (App Functionality)
  ✓ User ID                           (App Functionality)

Data Not Linked to You:
  (none)

Data Used to Track You:
  (none)
```

В UI App Store будет «Data Linked to You: Contact Info, User Content,
Identifiers».

Жми **Publish**.

---

## Frequently confused

### «А Anthropic / Cloudflare / Supabase нужно отдельно декларировать?»

**Нет.** Apple декларирует то, что *ты* собираешь как разработчик. Где
ты потом эти данные обрабатываешь (свой бэкенд, AWS, Supabase, R2,
Anthropic) — внутреннее дело при условии, что у тебя с ними соглашение
о processing (DPA). Все три названия упомянуты в твоей Privacy Policy
(`app/privacy.tsx`) — этого достаточно.

### «А ИИ-анализ — это Sensitive Personal Info?»

**Нет.** Sensitive Personal Info в App Privacy — это раса, религия,
политические взгляды, ориентация и т.п. Анализ волос — это User Content
(твоё фото и derived metadata).

### «Photos считаются Health data?»

**Нет, если не пишешь в HealthKit.** Health data в Apple-классификации
— это конкретные клинические/фитнес-метрики (heart rate, steps,
medical records). Фото головы не подпадает. Можно безопасно оставить
Photos в User Content и не трогать Health & Fitness.

### «А что если добавлю Sentry / Mixpanel позже?»

Перезаполнить эту секцию и **resubmit** apkнd update. Apple проверяет
несоответствие при review и может вернуть.

### «Что если работаю без аккаунта?»

В guest mode мы не собираем ничего, что уходит за устройство — только
локальные AsyncStorage записи. Apple-классификация: всё ещё «collect»
(данные на их девайсе твоим приложением), но без cloud upload это
«Data Not Collected» по строгому Apple-определению. Однако удобнее
оставить ту же декларацию (Linked, App Functionality) — она покрывает
оба режима. Нет смысла переключать App Privacy при каждом sign-out.

---

## Time estimate

15 минут чистого заполнения если идти по этому файлу.
30 минут если читаешь Apple-описания каждого варианта.

---

## После Publish

App Privacy «Nutrition Label» появится на твоей App Store странице
автоматически. Выглядит как:

```
Data Linked to You
   👤 Contact Info
   📷 User Content
   🆔 Identifiers

Data Used to Track You
   None
```

Это та самая «privacy label», которую видит юзер перед скачиванием.
