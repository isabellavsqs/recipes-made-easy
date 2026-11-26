# Recipes Made Easy

A personalized recipe website for busy students and professionals: save your own recipes, plan the week's meal prep and find out what to cook with what's already in your fridge. Your diet, allergies, dislikes, appliances and budget are saved once and checked before anything is recommended.

## Team Members:
Lead: Isabella Vasques

Austin Schmid

Karim Osman

[TEAM MEMBER 4]

**Live app:** https://recipes-made-easy-vercel.vercel.app/ (sign up with any email; no confirmation email is sent)

## What it does

| Page | What you can do |
|---|---|
| **Sign up / Log in** | Create your own account. Everything you save is private to you. |
| **Onboarding** (right after sign up) | 7 short questions: goals, diet, allergies, dislikes, appliances, budget and where to start. Change them later on **Profile**. |
| **Meal Prep** | Pick servings, days, cooking time and budget, and get a plan: which recipes to cook, how much of each, which days they cover, plus one shopping list. Plans are saved. |
| **Single Dish** ("What can I cook?") | Type what's in your fridge, or scan up to 3 fridge or pantry photos to fill the list for you, and say whether you can shop. You get "Our pick" and other recipes ready to cook. If you can shop, also recipes that need a few extra items, with what to buy. |
| **Browse** | The shared library: 30 recipes collected by hand plus 300 from [TheMealDB](https://www.themealdb.com), from 58 cuisines. Recipes with your allergens, or that don't fit your diet, are hidden. |
| **My Recipes** | Add, view, edit and delete your own recipes (with checks for missing or wrong fields). **All** shows your recipes plus the ones you starred; **Starred** shows only starred ones. |
| **Search and filters** | On Browse, My Recipes and Starred: search by name or ingredient, filter by cuisine, diet, cost and total time, and sort. |
| **Dashboard** | Your recipes, starred recipes and meal plans, and a chart of your cookbook by cuisine. |

**Fridge photos:** photos are shrunk in your browser, sent through our server to Google's Gemini API, and never saved by the app. Google may use them to improve its products, so keep people and personal information out of the picture. Check the list before searching: Gemini can miss or misread items. If scanning is unavailable or the daily free limit is reached, you can still type your list.

Spices, oils, butter, salt and a few other staples are assumed to be in every kitchen, so they're never on the "to buy" lists.

**Recipes from TheMealDB:** TheMealDB gives the title, ingredients, amounts, instructions and photo. Servings, times, costs, appliances, diet tags and allergens were estimated by the coding agent (from the original recipe page when it had them), and the instructions were reworded. Each recipe page credits TheMealDB and links to the original. Photos load from TheMealDB; if one can't load, the recipe shows a colored panel with its first letter.

**Known limits:** servings, times, costs, diet tags and allergens are estimates, and the website says so on every recipe page, Browse, Single Dish and Meal Prep: always check the ingredients yourself. Costs are rough brackets per meal, per person ($ is $0–5, $$ is $5–10, $$$ is more than $10), not real prices. The Instagram import from the plan was cut.

## Project documents

- [PLAN.md](PLAN.md): the original plan, with a **Plan vs. Reality** table at the end (§8)
- [schema.md](schema.md): the database tables, who can see what, and how they differ from the plan
- [TEAM-PLAN.md](TEAM-PLAN.md): the team plan for the four API features and the servings adjuster
- [notes/reality-log.md](notes/reality-log.md): every change from the plan, with who decided and why
- [notes/themealdb-review.md](notes/themealdb-review.md): the flagged TheMealDB recipes and the allergen spot-check, reviewed before migration 006 is run
- [written-reflection.md](written-reflection.md): my reflection on Plan vs. Reality and the stranger test
- [prompts/](prompts/): the prompts I gave the coding agent for each feature, its answers and the bugs found
- [docs/screenshots/](docs/screenshots/): screenshots of each feature and of the tests

## Tech stack

- **Next.js 16** (React, TypeScript) for the pages and server logic
- **Supabase** for the PostgreSQL database and sign up / login
- **Tailwind CSS** for styling
- **Recharts** for the dashboard chart
- **Playwright** for the end-to-end tests
- **Vercel** for hosting
- Built with **Claude Code**, one Issue → branch → pull request per feature

## Run it locally

1. Install [Node.js](https://nodejs.org) 20 or newer.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file in the project root with your Supabase project's values (Project Settings → API Keys):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your publishable key>
   GEMINI_API_KEY=<your Gemini key, from Google AI Studio>
   GEMINI_MODEL=gemini-3.5-flash-lite
   ```
   The Gemini lines are only needed for fridge photo scanning. Keep `GEMINI_API_KEY` server-only: never commit it and never give it a `NEXT_PUBLIC_` prefix. On Vercel, add both under Settings → Environment Variables.
4. In the Supabase SQL Editor, run each file in [`supabase/migrations/`](supabase/migrations/) in order.
   `003_recipe_library.sql` loads the 30 shared recipes. It's generated from [`supabase/seed/library.json`](supabase/seed/library.json): after changing the JSON, run `node scripts/build-library-sql.mjs` and run the new SQL again (it skips rows that already exist).
   `006_themealdb_recipes.sql` loads the TheMealDB recipes (about 400 KB; paste it all into one query). It's generated from [`supabase/seed/themealdb.json`](supabase/seed/themealdb.json) and is also safe to run again. To rebuild it, run these in order (Node 22 or newer):
   ```bash
   node scripts/themealdb/fetch.mts     # downloads TheMealDB, letter by letter (26 requests)
   node scripts/themealdb/prepare.mts   # picks the 300 and converts names, amounts and tags
   node scripts/themealdb/sources.mts   # reads servings and times from the original pages
   node scripts/themealdb/build.mts     # adds the estimates and the review, writes the seed and the SQL
   ```
   The agent's estimates are in [`scripts/themealdb/estimates/`](scripts/themealdb/estimates/) and Isabella's review decisions in `scripts/themealdb/review.json`.
5. Start the app:
   ```bash
   npm run dev
   ```
   Then open http://localhost:3000.

## Run the tests

The tests in [`tests/`](tests/) (described in [PLAN.md](PLAN.md) §4 and the team plan §5) drive a real browser against the app:

- **Test 1, data isolation** ([`data-isolation.spec.ts`](tests/data-isolation.spec.ts)): User B can't see User A's recipe, star or recipe page.
- **Test 2, dashboard** ([`dashboard-starred.spec.ts`](tests/dashboard-starred.spec.ts)): after starring 3 recipes, the dashboard's "Starred recipes" shows 3.
- **Test 3, fridge photo** ([`fridge-photo.spec.ts`](tests/fridge-photo.spec.ts)): with "onion" already listed and a photo read as onion, chicken thighs and rice, removing rice and searching uses onion and chicken thighs once each. Gemini's answer is fixed inside the test, so it never calls Google or uses the free limit.
- **Test 1 (team plan), 300 recipes** ([`themealdb.spec.ts`](tests/themealdb.spec.ts)): TheMealDB's answer for one recipe with parmesan and one with no dairy is fixed inside the test. The import tags only the first with Milk, the seed file matches, and a new user with a Milk allergy sees only the dairy-free one on Browse. It needs migration 006.
- **Gemini server code** ([`gemini.spec.ts`](tests/gemini.spec.ts)): feeds the Gemini code fake answers (foods found, no food, blocked photo, daily limit, outage, garbled answer, no key) and checks the list or the friendly error it returns. It needs no browser, Supabase or Gemini key.

```bash
npx playwright install chromium   # first time only
npm test                          # starts the app if it isn't running
npx playwright show-report        # optional: open the results in a browser
```

The tests use the Supabase project from `.env.local` and create new accounts named `test-…@example.com` on every run.
