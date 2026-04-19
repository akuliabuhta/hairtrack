# Cloudflare R2 + Supabase Edge Functions — setup guide

All done via the Supabase dashboard (no CLI needed).

## 1. Add the R2 secrets to Supabase

The edge functions read the R2 credentials from Supabase secrets at
runtime. They NEVER end up in the app bundle.

1. Supabase dashboard → **Project Settings** → **Edge Functions** (left menu, under "Configuration")
2. Find **Secrets** → **Add new secret**
3. Add four secrets one by one (name → value):
   - `R2_ACCOUNT_ID` → `06d0fc592663860298ad356b169816d8`
   - `R2_BUCKET_NAME` → `hairtrack-photos`
   - `R2_ACCESS_KEY_ID` → (the **Access Key ID** you saved from the R2 API token)
   - `R2_SECRET_ACCESS_KEY` → (the **Secret Access Key** you saved — long string)

## 2. Deploy `photo-upload-url`

1. Supabase dashboard → **Edge Functions** (top-level left menu) → **Create a new function**
2. **Function name:** `photo-upload-url`
3. In the editor, paste the ENTIRE contents of
   `hairtrack/supabase/functions/photo-upload-url/index.ts`
4. Click **Deploy function**
5. After deploy, on the function's overview page click **Details** and:
   - **Verify JWT** should be **ON** (the default)

## 3. Deploy `photo-view-urls`

Same as above, but with name `photo-view-urls` and the content of
`hairtrack/supabase/functions/photo-view-urls/index.ts`.

## 4. Allow CORS on your R2 bucket

Back in Cloudflare dashboard → R2 → `hairtrack-photos` → **Settings** →
**CORS Policy** → replace the policy with:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:8081",
      "http://localhost:19006",
      "https://*.exp.direct"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Before launch, add your production domain to `AllowedOrigins`.

## 5. Quick smoke test (optional)

In Supabase dashboard → Edge Functions → `photo-upload-url` → **Invoke function** (Test tab). Body:
```json
{ "photoId": "11111111-2222-3333-4444-555555555555" }
```
Pass a valid `Authorization: Bearer <anon-key>` or a real user JWT.

With the anon key you'll get `invalid session` (expected — we require
a real user). With a real user JWT you'll get back:
```json
{
  "uploadUrl": "https://06d0fc592663860298ad356b169816d8.r2.cloudflarestorage.com/hairtrack-photos/users/...",
  "storageKey": "users/<uid>/11111111-2222-3333-4444-555555555555.jpg",
  "contentType": "image/jpeg",
  "expiresIn": 300
}
```

## 6. Use it from the app

After the two functions are deployed and CORS is set, reload
`http://localhost:8081` and add a new photo via the Daily screen.

In the browser console you should see no `[photo-upload]` errors and
the photo row in Supabase `photos` table will have a `storage_key`
like `users/<your-uid>/<photoId>.jpg` — that's the cloud copy.

To verify the cloud side: Cloudflare dashboard → R2 → `hairtrack-photos`
→ **Objects** — you'll see the file sitting in your bucket.

## Troubleshooting

- **"Failed to fetch" on PUT to R2** — CORS policy missing/wrong.
- **"invalid session"** — the function's `Verify JWT` toggle is off, or
  the app isn't sending the auth header. Our client always sends it
  through `supabase.functions.invoke`.
- **Edge function 500 with "R2 credentials not configured"** — secret
  name is misspelled. Copy exactly: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
  `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`.
