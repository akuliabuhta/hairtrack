# HairTrack landing & legal pages

Эта папка — публичный сайт HairTrack для App Store submission. Три
страницы:

- [`index.html`](index.html) — лендинг + поддержка + FAQ
- [`privacy.html`](privacy.html) — Политика конфиденциальности
- [`terms.html`](terms.html) — Условия использования

Содержимое privacy/terms полностью совпадает с экранами в приложении
(`app/privacy.tsx`, `app/terms.tsx`). При обновлении синхронизируй
обе версии.

---

## Деплой на GitHub Pages

1. Запушь репо на GitHub:
   ```bash
   cd "/Users/akulia/Claude Code/Hairtrack App/hairtrack"
   gh repo create hairtrack --private --source=. --remote=origin
   git push -u origin main
   ```
   (или вручную создай репо на github.com и `git remote add origin ...`)

2. На GitHub: **Settings → Pages**:
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/docs**
   - Save

3. Через 30–60 секунд получишь URL вида
   `https://akuliabuhta.github.io/hairtrack/`

4. Проверь, что открываются:
   - `https://akuliabuhta.github.io/hairtrack/`
   - `https://akuliabuhta.github.io/hairtrack/privacy.html`
   - `https://akuliabuhta.github.io/hairtrack/terms.html`

---

## Использование URL-ов в App Store Connect

После деплоя вписать в App Store Connect → **App Information**:

- **Privacy Policy URL:** `https://akuliabuhta.github.io/hairtrack/privacy.html`
- **Support URL:** `https://akuliabuhta.github.io/hairtrack/`
- **Marketing URL:** *(опционально, можно тот же)*
  `https://akuliabuhta.github.io/hairtrack/`

---

## Альтернатива: приватный репо без публикации кода

Если не хочешь публиковать исходники приложения, создай отдельный
**публичный** репо `hairtrack-site` с одной этой папкой:

```bash
cd "/Users/akulia/Claude Code/Hairtrack App/hairtrack/docs"
mkdir -p /tmp/hairtrack-site && cp -r . /tmp/hairtrack-site/
cd /tmp/hairtrack-site
git init && git add . && git commit -m "Initial landing"
gh repo create hairtrack-site --public --source=. --push
```

Затем на GitHub → Settings → Pages → main / root.

---

## Будущие улучшения (не блокируют submit)

- Купить домен `hairtrack.app` (~$10/год) и привязать через CNAME.
- Добавить `og:image` для красивых превью при шаринге.
- Sitemap.xml + robots.txt для индексации.
- Английская версия страниц (`/en/index.html`).
