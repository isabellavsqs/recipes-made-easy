# Prompt log: Feature 5, Stars

Issue: #14 · Branch: `feature/stars` · Agent: Claude Code

## Prompts

**Prompt 1**
> I created the issue through vs terminal. please check if it's correct. if so, move on to create the feature 5 inside plan.md

**Agent response (summary):** The agent checked GitHub and found **no Stars issue**: the newest one was still #12, so my terminal command hadn't gone through. It created Issue #14 "Feature 5: Stars" with the user story from PLAN.md. It also found that my `feature/stars` branch started from an older copy of `main` (before PR #13 was merged) and updated it to the latest `main`. Then it built feature 5:

- **`src/lib/stars.ts`**: star, unstar, "which recipes did I star?" and the starred list. Every query filters by the logged-in user, and the database (Row Level Security) checks it again.
- **Star button** (`src/app/recipes/star-button.tsx`) on every recipe card and on the recipe page. It fills in right away while the server saves it, and still works with JavaScript turned off.
- **My Recipes now has two tabs: All and Starred (N)**. The Starred tab shows the starred recipes, most recently starred first, with a friendly empty state.
- No database change was needed: the `stars` table (one row = "this user starred this recipe", unique per user + recipe) was already created in feature 2.

**Prompt 2** (sent while the agent was working)
> the issue needs to be created first.

**Agent response (summary):** The agent confirmed that Issue #14 had already been created before any code was written.

**Prompt 3** (sent while the agent was working)
> ok. please check if the "stars feature branch" was created correctly as well on github.

**Agent response (summary):** The branch existed on my computer but not yet on GitHub. That's normal: a branch only appears on GitHub after it's pushed for the first time, which happened with this feature's commit.

## Problems and decisions along the way

- **Missing Issue:** caught by the agent before starting (see Prompt 1).
- **Test mistakes (not app bugs):** in the first browser test run, the star filled in instantly but the script reloaded the page before the server had finished saving, so it looked like the star was lost. The script now waits for the save. The same run showed that a double-click stars and then unstars (two clicks = two changes), which is correct; the agent fixed a code comment that described it wrongly.
- **Decision:** the "starred view" is a tab inside My Recipes, matching the five navigation tabs in PLAN.md §6 (reality log #23).

## How it was checked

Real browser (Playwright with Chromium) on the local app, with test users A and B:

| Check | Result |
|---|---|
| A stars a recipe on its page, reloads | ✅ still starred |
| A stars 2 more from the cards | ✅ stays on the list (doesn't open the recipe) |
| Starred tab | ✅ shows the 3 starred recipes, newest star first |
| Unstar one in the Starred tab | ✅ it disappears, count goes from 3 to 2 |
| B opens the Starred tab | ✅ "No starred recipes yet", count 0 |
| B opens A's starred recipe by link | ✅ 404 "Page not found" |
| Star / unstar with JavaScript off | ✅ works |
| Phone width 360px | ✅ no sideways scrolling |
| Test recipes deleted afterwards | ✅ their stars were removed too (count back to 0) |

Screenshot: `docs/screenshots/feature-5-stars.png`
