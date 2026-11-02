# Prompt log: The 2 tests

Issue: #24 · Branch: `tests` · Agent: Claude Code

I created the Issue and the branch myself. I'm only using `feature/` for branches that build new features.

## Prompts

**Prompt 1**
> issue created and branch created (only 'tests'). the syntax 'feature' will only be used for building new features specifically

**Agent response (summary):** The agent saved my branch-naming rule, checked that the `tests` branch started from the latest `main`, and wrote the two tests from PLAN.md §4 with **Playwright Test**. They drive a real browser through the real pages, against the real Supabase project.

- **Test 1, data isolation** (`tests/data-isolation.spec.ts`): *This test creates two users, adds and stars a recipe for User A, logs in as User B, and checks that User B's list, starred view and direct link to A's recipe show nothing.* It checks that B's My Recipes says "No recipes yet" with no cards, that B's Starred tab says "No starred recipes yet", and that opening A's recipe link returns a 404 "Page not found" without A's title anywhere. Afterwards, A deletes the test recipe.
- **Test 2, dashboard** (`tests/dashboard-starred.spec.ts`): *This test creates a user, stars three recipes, opens the dashboard, and checks that the number of starred recipes shows 3.* It also checks that a brand-new user starts at 0.
- `npm test` runs both. `playwright.config.ts` starts the app if it isn't running. Each run creates new `test-…@example.com` accounts.

Then it did **red, then green** for each test: it broke the app on purpose, ran the test and took a screenshot of the failure, undid the break, and ran the test again.

## Red, then green

**Test 1**
- **Break:** removed `.eq("created_by_user_id", user.id)` from the My Recipes query (`src/lib/recipes.ts`).
- 🔴 **Red:** "No recipes yet" not found. B's My Recipes listed **30 recipes**, which were the shared library, **not** A's private recipe. The database's Row Level Security still hid A's recipe, so the app's filter is one layer and the database is a second one. Screenshots: `docs/screenshots/tests/test1-red-summary.png`, `test1-red-details.png`, `test1-red-what-B-saw.png`.
- 🟢 **Green** after undoing the break: `test1-green-summary.png`.

**Test 2**
- **First try, PLAN.md's break:** removed the user filter from the dashboard's stars query, which counts everyone's stars. It stayed **green** (still 3), because the database only returns my own stars. Screenshot: `test2-plan-break-still-green-summary.png`.
- **Break used for red:** the "Starred recipes" tile showed my recipe count instead of my star count, like a copy-paste mistake between two tiles side by side.
- 🔴 **Red:** expected "3", received "0". Screenshots: `test2-red-summary.png`, `test2-red-details.png`, `test2-red-dashboard.png`.
- 🟢 **Green** after undoing the break: `test2-green-summary.png`. Both tests together: `both-green-summary.png`.

## What would break it

- **Test 1:** if the My Recipes query stopped filtering by the logged-in user, User B would see recipes that aren't theirs (the whole shared library). If, on top of that, the database's "read seed or own recipes" rule were loosened, B would see A's private recipe.
- **Test 2:** if the "Starred recipes" number were taken from the wrong list (for example the count of my own recipes instead of my stars), it would show 0 instead of 3. Counting all users' stars wouldn't break it, because the database only returns my own.

## Bugs found

- **Redirect loop (real bug, fixed in this PR):** on the first red run, User A's browser failed with "too many redirects" during clean-up.
  - **What was wrong:** two different checks decided whether I was logged in. The quick check before each page (`src/proxy.ts`) only reads the login cookie. The page asks Supabase. When they disagreed, the page sent me to `/login` and the quick check sent me back to `/home`, forever. That happens if I log out in one tab while another tab still has the old cookie, or if Supabase can't be reached for a moment. The internet connection was flaky right then; the dev server couldn't reach Google Fonts either.
  - **How it was confirmed:** a browser kept a copy of a login cookie, then the session was logged out elsewhere. With the old code, `/home`, `/login` and `/dashboard` all failed with "too many redirects". With the fix, all three go to the login page.
  - **The fix:** the quick check now only sends logged-out visitors to `/login`. The login and signup pages send logged-in users to `/home` themselves, using the same Supabase check every page uses. If Supabase can't be reached, pages now show "Something went wrong, try again" (`src/app/error.tsx`) instead of treating me as logged out, and the header falls back instead of breaking the page. Logged as reality log #35.
- **Test mistakes (not app bugs):**
  - The clean-up at the end of Test 1 could hide the real failure: Playwright reported the clean-up error instead. Clean-up errors are now only logged.
  - In an extra login check, the script waited for a hidden screen-reader "alert" from Next.js instead of the error message, and typed the password while the first login attempt was still running.

## How it was checked

| Check | Result |
|---|---|
| `npm test` (both tests) | ✅ 2 passed |
| Test 1 red / green | 🔴 B saw 30 library recipes → 🟢 after undoing |
| Test 2 with PLAN.md's break | 🟢 still 3 (the database protects it) |
| Test 2 red / green | 🔴 "0" instead of "3" → 🟢 after undoing |
| Old code with a logged-out cookie | ❌ "too many redirects" on /home, /login, /dashboard |
| New code with a logged-out cookie | ✅ all go to the login page |
| Login basics again: logged-out redirects, wrong password message, logged-in users skip /login and /signup, log out | ✅ |
| Build and lint | ✅ |
