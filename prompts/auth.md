# Prompt log: Feature 1, Sign up and login

Issue: #6 · Branch: `feature/auth` · Agent: Claude Code

## Prompts

**Prompt 1** (setup, after creating the Supabase project)
> 1. added a git-ignore folder and the project URL is inside. couldn´t find a public key. 2. I don´t want to turn off the e-mail confirmation. […]

**Agent response (summary):** The agent pointed out that a folder *named* `git-ignore` doesn't hide anything from Git (only a `.gitignore` file does), so the URL would have been uploaded with the next `git add .`. It moved the URL into `.env.local` and deleted the folder. It explained that Supabase renamed the "anon public" key to the **Publishable key** (Project Settings → API Keys). It also warned that Supabase's built-in email sender only delivers to project team members and a few emails per hour, so email confirmation would block the friend test and the Demo Day live sign up.

**Prompt 2**
> check now. also, about the e-mail authenticator, let´s not do that. let the user create a login without e-mail authentication (for now)

**Agent response (summary):** The agent verified the publishable key against Supabase and found the project still had email confirmation on (`mailer_autoconfirm: false`). That setting can only be changed in the dashboard, so it asked me to switch off "Confirm email". It then built feature 1 from the PLAN.md user story:

- Next.js 16 app (TypeScript, Tailwind) with the PLAN.md design colors and fonts
- `/signup` and `/login` pages with friendly messages for blank fields, short passwords, an existing email and a wrong password
- Log out button in the header
- `src/proxy.ts` refreshes the session on every request and sends logged-out visitors from `/home` to `/login`
- `supabase/migrations/001_users.sql`: a `public.users` table, filled automatically by a trigger on every sign up, with Row Level Security so each user can only read their own row

## Problems and decisions along the way

- **Plan vs. reality:** `users` has no `password_hash` column. Supabase Auth stores the hashed password in its own `auth.users` table (reality log #3).
- **Email confirmation:** I first kept it on, then turned it off after the agent explained the email limits (reality log #12 and #14).
- **Next.js 16 surprise:** the new project template turns on "Cache Components", which makes every page that reads the login cookie need extra loading boundaries. The agent turned it off, because every page here depends on the logged-in user anyway.
- **Next.js 16 rename:** "middleware" is now called "proxy" (`src/proxy.ts`).

## How it was checked

**Prompt 3**
> 2 steps done

**Agent response (summary):** After I turned off "Confirm email" and ran `001_users.sql` in the Supabase SQL Editor, the agent tested the flow:

- Two test accounts each got their own row in `users`. Each could read only their own row, and a logged-out request saw none (Row Level Security works).
- Through the real forms: blank fields and a 3-character password show friendly messages, a valid sign up lands on `/home`, and a logged-in user opening `/login` is sent to `/home`.
- Log out returns to `/login`, after which `/home` redirects to `/login` again.
- A wrong password, or an email with no account, shows "That email and password don't match." Logging back in works.
