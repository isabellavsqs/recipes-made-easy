# Prompt log: Feature 3 (team plan), Fridge photo recognition with Gemini

Issue: #54 · Branch: `Gemini-API` · Agent: Claude Code

## Prompts

**Prompt 1**
> I need your help to add a Gemini food identification API to a website my team is working on.

**Agent response (summary):** The agent checked its GitHub access, helped install Git and the GitHub CLI, confirmed write access to the repo, and cloned only the `Gemini-API` branch. I told it not to touch any other branch.

**Prompt 2**
> Please look at the plan in pull request #52 for what the Gemini API should do. BLUF: a user can upload a photo of the contents of their refrigerator or pantry and get an accurate list of the foods/ingredients they currently have. This list can then be used by other parts of the app or by the user as a quality of life feature.

**Agent response (summary):** The agent read feature 3 in TEAM-PLAN.md (PR #52) and the Single Dish code (`src/app/suggest/`, `src/lib/suggestion.ts`), and proposed a plan. It flagged that `npm install` and `.env.local` were still needed, and that `npm audit` reported a Next.js security patch (16.4.3 → 16.4.6). I decided to leave that upgrade to the team, so this branch doesn't change `package.json`.

**Prompt 3**
> Go ahead and write the code, we can deal with the supabase key and url later.

**Agent response (summary):** The agent built the feature:

- **Server** (`src/lib/gemini.ts`, `src/app/api/fridge-photo/route.ts`): `POST /api/fridge-photo` only works for logged-in users. It checks there are 1 to 3 JPG, PNG or WebP photos of 1 MB or less, sends them to Gemini's REST API with `GEMINI_API_KEY` and asks for a JSON list of foods. Nothing is saved. `GEMINI_MODEL` picks the model (default `gemini-3.5-flash-lite`). No new npm package was needed.
- **Single Dish** (`src/app/suggest/photo-scan.tsx`, `fridge-form.tsx`): a **Scan fridge or pantry photos** button under the text box, with the plan's privacy notice above it. Photos are shrunk in the browser to a JPEG of 1 MB or less. The foods join the list as normal chips, with the existing rules (no repeats, at most 30), and the user can remove or add items before searching.
- **Errors:** no key set, the daily free limit reached (Gemini answers 429), Gemini down, a photo the browser can't open, or no food found each show a friendly message. The list already typed stays, and typing still works.
- **Test** (`tests/fridge-photo.spec.ts`): the plan's test 3. The browser's request to `/api/fridge-photo` is answered inside the test, so it never calls Google.

**Prompt 4**
> Can you make and run a test that also fakes supabase values or is that not practical?

**Agent response (summary):** Faking Supabase isn't practical: every page and the photo endpoint check the login with Supabase, so the test would mostly test a copy of Supabase. Instead the agent added `tests/gemini.spec.ts`, which runs the Gemini code with fake Gemini answers and no keys at all (9 cases: foods found, model setting, no key, no food, blocked photo, daily limit, Gemini errors and garbled answers, no connection, list rules). All 9 passed. To make this possible, the Gemini code moved to `src/lib/gemini-core.ts`, and `src/lib/gemini.ts` re-exports it with the `server-only` guard that the app uses.

## Problems and decisions along the way

- **Route handler, not a server action:** Playwright can only intercept requests the browser makes. Calling our own `/api/fridge-photo` from the browser lets the test fix Gemini's answer, as the plan asks.
- **Shared rules:** the found foods go through the same `cleanFridge()` as typed items, so "tomatoes" and "tomato" aren't both added and the list stays at 30 or fewer.
- **iPhone HEIC photos:** browsers that can't open them show "Try a JPG or PNG" instead of failing silently.

## Still to do

- Check the free-tier limits and the model name in Google AI Studio.
- Run the app and the tests with a real `.env.local`.
- Phone-sized screen check, screenshots, and Karim's review (main path + edge case).
