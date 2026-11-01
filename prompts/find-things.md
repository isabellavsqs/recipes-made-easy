# Prompt log: Feature 6, Find things

Issue: #19 · Branch: `feature-6-find-things` · Agent: Claude Code

I created the Issue and the branch myself on GitHub.

## Prompts

**Prompt 1** (after merging PR #20)
> I logged in vercel but can´t see anything.

**Agent response (summary):** My screenshot showed the old feature 1 home page ("Your recipes, meal plans and dashboard will live here"). The agent checked GitHub and found that no commit had ever had a Vercel build. It also found a second, private repo, `recipes-made-easy-vercel`, with a single "Initial commit": when I set up Vercel, it had made its own copy of the code and was watching that repo, so none of my merges had been deployed. It gave me the steps to reconnect the Vercel project to `recipes-made-easy` (Settings → Git → Disconnect → Connect → redeploy main), keeping the same URL and settings. Logged as reality log #29.

**Prompt 2**
> now it´s working. let´s go the new feature. I already created a new issue for the feature 6, I also created a new branch (feature-6-find-things). please build the feature inside this branch and tell me when it´s ready, so I can merge the PR.

**Agent response (summary):** The agent checked that the live site now had Browse and that the latest commit had a Vercel ✅, then switched to my branch and built feature 6:

- **Search by name or ingredient.** Every word has to match the title or an ingredient, so "chicken rice" finds recipes that have both. Upper/lower case doesn't matter.
- **Filters:** cuisine (built from the recipes in the list), diet (vegan / vegetarian / pescatarian, meaning "suitable for"), cost ($ / $$ / $$$) and total time (15 / 30 / 60 minutes or less).
- **Sort:** newest first (My Recipes), recently starred (Starred tab), A to Z (Browse), shortest time, lowest cost. Recipes without a time or cost go last.
- **Where:** My Recipes (All and Starred) and Browse.
- The choices are kept in the URL (for example `/browse?diet=vegan&time=30`), so reloading, the Back button and sharing a link all work. Changing a dropdown applies it right away; the search applies on Enter or **Search**. Without JavaScript it still works as a normal form.
- "3 of 30 recipes match", a "No recipes match" message, and a **Clear search and filters** link.
- The logic lives in `src/lib/recipe-search.ts`, separate from the page and database code, so it can be tested on its own.

## Problems and decisions along the way

- **Where the filtering happens:** the agent filters in the app after loading the list, not in the database query. The lists are small (30 library recipes plus my own), it keeps one simple query, and the rules (like "suitable for" diets and two-word search) are easy to read and test. With thousands of recipes this would move into the database.
- **"Cook time" means total time** (prep + cook), matching the number on each card (reality log #30).
- **Test mistakes (not app bugs):** the first browser run clicked "Search" by its text, which also matched a hidden label for screen readers, so the click failed. A second check of the Back button read the dropdown before the page had finished updating. Both were fixed in the test script, and the Back button was then checked step by step (Back and Forward both restore the right filters).

## How it was checked

Logic, with sample recipes made for the edge cases:

| Check | Result |
|---|---|
| Search title / ingredient / two words / mixed case and spaces | ✅ |
| Two words that no recipe has together | ✅ no results |
| Diet: vegan only vegan; vegetarian includes vegan; pescatarian includes both | ✅ |
| Time filter: recipes without a time are left out | ✅ |
| Sort by time or cost: missing values last, ties keep the list order | ✅ |
| Made-up values in the URL (`diet=keto`, `time=7`) | ✅ ignored, page still works |
| Cuisine list: "italian" and "Italian" count as one | ✅ |

Real browser (Playwright with Chromium) on the local app, logged in as test user A:

| Check | Result |
|---|---|
| Browse: search "lentils" | ✅ Lentil Soup and Mujaddara, "2 of 30 recipes match" |
| Search "chicken rice" | ✅ Chicken Tikka Masala and Thai Green Curry (both have chicken and rice) |
| Vegan → 7 recipes; + 30 min → 2 | ✅ applied on change, URL `/browse?diet=vegan&time=30` |
| Italian, sorted by shortest time | ✅ 17, 35, 45, 50, 60 min |
| All recipes by lowest cost | ✅ all $ first, then $$, then $$$ |
| A search with no results | ✅ "No recipes match" with a Clear link |
| Back / Forward buttons | ✅ the list and the dropdowns follow the URL |
| Starred tab + vegan, then Clear | ✅ stays on the Starred tab |
| JavaScript off: search "shrimp" + $$$ | ✅ Garlic Butter Shrimp and Shrimp Scampi |
| Phone width 360px | ✅ no sideways scrolling |
| Stars (feature 5) checks again | ✅ all pass |

Screenshot: `docs/screenshots/feature-6-find-things.png`
