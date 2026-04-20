# Hairtrack — статус проекта

**Дата обновления:** 2026-04-20
**Состояние:** dev-сервер собирается, TypeScript чистый, 25 коммитов в `main`.
**Текущий блокер:** Apple Developer Program оплачен 2026-04-18, но enrollment ещё обрабатывается на стороне Apple (платёж подтверждён банком, Apple показывает «Purchase your membership»).

---

## ✅ Что уже работает

### Инфраструктура
- **Node.js 24 LTS** в `~/.local/node`, путь прописан в `~/.zshrc`
- **Expo SDK 54** + React Native 0.81 + React 19 + TypeScript 5.9
- **Git**, 25 коммитов, working tree чистый
- **EAS CLI** поставлен, `eas.json` настроен (development / preview / production профили, Supabase env уже вшиты)
- **app.json** с bundleId, разрешениями камеры/фото, плагинами `expo-image-picker`, `expo-notifications`, `expo-sqlite`, `datetimepicker`

### Облачный стек
- **Supabase** (`lib/supabase.ts`, `contexts/auth-context.tsx`, `app/auth.tsx`)
  - Проект: `https://dmfbqbglbhpcljuoxabd.supabase.co`
  - Auth: email magic-link, сессия персистится через AsyncStorage
  - Guest mode с баннером «данные остаются на устройстве»
  - SSR-guard для Node-контекста (не падает при pre-render)
- **Схема БД** (`supabase/schema.sql` + миграции 002–004)
  - `procedures`, `procedure_logs`, `photos`, `journal_entries`, `profiles`, `analyses`
  - RLS по `auth.uid()` на всех таблицах
  - Поддержка multi-kind процедур + target zones (голова/борода/брови)
- **Cloud sync** (`lib/sync.ts`)
  - Push на каждую мутацию, pull на sign-in
  - Ретраи отложенных загрузок фото при входе
  - Защита от non-UUID local IDs и wipe-on-empty-cloud
- **Cloudflare R2** (`supabase/R2-SETUP.md`)
  - Bucket `hairtrack-photos` (account `06d0fc59...`)
  - Edge-функции `photo-upload-url` / `photo-view-urls` — presigned URL, verify JWT, ownership-check по `storage_key`
  - CORS настроен под localhost + `*.exp.direct` (для Expo tunnel)
- **ИИ-анализ** (`supabase/functions/ai-analyze/index.ts`, `lib/ai-analyze.ts`)
  - Edge-функция: JWT-верификация → presigned GET из R2 → base64 → Claude Sonnet 4.5 Vision → clamp + нормализация → insert в `analyses`
  - Anthropic API key в Supabase secrets, в клиент не попадает
  - Возвращает: Norwood stage, Ludwig stage, density%, weak zone, asymmetry%, overall score, summary, recommendations[]

### Данные и состояние
- **`lib/types.ts`** — Procedure, ProcedureLog, Photo, JournalEntry, UserProfile, Analysis + мета-словари
- **`lib/storage.ts`** — AsyncStorage под namespace `@hairtrack/*/v1` + `exportAll()` / `clearAll()`
- **`lib/photos.ts`** — копирование в `documentDirectory/photos/`, идемпотентное удаление, web-фоллбэк
- **`lib/photo-upload.ts`** — очередь отложенных загрузок в R2, retry-логика
- **`lib/notifications.ts`** — расписание дневных локальных уведомлений, web-guard
- **`lib/alert.ts`** — кросс-платформенный `showAlert` (web fallback через confirm/alert)
- **`lib/articles.ts`** — список статей базы знаний
- **`lib/uuid.ts`** — sortable ID + `dayKey()`
- **`contexts/data-context.tsx`** — провайдер с типизированными хуками, persistence после каждой мутации

