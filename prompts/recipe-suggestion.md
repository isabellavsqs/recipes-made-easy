# Prompt log: Feature 10, Single recipe suggestion

Issue: #29 · Branch: `feature/recipe-suggestion` · Agent: Claude Code

I created the Issue and the branch myself.

## Prompts

**Prompt 1**
> issue and new branch created (feature/recipe-suggestion). move forward by creating this feature.

**Agent response (summary):** The agent checked that PR #31 was merged. It noticed I had also opened Issue #30 for the Instagram import, which was cut earlier (reality log #6), so it didn't build that (reality log #41). Then it built feature 10 at `/suggest` ("Single Recipe" in the header, as in PLAN.md §6):

- **What I enter:** what's in my fridge, by typing (with suggestions from the library's ingredients) or tapping quick picks like chicken, eggs, onion and rice. Plus **Can you shop for a few extra items?** Yes or No. Nothing is saved: the list only lives in the page address, as PLAN.md's design note says.
- **Matching** (`src/lib/suggestion.ts`, separate so it can be tested on its own):
  - "Chicken" matches "chicken thighs" and "tomato" matches "cherry tomatoes", in singular or plural. A few other names work too ("pasta" → spaghetti).
  - "Rice" does **not** match "rice vinegar".
  - Spices, oils, butter, salt and the other staples are ignored.
  - Ingredients without an amount (like "parmesan, to serve") count as optional.
- **Results:** **Our pick**, then **Also ready to cook** (nothing to buy) and **With a few extra items** (each with "To buy (n): …"). If nothing can be made with what I have, the page says so and explains the order.
  - Recipes that use more of my fridge come first, especially the main ingredient (meat, fish, tofu, eggs).
  - If I can't shop, the fewest extra items come first instead.
- **My profile applies:** diet, allergies and appliances are hard rules, and dislikes are flagged with a "leave it out or swap it" note.
- Home has a "What can I cook?" card, highlighted when I chose "Find one recipe" in the questionnaire.

## Problems and decisions along the way

The agent tested the rules on the 30 library recipes before building the page, and changed them three times:

1. **Too few items in common:** at first the order was only "fewest things to buy". With chicken, rice, onion, garlic and carrot, Spaghetti Aglio e Olio (which only shares garlic) came before Vegetable Fried Rice (which uses 5 of my items). It now ranks by how much of the fridge a recipe uses.
2. **The chicken disappeared:** the next version required at least 2 fridge items and at most 5 things to buy, and suddenly no chicken recipe was suggested for a fridge with chicken. The main ingredient now counts extra, and the hard limits are gone.
3. **"Can't shop" showed nothing:** "salmon, broccolini, ramen" plus "can't shop" gave no result, although Teriyaki Salmon Noodles uses all three. PLAN.md says that when nothing fits exactly, the app should still suggest recipes and list what to buy. So "can't shop" now changes the order (fewest to buy first) instead of hiding recipes.

Also:

- "Rice" matched "rice vinegar", so words like vinegar, paste, sauce and broth at the end now mark a different product.
- An item typed but not added with **Add** was lost when pressing **Find a recipe**. It's now sent too.
- The "uses" and "to buy" lists came back alphabetically. They now follow the recipe's own order.
- **Test-script timing:** one check read the chips before the page had updated after the Back button. A second, step-by-step check showed Back restores them.

## How it was checked

Rules, with the real 30 library recipes:

| Fridge | Result |
|---|---|
| chicken, rice, onion, garlic, carrot (can shop) | ✅ Chicken Tikka Masala first, then Air Fryer Chicken Thighs, Vegetable Fried Rice, the stir-fry… |
| same, can't shop | ✅ Air Fryer Chicken Thighs first (only a lemon to buy) |
| eggs, spinach, cheddar | ✅ Classic Omelette, "You have everything you need" |
| spaghetti, garlic, parsley | ✅ Aglio e Olio, parmesan optional |
| salmon, broccolini, ramen (can't shop) | ✅ Teriyaki Salmon Noodles with its 6 things to buy |
| vegan profile + chicken fridge | ✅ only vegan recipes |
| chocolate | ✅ nothing, with a friendly message |
| Matching: chicken/chicken thighs, tomato/cherry tomatoes, egg/eggs, pasta/spaghetti, lemon/lemon juice ✅; rice/rice vinegar, tomato/tomato paste ✗ (on purpose) | ✅ |

Real browser (Playwright with Chromium) with new accounts:

| Check | Result |
|---|---|
| Empty fridge | ✅ "Find a recipe" is disabled |
| Quick picks, Enter, and a typed item not added yet | ✅ all 5 items sent; a quick pick disappears once added |
| Results, can shop / can't shop | ✅ as in the table above, with the right explanation |
| Vegetarian profile + chicken in the fridge | ✅ no meat or fish suggested |
| Back button | ✅ the chips come back |
| JavaScript off: "eggs, spinach , cheddar, eggs" | ✅ Classic Omelette; repeats removed |
| Phone width 360px | ✅ no sideways scrolling |
| The 2 required tests | ✅ both pass |
| Build and lint | ✅ |

Screenshots: `docs/screenshots/feature-10-suggestion.png` (phone), `docs/screenshots/feature-10-suggestion-desktop.png`
