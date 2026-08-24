# Duo Forge Games — Deployment Guide

## 1. Supabase setup (one-time)

### Apply the schema

Open the [Supabase SQL editor](https://supabase.com/dashboard/project/kdefgqkvwmfdpvuuvslw/sql), paste the contents of `db/schema.sql`, and run. The script is idempotent — safe to re-run whenever new tables/buckets are added (e.g. `site_legal`, `site_announcement`, `site_press_kits`, `site_press_screenshots`, `site_game_page_blocks`, `site_featured_game`, the `more_info_enabled` column on `site_projects`, and the `press-kit-assets` storage bucket which is also reused for Game Info Page images).

Or via CLI: `supabase link --project-ref kdefgqkvwmfdpvuuvslw` then paste through `psql`.

### Set edge-function secrets

Generate a JWT signing secret once and keep it safe:
```bash
openssl rand -hex 48
```

Then in **Supabase Dashboard → Project Settings → Edge Functions → Secrets** (or via CLI `supabase secrets set KEY=VALUE …`), set:

| Name | Value |
|---|---|
| `ADMIN_PASSWORD` | `DuoForgeFragoutStudio2026!` |
| `ADMIN_JWT_SECRET` | (the openssl output above) |
| `SMTP_HOST` | `smtp.ionos.de` |
| `SMTP_PORT` | `465` |
| `SMTP_SECURE` | `true` |
| `SMTP_USER` | `info@duoforgegames.com` |
| `SMTP_PASS` | `131926Julianek!` |
| `SMTP_FROM` | `info@duoforgegames.com` |
| `CONTACT_RECIPIENT` | `info@duoforgegames.com` |
| `ALLOWED_ORIGINS` | `https://duoforgegames.com,https://www.duoforgegames.com,http://localhost:8080` |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically — do not set them yourself.

### Deploy the edge functions

```bash
supabase functions deploy admin-login --no-verify-jwt
supabase functions deploy admin-write --no-verify-jwt
supabase functions deploy contact-send --no-verify-jwt
```

`--no-verify-jwt` is required — we authenticate with our own admin JWT, not with a Supabase user session.

## 2. Frontend build

```bash
bun install
bun run build
```

Output is in `dist/`. It contains only the public anon key + Supabase URL. Service role, admin password, JWT secret, and SMTP credentials never appear in the bundle.

## 3. nginx

Copy `dist/` to your server (e.g. `/var/www/duoforge`):

```nginx
server {
    listen 443 ssl http2;
    server_name duoforgegames.com www.duoforgegames.com;

    ssl_certificate     /etc/letsencrypt/live/duoforgegames.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/duoforgegames.com/privkey.pem;

    root /var/www/duoforge;
    index index.html;

    location /assets/ {
        try_files $uri =404;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback — every unmatched route serves index.html
    location / {
        try_files $uri /index.html;
    }
}
```

## 4. Admin access

Visit `https://duoforgegames.com/admin` — not linked anywhere on the site and blocked in `robots.txt`. Enter the admin password. The session token lives in `sessionStorage` (cleared on tab close, expires after 8 h).

## 5. What still needs your input

- **Imprint page** (`src/pages/Imprint.tsx`) — replace the `[…]` placeholders with your actual legal address & responsible person before publishing.
- **Privacy policy** (`src/pages/Privacy.tsx`) — generic template, have a lawyer review before publishing.
- **Header/footer links** — the header nav is currently hardcoded scroll anchors (Home / Our Forge / About / Contact) plus the Discord button. Footer has Imprint + Privacy. The `site_header_links` / `site_footer_links` tables exist and are editable from the admin panel, but nothing renders them yet — tell me if/how you want to wire them in (e.g. replace the anchors, or add an extra row).

## 6. Skin Creator (/skincreator)

1. Re-run `db/schema.sql` in the Supabase SQL editor — it adds `weapon_categories`, `weapons`,
   `skin_submissions` (+ RLS, grants and the 7 default categories).
2. Re-deploy `admin-write` (it now whitelists the new tables and the `weapon_template` upload kind).
3. Deploy the preview upload endpoint on the IONOS VPS — see `server/skincreator-upload/server.js`
   for the ready-to-run Express service and the nginx snippet. Point the frontend at it via
   `VITE_SKIN_UPLOAD_ENDPOINT` in `.env` (default `https://duoforgegames.com/api/skin-upload`).
4. Manage weapons/templates and moderate submissions at `/skincreator/admin` (same admin password).

## Skin Creator player accounts (update)

1. Run the new SQL at the end of `db/schema.sql` (table `skin_creator_users`, `skin_submissions.user_id`, updated insert policy).
2. Deploy the new edge function: `supabase functions deploy skin-auth`
3. Optional secret: `SKIN_JWT_SECRET` (falls back to `ADMIN_JWT_SECRET` if unset).

## Skin Creator password reset (update)

1. Run the new SQL at the end of `db/schema.sql` (columns `email`, `reset_token_hash`,
   `reset_token_expires_at` on `skin_creator_users`).
2. Redeploy the edge function: `supabase functions deploy skin-auth`
3. No new mail service needed, the reset mail is sent over the existing IONOS SMTP
   secrets (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`).
4. Optional secret `SITE_URL` (defaults to `https://duoforgegames.com`) controls the
   domain used in the reset link.

## Skin Creator saved palettes (update)

Symptom `Unknown op: save_palette` means the deployed edge function is older than the code.

1. Run the `skin_creator_palettes` block from `db/schema.sql` in the SQL editor
   (table, index, grants, RLS policy).
2. Redeploy the function: `supabase functions deploy skin-auth --no-verify-jwt`
3. Reload `/skincreator` and try saving a palette again while signed in.

