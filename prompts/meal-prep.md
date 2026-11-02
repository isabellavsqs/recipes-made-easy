# Prompt log: Feature 9, Meal prep plan

Issue: #28 · Branch: `feature/meal-prep-plan` · Agent: Claude Code

I created the Issue and the branch myself.

## Prompts

**Prompt 1**
> new issue and branch created (feature/meal-prep-plan). move forward with the next feature

**Agent response (summary):** The agent checked that PR #27 was merged and that the meal plan tables and their rules already existed from feature 2, so no SQL was needed. It explained the rules first, then built the rule-based generator (reality log #38):

- **What I enter** (`/meal-prep`): servings per meal, number of days, cooking time for the whole prep session, and budget. The budget starts from my profile answer.
- **Hard rules:** my diet and allergies, cost no higher than my budget, only appliances I have, and no single-serving dishes (an omelette for ten isn't meal prep). The recipes' times added together must fit my cooking time.
- **Choosing:** 1, 2 or 3 recipes depending on the number of days, from different cuisines when possible. My goals change the order (Save money → cheaper, Save time → quicker, Eat healthier → vegetarian, Improve cooking skills → more involved). Dislikes are avoided, and only used as a last resort with a "leave it out or swap it" note.
- **The plan page** (`/meal-prep/<id>`): each recipe gets a block of days ("Days 1–2"), with "You need 4 portions: make the recipe as written (makes 6, 2 extra)". There's a tip about which recipe to start with, a **shopping list** that adds up the scaled ingredients of all recipes (staples listed separately under "Check you have"), **Make another plan**, and **Delete**.
- **Saving:** plans are saved, so the dashboard's "Meal plans created" now counts them. Past plans are listed on `/meal-prep`.
- **Meal Prep** is now the first link in the header, as in PLAN.md §6. Home has a Meal prep card, highlighted when I chose "Plan my meal prep" in the questionnaire.
- The rules live in `src/lib/meal-plan-generator.ts`, separate from the database code, so they can be tested on their own.

## Problems and decisions along the way

- **Odd amounts:** the first version said things like "make ×0.7 of the recipe". Amounts now round up to a whole or half recipe, so there's always enough, and the page says how many portions are extra.
- **"Classic Omelette ×10":** with only 15 minutes, the first version made ten omelettes. Dishes that serve one are no longer used for meal prep.
- **"Make another plan" picked the same recipes:** with a strict profile only a few recipes qualify, and chance picked the same three again (in a different order). A new plan now avoids the recipes of the plan on screen whenever something else fits.
- **Browser number checks:** typing 9 days showed the browser's own tooltip instead of the app's message. The form now uses the app's friendly messages, like the recipe form.
- **Test-script assumption:** the agent expected 15 minutes to be impossible for the test profile, but Blueberry Overnight Oats (15 min, vegetarian, no milk) fits, so a real plan was made. The script now accepts either outcome.
- **Simplifications to know about:** scaling a recipe up doesn't change its time in the plan, and there's one meal per day.

## How it was checked

Generator, with the real 30 library recipes:

| Check | Result |
|---|---|
| 5 days, 2 servings, 120 min, $$ | ✅ 3 recipes, 100 min, days 1–2 / 3–4 / 5 |
| 1, 3 and 7 days | ✅ 1, 2 and 3 recipes; 7 days × 4 servings doubles each recipe |
| Save money + Save time with $ | ✅ only $ recipes, 47 min in total |
| Vegan with a peanut allergy | ✅ only vegan recipes, none with peanuts |
| Only an air fryer / only a microwave | ✅ air fryer or no-cook recipes / Greek Salad only |
| Dislikes "onion" and "garlic" | ✅ recipes without them |
| Make another plan | ✅ different recipes |
| Impossible settings | ✅ says which rule left nothing |
| Shopping list | ✅ same ingredient and unit added up; staples separate |
| Form: 0 servings, 8 days, 10 minutes, no budget | ✅ a clear message for each |

Real browser (Playwright with Chromium) with a new account (Save money, vegetarian, milk allergy, dislikes lentils, stove and oven, $$):

| Check | Result |
|---|---|
| Home | ✅ Meal prep card highlighted ("Plan my meal prep" was chosen) |
| Form | ✅ starts at 2 servings, 5 days, 120 min, $$ (from the profile) |
| 9 days | ✅ "Days should be a whole number from 1 to 7.", 9 stays in the box |
| Make my plan | ✅ 3 recipes; opening each one shows it's vegetarian, has no milk or lentils, only needs a stove, and costs $ |
| Amounts, tip, shopping list | ✅ scaled, 27 items, staples separate |
| Make another plan | ✅ different recipes |
| Dashboard | ✅ "Meal plans created" goes up, and down again after a plan is deleted |
| Another user opens the plan link | ✅ 404 "Page not found" |
| Phone width 360px | ✅ no sideways scrolling |
| JavaScript off | ✅ a plan is made |
| The 2 required tests | ✅ both pass |
| Build and lint | ✅ |

Screenshots: `docs/screenshots/feature-9-meal-plan.png` (phone), `docs/screenshots/feature-9-meal-plan-desktop.png`
