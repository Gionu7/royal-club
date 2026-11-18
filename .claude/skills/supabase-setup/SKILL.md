---
name: supabase-setup
description: Check or guide the setup of the Royal Club club database on Supabase — whether schema.sql is installed, whether email confirmation is off, whether the app can sign in, the first admin, the keep-alive job, and connection problems. Use when the user asks if club mode is ready, can't sign in, gives Supabase keys, or asks how to set up or move the database.
---

# Club database (Supabase)

Project: `https://avyjgyztpxrvkpwrvbql.supabase.co`. `js/config.js` holds the URL and the **publishable (anon) key**. That key is public by design and safe in the repo. It can read only what row-level security allows and cannot change the schema or auth settings. If a user offers a `service_role` / secret key, don't put it in the repo or the app; explain why.

## Check the status (read-only, takes seconds)

```bash
URL="$(grep -oP "SUPABASE_URL = '\K[^']+" js/config.js)"
KEY="$(tr -d '\n' < js/config.js | grep -oP "SUPABASE_ANON_KEY =\s*'\K[^']+")"
# 1. schema installed? 200 with "1" = yes; 404 PGRST202 = schema.sql not run yet
curl -sS -X POST "$URL/rest/v1/rpc/ping" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d '{}'
# 2. auth settings: need "disable_signup": false and "mailer_autoconfirm": true (= Confirm email OFF)
curl -sS "$URL/auth/v1/settings" -H "apikey: $KEY"
# 3. logged-out visitors see nothing: expect 401/permission denied once the schema is in (404 PGRST205 = no tables yet)
curl -sS "$URL/rest/v1/plans?select=id&limit=1" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
```

Then `npm start` and `npm run e2e:real` (real login screen, wrong password refused). With a real test account: `E2E_LOGIN=… E2E_PASSWORD=… npm run e2e:real`. Never ask the user to paste a password into the chat; ask them to run it themselves, or to create a throwaway test account and delete it afterwards.

**Network in Claude cloud sessions:** a `CONNECT tunnel failed, response 403` means the environment's network policy blocks the host. The personal environment `royal-club` allows `avyjgyztpxrvkpwrvbql.supabase.co`. `cdn.jsdelivr.net` (where the browser loads supabase-js) may be blocked; `e2e:real` can use a local `@supabase/supabase-js@2.45.4` from npm instead.

## Setup steps the user does in the Supabase dashboard

1. **SQL Editor → New query →** paste all of `supabase/schema.sql` → **Run**. It's safe to re-run after every schema change.
2. **Make the first admin** (new query, their email):
   `insert into public.invites (email, role, name) values ('their@email', 'admin', 'Name');`
3. **Authentication → Users → Add user → Create new user**, with the same email, a password and **Auto Confirm User** ticked. The signup trigger makes them admin from the invite.
4. **Authentication → Sign In / Providers → Email:** turn **Confirm email** OFF (username accounts can't receive email). Keep **Allow new users to sign up** ON (the app creates accounts by signing them up; uninvited sign-ups get `pending` and see nothing).
5. **Deploy:** set `CLUB_MODE = true` in `js/config.js` (it is `false` while the club runs without login), then merge into `main` with GitHub Pages on (Source: GitHub Actions). The URL and key come from `js/config.js`; the GitHub variables `SUPABASE_URL` / `SUPABASE_ANON_KEY` override them if set.
6. **Move existing data:** sign in as admin on the old phone → *Settings → Upload this device's data to the club*, or restore a backup file.

Only the user can do steps 1–4, unless they give a Supabase **personal access token** for the Management API (`api.supabase.com`). That's a powerful secret: ask for it only through the session's credential form, never in chat, and only if they prefer that to doing it themselves.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| ping 404 `PGRST202`, tables 404 `PGRST205` | `schema.sql` not run (or run in a different project) |
| Created account can't sign in, "Email not confirmed" | Confirm email is still on: step 4 |
| Admin signs in but sees "Waiting for approval" | Their profile has no role: the invite was missing or had another email. Fix in SQL: `update public.profiles set role = 'admin' where email = '…';` |
| "User already registered" when creating an account | They have a login already; the app gives the existing profile the new role |
| Sign-ups fail after many accounts in a row | Supabase auth rate limits; wait a few minutes |
| App works but nothing syncs, badge red | A table or policy is missing: re-run `schema.sql`, then check the browser console |
| Project paused | Free projects pause after 7 days unused. `.github/workflows/keepalive.yml` pings every 3 days; restore the project in the dashboard if it already paused |
