---
name: change-permissions
description: Change who can see or do what in Royal Club club mode (admin, trainee coach, viewer for players/parents), add a role, add a synced data table, or change the Supabase schema and row-level security. Use for any request about roles, accounts, access, privacy of children's data, or new data that must be shared through the club database.
---

# Changing roles, access or the club database

## Where access is defined: all four must agree

1. **`supabase/schema.sql`**: the real enforcement (row-level security). Everything else is convenience.
2. **`js/sync.js` → `ACCESS`**: which tables each role pulls (`read`) and pushes (`write`). A table missing from `read` never reaches that role's phone; pushing a table the database refuses makes the change silently revert on the next pull.
3. **`js/app.js` → `ROLE_CAN`, `NEEDS`, `can()`**: which screens and buttons each role sees. Hide what the database would refuse.
4. **`tests/e2e/club-mode.cjs` → `READ` / `WRITE`**: the fake Supabase used by the three-browser test.

Current model:

| | admin | coach (trainee) | viewer (player/parent) | pending / disabled |
|---|---|---|---|---|
| activities, plans | read + write | read | read | nothing |
| players | read + write | read | — | nothing |
| runs (sessions held, attendance) | all | read, insert, update | — | nothing |
| notes on children | all | read all, write/delete own (`created_by`) | — | nothing |
| profiles | all (not delete self) | own row | own row | own row |
| invites | all | — | — | — |

Non-negotiable: viewers never get children's data (players, runs, notes), not on screen and not in the device cache.

## Steps

1. **Edit `supabase/schema.sql`.** Keep it re-runnable (`create … if not exists`, `create or replace`, policies dropped and recreated by the loop near the top). New tables: `id text primary key, data jsonb, updated_at, updated_by`, add them to the `touch` trigger loop, enable RLS, add policies, and grant to `authenticated`, not `anon`. Use `public.app_role()` in policies. Policies on `profiles` must never query `profiles` directly (recursion); that's why `app_role()` is `security definer`.
2. **Add tests to `supabase/test/rls-test.sql`**, both what is allowed and what is refused. Refused inserts raise `insufficient_privilege`; refused updates and deletes affect 0 rows (check with `get diagnostics n = row_count`).
3. **`npm run test:db`.** Then prove the new test can fail: break the rule on purpose, run again and see the expected `ERROR: …`, then restore the rule and confirm `ALL RLS TESTS PASSED`.
4. **Mirror the change** in `ACCESS` (`js/sync.js`), `ROLE_CAN`/`NEEDS` and the views (`js/app.js`), and the fake server (`tests/e2e/club-mode.cjs`). New synced table: add it to `KINDS` in `js/sync.js`, to the state in `emptyState()` (`js/store.js`), to `mergeInto`, to the sign-out clearing in the `'sign-out'` action, and to the `normalize` list.
5. **Strings:** new role names need `role_<name>` and `roleHelp_<name>` in both languages (`js/i18n.js`), and the role in the `ROLES` list in `viewAccounts`.
6. **`npm test`**, then `npm start` and `node tests/e2e/club-mode.cjs`. Add checks there for the new behaviour, from each affected role's browser.
7. **Tell the user to re-run `supabase/schema.sql`** in Supabase → SQL Editor. The publishable key in `js/config.js` cannot change the schema. Then confirm it took effect with the `supabase-setup` skill's status checks.

## Accounts, for reference

- The admin creates accounts in the app: an `invites` row (email, role, name), then `auth.signUp` through a second client with `persistSession: false`, so the admin stays logged in. The trigger `handle_new_user` copies the invite's role into `profiles` and deletes the invite.
- Usernames become `<username>@cont.royalclub.ro` (`USERNAME_DOMAIN` in `js/config.js`). This needs **Confirm email** off in Supabase.
- Anyone signing up without an invite gets `pending` and sees nothing.
- Fully deleting a login, or resetting a password for a username account, happens in the Supabase dashboard (Authentication → Users). The app offers "Switched off" instead.
