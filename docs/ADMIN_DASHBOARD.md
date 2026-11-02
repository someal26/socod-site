# Socod admin dashboard: how it works and how to switch it on

_Written 31 Oct 2026. Nothing below has been done to the live project yet. Every step needs the founder's yes._

## What it is

A private page at `/admin/` on the Socod website. On a phone it shows:

- how many people use Socod, how many were active in the last 7 days and today, and new sign-ups
- a 30-day chart of active people per day
- app language split (Somali, English, Arabic) and how people unlock (walk/workout or promise)
- steps and workout minutes, groups and challenge sign-ups
- the latest in-app feedback (the "Send feedback" button arrives with app version 1.1)

Premium and tips are paid through Apple, so they are not in the database. Those numbers stay in
App Store Connect, under Sales and Trends.

## Why it is safe on a public website

The website is public on GitHub Pages, so the page itself holds **no data at all**. It only shows a
sign-in box. Numbers appear only after the Socod database checks three things on its own side:

1. you signed in with a real email account (the anonymous accounts every app user has are refused),
2. you typed the 6-digit code from your authenticator app (a password alone is not enough), and
3. your account is on the `socod_admins` list, which only you can edit in the Supabase SQL editor.

Other safeguards:

- The page shows totals only. It never shows names, emails or account ids.
- The browser holds only the public project address and the publishable key, which are meant to be
  public. No secret key is in the site, the app or this repo.
- The sign-in lives only in that browser tab and ends after 15 minutes without activity.
- The page loads no outside scripts and blocks connections to anything except the Socod database.
- Search engines are told not to list the page, and no public page links to it.

## Switching it on (founder steps, in this order)

The order matters: you link your authenticator app **before** your account is put on the admin list,
so nobody who might learn the password can link their own phone first.

1. **Approve the database update.** It is in `supabase/migrations/20261031180000_socod_admin_dashboard.sql`.
   It adds the admin list, the feedback table and five read-only functions. It changes and deletes nothing.
   Claude can apply it once you say yes, or you can paste it into the Supabase SQL editor for the "Socod" project.
2. **Make your admin account.** Supabase dashboard > Socod > Authentication > Users > Add user > Create new user.
   Use an email only you read and a long password saved in your password manager. Tick "Auto confirm user".
3. **Link your authenticator.** Open `https://someal26.github.io/socod-site/admin/` (after the pull request is
   merged), sign in, scan the QR code with Apple Passwords or Google Authenticator, and type the code. The page
   will then say the account is not on the admin list. That is expected.
4. **Check there is exactly one authenticator** on that user in Supabase (Authentication > Users > your user).
5. **Put yourself on the list.** In the SQL editor run (with your email):

   ```sql
   insert into public.socod_admins (user_id, note)
   select id, 'founder' from auth.users where email = 'YOUR-ADMIN-EMAIL' and not is_anonymous;
   ```
6. Reload the page, sign in, type the code, and the dashboard opens.

To remove someone later: `delete from public.socod_admins where user_id = '...';`

## Known limits

- GitHub Pages cannot send the header that stops other sites from framing a page. The page has no buttons
  that change anything, so the risk is low. A custom domain with proper headers would close it.
- Every site under `someal26.github.io` shares one web origin. That is why the sign-in is kept per tab and
  never in long-term browser storage.

## Tests

- `bun test`: page logic, the sign-in client against a fake server, and static security checks
  (no inline scripts, strict content policy, no secrets, nothing written as raw HTML).
- `bash tests/db/run.sh`: runs the migration twice on a throwaway local Postgres with demo data and
  checks 13 rules, including that signed-out visitors, anonymous app accounts, non-admins and admins
  without the 6-digit code are all refused, and that no personal data comes back.
