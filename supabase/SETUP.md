# Supabase setup

Follow these steps once, then drop the two values at the bottom into
`.env.local` and restart `npm run web`.

## 1. Create a project

1. Go to https://supabase.com and sign up / log in (GitHub auth is fastest).
2. Click **New project**.
3. Name it `hairtrack` (or whatever you like).
4. Set a database password — **save it in your password manager**.
5. Pick the region closest to you (`Central EU (Frankfurt)` is a good default for RU).
6. Click **Create new project**. Wait ~1–2 minutes for provisioning.

## 2. Run the schema

1. In the Supabase dashboard, open **SQL Editor** from the left sidebar.
2. Click **New query**.
3. Copy the whole content of `supabase/schema.sql` into the editor.
4. Click **Run** (or ⌘⏎). You should see `Success. No rows returned.`
5. Under **Table Editor** you should now see 5 tables:
   `profiles`, `procedures`, `procedure_logs`, `photos`, `journal_entries`.

> Safe to re-run: the schema is idempotent (`if not exists`, `or replace`).

## 3. Enable email auth (on by default)

Settings → Authentication → Providers → make sure **Email** is on.
No magic-link config needed — we use plain email + password for v1.

For **easier testing**, in Settings → Authentication → Providers → Email,
turn off "Confirm email" so accounts work immediately without verifying.
You can turn it back on before launch.

## 4. Grab your keys

Settings → API. Copy:

- **Project URL** — looks like `https://abcdefghijklmnop.supabase.co`
- **anon / public key** — very long JWT starting with `eyJ…`

## 5. Put them in `.env.local`

Create `hairtrack/.env.local` (gitignored):

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...your anon key...
```

Restart the dev server (`npm run web`) so Expo picks up the env vars.

## 6. Verify

1. Open the app → Settings tab.
2. Tap the top-most row ("Войти или создать аккаунт").
3. Create an account with any email (confirm it in your inbox if you kept email confirmation on).
4. Back in Settings, the row should now show your email — you're signed in.

## What's next (coming in subsequent commits)

- Sync the local state (procedures, journal, profile) up to Supabase when signed in.
- Pull any existing cloud state down on sign-in so a fresh device sees the user's history.
- Cloudflare R2 for the photo binaries (Supabase Storage works too but R2 is cheaper for bandwidth).
