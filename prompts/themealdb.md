# Prompt log: Feature 1 (team plan), 300 recipes from TheMealDB

Issue: #56 · Branch: `additional-recipe-database` · Agent: Claude Code · Date: Nov 25, 2026

## Prompts

**Prompt 1**
> PR sucessfully closed, no alterations in team-plan.md. let´s move ahead to create the feature #1 (TheMealDB API). Issue #56 and new branch (additional-recipe-database) created for it. please work on developing the feature, update me on progress and roadblocks. follow the instructions on TEAM-PLAN.md (for specific details on the feature and tests and continue following the instructions README.md / PLAN.md for overall website architecture. continue saving the prompt log inside "prompts" folder.

**Agent response (summary):** The agent read TEAM-PLAN.md §3 to §6, the existing seed pipeline (`scripts/build-library-sql.mjs`, migration 003) and the pages that show recipes, then built the import in four scripts under `scripts/themealdb/`:

1. **`fetch.mts`** downloads TheMealDB letter by letter with the public test key `1` (26 requests, 790 recipes) into a cache folder that git ignores.
2. **`prepare.mts`** picks the 300 and converts them with **`convert.mts`**: country → cuisine (France → French), British names → the app's US names ("aubergine" → "eggplant", "prawns" → "shrimp", UK "tomato purée" → "tomato paste"), text amounts → number and unit ("1 ½ cups", "400g", "2 x 400g tins", "Juice of 1"), repeated ingredients merged, and allergens and diet tags from an ingredient table. Anything uncertain ("may contain") is tagged on the safe side and the recipe is flagged.
3. **`sources.mts`** reads the servings and times that the original recipe pages publish (183 of 277 links had them).
4. **`build.mts`** joins the agent's estimates (`estimates/batch-01.json` to `batch-12.json`: servings, prep and cook minutes, cost, appliances, reworded steps and corrections) with Isabella's review, and writes `supabase/seed/themealdb.json`, migration `006_themealdb_recipes.sql` and `notes/themealdb-review.md`. Flagged recipes stay out of the SQL until Isabella decides.

The app changes: a `themealdb_id` column (unique, so running 006 twice adds nothing), a credit line on recipe pages ("Recipe from TheMealDB, adapted from the original recipe · Photo from TheMealDB"), the disclaimer from §3 on recipe pages, Browse, Single Dish and Meal Prep, smaller TheMealDB photos on cards, and the letter panel when a photo fails to load. The test is `tests/themealdb.spec.ts` (team plan test 1).

**Prompt 2**
> on the review (point 1), where should I write the decisions? about point 2, tell me step by step of what I should do

**Agent response (summary):** Decisions go in the chat, not in `notes/themealdb-review.md`, because that file is regenerated on every build. The agent saves them in `scripts/themealdb/review.json`. It listed the steps to run 006 in the Supabase SQL Editor and check the count, and pointed out that TEAM-PLAN §4 says to run it during the PR review, after Bhavya has read it.

**Prompt 3**
> I approve the allergen tags for the 26 recipes flagged. You were very conservative, which is very good. About the spot-check recipes: add eggs as allergen in the Beef stroganoff. All others are approved.

**Agent response (summary):** The agent wrote the decisions to `review.json` (all 26 flagged recipes loaded with their safe-side tags, the 22 spot-checks marked done, Eggs added to Beef stroganoff) and rebuilt the migration with all 300 recipes.

## The mix

300 recipes: 113 vegetarian or vegan and 187 with meat or fish, from 58 cuisines. The plan asks for at least 100, 150 and 10. (Before the review, the selection counted 120 vegetarian: some flagged recipes lost their diet tag on the safe side, and the "pork belly" recipe turned out to have meat.)

## Problems and decisions along the way

- **TheMealDB's lists were sometimes incomplete.** A "slow-cooked pork belly" listed no pork belly, so it was tagged **vegan**. Other recipes used eggs, mayonnaise, flour or tahini in the steps without listing them, so their allergens were missing. The agent added those ingredients, re-ran the tags, and then checked every recipe's steps for allergen words missing from its tags.
- **Wrong data, fixed per recipe:** "corn flour" in an arepa is maize flour, not cornstarch; "2 tsp Jerusalem artichokes" in Saltfish and Ackee is allspice; "mincemeat" in Mutabbaq is minced meat; "24 eggs" in Kafteji is 6; Beef Mechado had a kebab recipe's instructions.
- **Left out:** desserts, breads, sauces, sweet dishes, brand copycats (Big Mac, KFC), near-copies (two Fettuccine Alfredos, six shakshukas, and three dishes already in our library), Beef Mandi (no beef in its ingredients), Sushi (no fish or nori) and Koulenje (a sweet bread). The selection replaced them automatically.
- **Appliances:** the app only knows Stove, Oven, Microwave and Air fryer, so barbecue, smoker, slow cooker and pressure cooker recipes got stove or oven steps.
- **Times:** waits of up to 1 hour (soaking, marinating) count in the prep time; overnight waits are only mentioned in the steps, like the library's Overnight Oats.
- **Dashboard test:** no imported title starts with Lentil Soup, Greek Salad or Banana Pancakes, and Ratatouille was skipped as a duplicate.
- **`tsconfig.json`:** the scripts and the test import `.mts` files, so `allowImportingTsExtensions` was turned on (otherwise `next build` fails).
- **Next.js security notice:** `npm run build` compiled, then stopped on a notice that Next.js 16.4.3 has a known vulnerability. The upgrade was left to the team, as in Austin's log.

## Still to do

- ~~Isabella: review the 26 flagged recipes and spot-check 22 others.~~ Done Nov 25 (prompt 3).
- Isabella: run 006 in the Supabase SQL Editor before the review (reality log T2). Until then, recipe pages on this branch fail, because they read the new column.
- Run all the tests after 006, check on a phone-sized screen, take screenshots, and have Bhavya review (main path and duplicates edge case).

**Prompt 4**
> I want to do everything on my side and then let bhavya review at the end (run supabase before her migration read), can we do that? and yes you can commit, push and open the PR. on the text, mention bhavya but leave it open to anyone on the team who could review it

**Agent response (summary):** Yes. Running 006 before the review differs from TEAM-PLAN §4, so the agent logged it as reality log T2 (decided by me). It then committed, pushed and opened the PR, naming Bhavya as the planned reviewer but open to anyone on the team.
