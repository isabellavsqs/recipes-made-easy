# Recipes Made Easy

A personalized recipe website for busy students and professionals: save your own recipes, plan the week's meal prep and find out what to cook with what's already in your fridge. Your diet, allergies, dislikes, appliances and budget are saved once and checked before anything is recommended.

**Live app:** https://recipes-made-easy-vercel.vercel.app/ (sign up with any email; no confirmation email is sent)

## What it does

| Page | What you can do |
|---|---|
| **Sign up / Log in** | Create your own account. Everything you save is private to you. |
| **Onboarding** (right after sign up) | 7 short questions: goals, diet, allergies, dislikes, appliances, budget and where to start. Change them later on **Profile**. |
| **Meal Prep** | Pick servings, days, cooking time and budget, and get a plan: which recipes to cook, how much of each, which days they cover, plus one shopping list. Plans are saved. |
| **Single Dish** ("What can I cook?") | Type what's in your fridge and whether you can shop. You get "Our pick" and other recipes ready to cook. If you can shop, also recipes that need a few extra items, with what to buy. |
| **Browse** | The shared library of 30 recipes from around the world. Recipes with your allergens, or that don't fit your diet, are hidden. |
| **My Recipes** | Add, view, edit and delete your own recipes (with checks for missing or wrong fields). **All** shows your recipes plus the ones you starred; **Starred** shows only starred ones. |
| **Search and filters** | On Browse, My Recipes and Starred: search by name or ingredient, filter by cuisine, diet, cost and total time, and sort. |
| **Dashboard** | Your recipes, starred recipes and meal plans, and a chart of your cookbook by cuisine. |

Spices, oils, butter, salt and a few other staples are assumed to be in every kitchen, so they're never on the "to buy" lists.

**Known limits:** allergen tags were added by hand, so always check the ingredients yourself (the app doesn't show this warning yet). Costs are rough brackets per meal, per person ($ is $0–5, $$ is $5–10, $$$ is more than $10), not real prices. The Instagram import from the plan was cut.

## Project documents

- [PLAN.md](PLAN.md): the original plan, with a **Plan vs. Reality** table at the end (§8)
- [schema.md](schema.md): the database tables, who can see what, and how they differ from the plan
- [notes/reality-log.md](notes/reality-log.md): every change from the plan, with who decided and why
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
   ```
4. In the Supabase SQL Editor, run each file in [`supabase/migrations/`](supabase/migrations/) in order.
   `003_recipe_library.sql` loads the 30 shared recipes. It's generated from [`supabase/seed/library.json`](supabase/seed/library.json): after changing the JSON, run `node scripts/build-library-sql.mjs` and run the new SQL again (it skips rows that already exist).
5. Start the app:
   ```bash
   npm run dev
   ```
   Then open http://localhost:3000.

## Run the tests

The two tests in [`tests/`](tests/) (described in [PLAN.md](PLAN.md) §4) drive a real browser against the app:

- **Test 1, data isolation** ([`data-isolation.spec.ts`](tests/data-isolation.spec.ts)): User B can't see User A's recipe, star or recipe page.
- **Test 2, dashboard** ([`dashboard-starred.spec.ts`](tests/dashboard-starred.spec.ts)): after starring 3 recipes, the dashboard's "Starred recipes" shows 3.

```bash
npx playwright install chromium   # first time only
npm test                          # starts the app if it isn't running
npx playwright show-report        # optional: open the results in a browser
```

The tests use the Supabase project from `.env.local` and create new accounts named `test-…@example.com` on every run.
