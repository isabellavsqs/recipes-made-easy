# Prompt log: Feature 7, Dashboard

Issue: #22 · Branch: `feature/dashboard` · Agent: Claude Code

I created the Issue and the branch myself. While the agent built this, I added my own 5 real recipes in My Recipes on the live site.

## Prompts

**Prompt 1**
> issue 7 created and new branch created (feature/dashboard). build the feature inside this branch. meanwhile, I will add my own 5 recipes inside My Recipes

**Agent response (summary):** The agent checked that PR #21 was merged and that my branch started from the latest `main`, then built the dashboard at `/dashboard` (linked in the header and on Home):

- **Three stat tiles:** **My recipes** (recipes I added), **Starred recipes** (my stars) and **Meal plans created** (0 until feature 9). The first two link to the matching list.
- **Chart: Recipes by cuisine**, a horizontal bar chart made with **Recharts** (as PLAN.md §5 says). It covers recipes I added plus recipes I starred, each counted once. Biggest cuisine first, a number at the end of each bar, and a tooltip on hover. More than 8 cuisines fold into "Other".
- **Accessible extras:** a one-line summary under the chart ("4 recipes in 3 groups. The most: Indian (2).") and a **Show as table** view, so the numbers don't depend on reading the chart.
- An empty state for new users, with links to add or browse recipes.
- Every count is filtered by the logged-in user (`src/lib/dashboard.ts`). The grouping logic is in `src/lib/cuisine-count.ts`, separate so it can be tested on its own.
- Each stat has a test id (`stat-starred` and so on) so Test 2 can read the number directly.

## Problems and decisions along the way

- **Chart design:** before drawing, the agent followed a data-visualization checklist: one series, so no legend (the heading says what's shown); thin bars (20px) with a rounded end; numbers in text color, not bar color; a tooltip on hover; and a table view. It checked that the green bars have enough contrast against white.
- **Library compatibility:** Recharts needs a helper package (`react-is`) that matches the React version. The project only had an old copy (16.13.1) from the linting tools, which can stop charts from drawing with React 19, so the agent installed the matching `react-is@19.3.0`. `npm audit` shows 0 problems in the packages the live site uses.
- **"italian" vs "Italian":** a recipe typed with a lowercase cuisine showed up lowercase in the chart. The chart now groups them and capitalizes the first letter.
- **Phone layout:** the three tiles first stacked into a tall column on a phone; they now sit side by side in one row.
- **Decision:** the chart counts recipes I added plus recipes I starred (reality log #32).

## How it was checked

Logic (`countByCuisine`) with made-up lists:

| Check | Result |
|---|---|
| No recipes | ✅ empty list (the page shows the empty state) |
| "italian", "Italian", " Italian " count as one; blank or missing cuisine → "No cuisine" | ✅ |
| Ties sorted A to Z | ✅ |
| 10 cuisines | ✅ 7 bars plus "Other" |

Real browser (Playwright with Chromium) on the local app with test users A and B:

| Check | Result |
|---|---|
| A with nothing yet | ✅ all stats 0, empty state shown |
| A stars 3 library recipes and adds 1 recipe | ✅ My recipes 1, **Starred recipes 3**, Meal plans 0 |
| Chart | ✅ Indian 2, Italian 1, Mediterranean 1; tooltip "Indian · 2 recipes"; table matches |
| A also stars their own recipe | ✅ Starred 4, but the chart still counts that recipe once (4 recipes) |
| User B | ✅ all 0 and the empty state, none of A's numbers |
| Phone width 360px | ✅ no sideways scrolling, the header fits on two rows |
| Test data removed afterwards | ✅ A back to 0 |

Screenshot: `docs/screenshots/feature-7-dashboard.png`