### Экраны
| Экран | Файл | Статус |
|---|---|---|
| Онбординг | `app/onboarding.tsx` | 4 шага, редирект на первый запуск, без бороды для женщин |
| Auth | `app/auth.tsx` | Sign-in / guest mode |
| Ежедневно | `app/(tabs)/index.tsx` | Лента ±15 дней, центрирование на «сегодня», процедуры/фото/журнал |
| Процедуры | `app/(tabs)/procedures.tsx` | Multi-kind + target zones, меню ⋯, системный share |
| Прогресс | `app/(tabs)/progress.tsx` | Фильтр по зонам, before/after слайдер, сетка 3×N |
| **Статьи** | `app/(tabs)/articles.tsx` + `app/article-detail.tsx` | **Новая вкладка**, база знаний |
| ИИ-анализ | `app/(tabs)/ai-analysis.tsx` | **Полностью рабочий**: выбор до 3 R2-фото → Claude → метрики + рекомендации + история |
| Настройки | `app/(tabs)/settings.tsx` | Экспорт, бэкап, уведомления, сброс |
| Форма лечения | `app/treatment-form.tsx` | Sticky-footer submit, Vikinord в примерах, multi-kind, target zones |
| Форма журнала | `app/journal-form.tsx` | Sticky-footer submit |
| Деталь фото | `app/photo-detail.tsx` | Зона + заметка + удаление |

### Компоненты и тема
- `components/ui/primary-button.tsx`, `section-card.tsx`, `screen.tsx`
- `components/before-after-slider.tsx` — PanResponder-слайдер
- `components/brand-mark.tsx` — логотип
- **Палитра:** orange→purple gradient (последний редизайн), `logo.png` вшит как брендовая марка
- `constants/theme.ts` — токены Colors/Radius/Spacing/Fonts, светлая и тёмная схемы

---

## ⏳ Блокеры и внешние зависимости

| Блокер | Статус | Что ждём |
|---|---|---|
| **Apple Developer Program ($99)** | 💳 оплачен 2026-04-18, ждём Apple | Должно активироваться в течение 48ч после оплаты. Если к 2026-04-21 висит — тикет в Apple Support |
| **Google Play ($25)** | ⏸ не оплачен | Когда дойдём до Android-релиза |
| **Финальная иконка** | ⏸ плейсхолдер «H» → сейчас `logo.png` | Дизайнер или Figma-макет для App Store резолюций |

Apple / Google нужны только для публикации в сторы. Локально через Expo Go / tunnel всё работает уже сейчас.

---

## 🐛 Тех-долг

1. **`updatePhoto` через delete+create** — в `DataContext` редактирование зоны/заметки удаляет старую запись и создаёт новую. Работает, но некрасиво. Заменить на честный `updatePhoto` (~10 строк).
2. **Только русская локализация** — все строки в JSX. Для EN/других нужен `i18n-js` или `react-i18next`.
3. **Widget в настройках декоративный** — настоящий iOS/Android home-widget требует нативного кода + EAS Build с кастомными модулями.
4. **Web не поддерживает уведомления и SQLite** — `Platform.OS === 'web'` early-return. На телефоне через Expo Go всё ок.

---

## 🚀 Команды

```bash
cd "/Users/akulia/Claude Code/Hairtrack App/hairtrack"

# Веб
npm run web                          # http://localhost:8081

# Expo Go на телефоне
npm run start                        # QR, localhost
npx expo start --tunnel              # через ngrok, для не-домашней сети

# Когда Apple Dev активируется:
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --profile preview --platform ios   # TestFlight-ready
```

---

## 📋 Что дальше

1. **Ждём Apple Developer** (макс 48ч от 2026-04-18) → `eas build --profile preview --platform ios` → TestFlight
2. **Пока ждём**: один из пунктов тех-долга (рекомендую `updatePhoto` — быстрый чистый рефакторинг)
3. **После TestFlight**: неделя-две беты на реальном устройстве, сбор фидбэка
4. **Перед публикацией**: финальная иконка + сплеш от дизайнера, проверка всех копирайтов / политики конфиденциальности
