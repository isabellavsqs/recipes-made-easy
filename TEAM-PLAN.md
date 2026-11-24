# TEAM-PLAN.md: Recipes Made Easy, team version

**Team:** Isabella Vasques (lead), Bhavya, Austin Schmid, Karim Osman

This plan covers the four API features, plus one feature without an API (the servings adjuster), that we are adding to Isabella's solo app. The original [PLAN.md](PLAN.md) is not edited. Every member approves this file, and it is merged before any feature PR.

## 1. Pitch

We're adding **300 new recipes, nutrition facts, fridge photo recognition, hands-free cooking and a servings adjuster** to **Recipes Made Easy**, a website that recommends recipes based on each user's diet, allergies, appliances and budget, so that **busy people have more recipes that fit them, know what they are eating, can find a dish without manually typing everything they have at home, can cook without touching their screen, and can cook for any number of people without doing the math**.

## 2. Who builds what

| # | Member   | API                   | Feature as a user story                                                                                                                                                                                            | Estimated hours |
| - | -------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- |
| 1 | Isabella | TheMealDB             | As a user with specific tastes and dietary needs, I want 300 more recipes from many cuisines, with and without meat, so that I always find something that fits me.                                                 | 8               |
| 2 | Bhavya   | USDA FoodData Central | As a health-conscious user, I want to see calories, protein, carbs and fat per serving on every recipe, including my own, so that I can choose what to cook with that in mind.                                     | 8               |
| 3 | Austin   | Gemini API            | As a cost- and waste-conscious user, I want to take a photo of items I already have in my fridge / pantry and get a list of my ingredients, so that I can find a dish with what I have without typing everything. | 6               |
| 4 | Karim    | Web Speech API        | As a user with busy hands, I want the app to read the steps aloud and move to the next one when I say so, so that I can cook without touching my screen.                                                           | 6               |
| 5 | Isabella | None (extra feature)  | As a user who cooks a single dish or a meal prep for different numbers of people, I want to choose the servings with one click and see every ingredient amount adjusted, so that I do not make mistakes doing the math. | 6 |
|   |          |                       | **Total**                                                                                                                                                                                                    | **34**    |

**Build order:** this plan is merged first. Features 2, 3 and 4 can start at the same time as feature 1. Feature 2 is built and tested on the current recipes, and Isabella runs its script one last time after the 300 recipes are in the database. Feature 5 can also start right away, but it must be merged before feature 2's PR, because Bhavya's test changes the servings. Features 2, 4 and 5 all change the recipe page, and 4 and 5 both show the steps, so everyone updates their branch from `main` before opening a PR.

## 3. APIs

| API                                                                              | Cost and key                                             | When we call it                                                    | What we send → what we get                                                                     | What the app does with it                                                                                           |
| -------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [TheMealDB](https://www.themealdb.com/api.php)                                    | Free test key `1` (development and educational use)    | Once, from an import script. Never while someone uses the app      | A letter → recipes with title, cuisine, category, ingredients, amounts, instructions and photo | Cleans the recipes and loads them as shared recipes, so Browse, search, filters, meal prep and Single Dish use them |
| [USDA FoodData Central](https://fdc.nal.usda.gov/api-guide)                       | Free key, 1,000 requests per hour                        | Once per ingredient. The answer is saved, so it is not asked again | An ingredient name → calories, protein, carbs and fat per 100 g                                | Converts amounts to grams, adds them up, divides by servings and shows the result on the recipe page                |
| [Gemini API](https://ai.google.dev/gemini-api/docs)                               | Free tier key. Google AI Studio shows our current limits | Each time a user uploads a fridge / pantry photo                  | Up to three photos and "list the food you see" → a list of ingredient names                  | Adds the names to the existing list on Single Dish. The user fixes the list before searching                        |
| [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) | Free, built into the browser, no key                     | While hands-free mode is open                                      | Step text → spoken audio; the user's voice → text                                             | Reads the step and follows "next", "back", "repeat" and "stop"                                                      |

**Why TheMealDB and not Spoonacular:** Spoonacular was our first choice, but [its terms](https://spoonacular.com/food-api/terms) only allow storing a recipe's id, title and image URL. Our search, allergy filter, nutrition and fridge features need stored ingredients. [TheMealDB's terms](https://www.themealdb.com/terms_of_use.php) allow copying and modifying what its API returns. Recipe pages credit TheMealDB and link to the original source when there is one.

### Feature 1: TheMealDB (Isabella)

* **The mix of 300:** at least 10 cuisines, 100 vegetarian or vegan recipes and 150 with meat or fish. The other 50 can be either. No desserts, because Meal Prep and Single Dish would suggest them as meals. TheMealDB returned 791 recipes when we checked, enough for this mix.
* **No new categories:** we keep the website's diets (vegetarian, vegan, pescatarian) and its 9 allergens. Dairy-free recipes are the ones without the Milk tag.
* **What TheMealDB does not give us:** servings, cook times, cost, allergens, appliances and most diet tags. The agent estimates them in batches and checks the original recipe when TheMealDB has a link to it. If it is unsure about a diet tag or an allergen, it flags the recipe, which is not loaded until Isabella reviews it. Isabella also spot-checks the allergens of at least 20 recipes that were not flagged, before they are loaded.
* **Disclaimer on the website:** recipe pages, Browse, Single Dish and Meal Prep say: "Servings, times, costs, nutrition, diet tags and allergens are estimates. Always check the ingredients, especially if you have an allergy."
* **Amounts must be imported correctly:** TheMealDB writes amounts as text ("400g"), so the script splits them into a number and a unit (400 and g). Single Dish treats an ingredient without an amount as optional and does not ask the user to buy it. So main ingredients must always have an amount, or the app could say "you have everything" for a chicken curry without chicken. Only extras, like "salt to taste", can have no amount.
* **Known data problems:** 2 recipes have the same title as one of ours (Banana Pancakes and Ratatouille), 175 list an ingredient twice and 190 have no cuisine. The script skips title duplicates, merges repeated ingredients and only picks recipes with a cuisine/country. TheMealDB often gives a country, so the script converts it to our cuisine names (France → French), or Browse would show both.
* **Instructions:** reworded, as PLAN.md §5 requires, and split into numbered steps, one per line. Hands-free mode needs the steps separated.

### Feature 2: USDA FoodData Central (Bhavya)

* **Recipes already in the database** (shared and users' own): a script calculates calories, protein, carbs and fat per serving. Isabella runs it, and it can be run again safely. **Users' own recipes:** also recalculated every time they are saved.
* **Calories:** we prefer USDA's "SR Legacy" foods, because in our check "Foundation" foods had no value in the standard calories field. If calories are missing, we calculate them: protein × 4 + carbs × 4 + fat × 9.
* **Staples:** oil, butter and other staples are ignored by the fridge feature, but they **do** count here.
* **Ingredients we cannot count:** if there is no USDA match, no amount, or an amount we cannot convert, the ingredient adds nothing to the totals. The recipe page names the ingredients it could not calculate, for example, "Information not found for: tomato, butter".
* **If USDA is down:** the recipe is still saved, and the page says nutrition is not available yet. It is calculated the next time the recipe is saved or the script runs.

### Feature 3: Gemini API (Austin)

* **Photos:** up to three at a time, each shrunk in the browser (to 1 MB or less), sent through our server to Gemini and **never saved by our app**. Only logged-in users can send them.
* **Privacy notice before uploading:** "Your photo is sent to Google, which may use it to improve its products. Be careful to keep people and personal information out of the picture. Crop the photo to show only food."
* **List rules:** the existing rules still apply (no repeated items, maximum of 30).
* **If the free limit is reached or Gemini fails:** a friendly message appears, and the user can still type the list.
* **Model:** the name is a setting (`GEMINI_MODEL`), starting with a free Flash model, so we can switch if limits change.

### Feature 4: Web Speech API (Karim)

* **Screen:** a "Hands-free mode" button on every recipe page opens one large step at a time (each line of the instructions is one step). English only. On the last step, "next" says it is the last one.
* **Buttons always work:** Next, Back, Repeat and Stop, because some browsers (such as Firefox) do not support voice recognition, and users can deny the microphone.
* **No false commands:** the app stops listening while it speaks, so it does not react to the word "next" in its own reading.
* **Privacy:** the app does not save audio, but some browsers (such as Chrome) send it to their own servers to recognize it. A short note says so before the microphone turns on.

### Feature 5: Servings adjuster (Isabella, no API)

* **Screen:** every recipe page has − and + buttons next to the servings (from 1 to 100). Each click adjusts all the ingredient amounts right away. There is nothing to type.
* **Single Dish:** opening a suggested recipe starts at the recipe's original servings, and the user adjusts from there.
* **Meal Prep, plan page:** each recipe in the plan has − and + buttons, starting at the servings the plan says to make. Each click updates that recipe's servings and the shopping list, and is saved with the plan. If the servings are fewer than the plan needs, a warning says so, but the user can keep them.
* **Meal Prep, recipe page:** opening a recipe from a plan starts at the servings saved in that plan, so its amounts match the shopping list.
* **Math:** new amount = original amount ÷ original servings × chosen servings. The app always starts from the original amounts, so clicking many times never adds rounding errors. Adjusted amounts are shown as decimal numbers with at most 2 digits after the point (for example, 1.25 eggs), including in the shopping list. A plan can start at part of a serving (for example, 1.5); then + goes to 2 and − goes to 1.
* **Amounts in the steps:** they are not adjusted. The app shows the original servings in parentheses at the end of each sentence with an ingredient amount: "Add 2 cups of water (4 servings)." It does this when it shows the step, so the saved text does not change and it also works on users' own recipes. It ignores times, temperatures, sizes and amounts per item ("1/2 cup per jar"). Hands-free mode reads the same text.
* **What does not change:** ingredients without an amount, the units, the cooking times, and the calories and macronutrients per serving.
* **What is saved:** only the servings chosen on the plan page, for that plan. On the recipe page, the choice is only for that visit. The recipe itself never changes, and other users are not affected.
* **Warning in the Edit form:** users can still edit the servings of their own recipes. If they do, a warning appears: "You changed the servings. Check that you also adjusted the ingredient amounts." It does not stop them from saving.

**Keys:** `USDA_API_KEY` and `GEMINI_API_KEY` stay on the server, in `.env.local` and Vercel. They are never in GitHub and never start with `NEXT_PUBLIC_`. The nutrition script also needs the Supabase secret key, which only Isabella has, in `.env.local`. The team shares the other values for `.env.local` in private.

## 4. Database changes

We share one Supabase project. Each member writes their own migration file, and only Isabella runs it, while the PR is in review and after the reviewer has read it, so the reviewer can test the feature before approving. Migrations only add things, so the live site keeps working. Each PR with database changes also updates [schema.md](schema.md).

| Feature         | Migration | Changes                                                                                         |
| --------------- | --------- | ----------------------------------------------------------------------------------------------- |
| 1. Recipes      | `006`   | 1 new column in `recipes`, plus 300 new rows and their ingredients, allergens and appliances |
| 2. Nutrition    | `007`   | 5 new columns in `recipes` and 1 new table                                                    |
| 3. Fridge photo | none      | Neither the photos nor the list are saved                                                         |
| 4. Hands-free   | none      | Uses the instructions already saved                                                             |
| 5. Servings adjuster | `008` | 1 new column in `meal_plan_items` |

**`recipes`: new columns**

| Feature | Column                | Type           | Notes                                                                                |
| ------- | --------------------- | -------------- | ------------------------------------------------------------------------------------ |
| 1       | themealdb_id          | text           | Unique, empty for all other recipes. Stops the same recipe from being imported twice |
| 2       | kcal_per_serving      | number         | Empty until calculated                                                               |
| 2       | protein_g_per_serving | number         | Empty until calculated                                                               |
| 2       | carbs_g_per_serving   | number         | Empty until calculated                                                               |
| 2       | fat_g_per_serving     | number         | Empty until calculated                                                               |
| 2       | nutrition_skipped     | list of text   | Names of the ingredients that could not be counted. Empty if all were counted        |

The 300 recipes use the existing `source_type` "seed", so they are shared and read-only like the current library.

**`meal_plan_items`: new column**

| Feature | Column | Type | Notes |
| ------- | ------ | ---- | ----- |
| 5 | servings_to_make | number | Servings the user chose for this recipe in this plan, the same on every day it covers. Empty means the plan's own calculation |

**`ingredient_nutrition`: new table (feature 2, one-to-one with `ingredients`)**

| Column             | Type           | Notes                                             |
| ------------------ | -------------- | ------------------------------------------------- |
| ingredient_id      | number         | PK, FK → ingredients                             |
| fdc_id             | number (whole) | The matched USDA food. Empty if there is no match |
| fdc_description    | text           | The USDA food's name, so we can check the match   |
| kcal_per_100g      | number         | Empty if there is no match                        |
| protein_g_per_100g | number         | Empty if there is no match                        |
| carbs_g_per_100g   | number         | Empty if there is no match                        |
| fat_g_per_100g     | number         | Empty if there is no match                        |
| grams_per_cup      | number         | Converts cups, tablespoons and teaspoons to grams |
| grams_per_piece    | number         | Converts amounts like "1 onion" to grams          |
| fetched_at         | date/time      | When we asked USDA                                |

Row Level Security: users can read nutrition for the ingredients they are allowed to see, and can only add it for their own custom ingredients.

## 5. Tests

Each member's agent writes one Playwright test for their API feature. Feature 5 has one extra test. The API answer is fixed inside the test, so we test what our app does with it.

| # | Member   | Test                                                                                                                                                                                                                                                                             |
| - | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | Isabella | **Given** TheMealDB gave us one recipe with parmesan and one with no dairy, and I have a Milk allergy in my profile, **when** I open Browse, **then** the parmesan recipe is hidden and the dairy-free one is shown.                                           |
| 2 | Bhavya   | **Given** a recipe uses 200 g of rice for 4 servings and USDA says rice has 300 kcal per 100 g, so the whole recipe has 600 kcal and its page shows 150 kcal per serving, **when** the recipe servings are changed with the + button (from 4 servings to 5), **then** the rice changes from 200 g to 250 g and the kcal per serving should not be changed (150 kcal should be maintained). |
| 3 | Austin   | **Given** "onion" is already in my list and Gemini reads my photo as "onion", "chicken thighs" and "rice", **when** I remove "rice" and search, **then** the search uses onion and chicken thighs once each, and no suggestion lists rice as something I have. |
| 4 | Karim    | **Given** hands-free mode is open on step 1 of a recipe with at least 3 steps, **when** the browser hears "next", "next" and "back", **then** step 2 is on the screen and step 2 is the last text read aloud.                                                  |
| 5 | Isabella (extra test) | **Given** a recipe for 4 servings uses 200 g of rice, 2 eggs and salt with no amount, and its step says "Add 2 cups of water.", **when** I click + to get 5 servings, **then** the page shows 250 g of rice, 2.5 eggs, salt still with no amount, and "Add 2 cups of water (4 servings)." |

The two existing tests must keep passing. The dashboard test finds recipes by title (Lentil Soup, Greek Salad, Banana Pancakes), so no imported title may start with one of those names.

## 6. Done when

The reviewer runs both the main path and the edge case on the PR before approving it.

| # | Feature                | Reviewer | Main path                                                                                                                                                                                             | Edge case                                                                                                                                                                        |
| - | ---------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | 300 recipes (Isabella) | Bhavya   | Browse has 300 more shared recipes that meet the mix in §3. Open three: each has a photo, ingredients with amounts, numbered steps, allergens and diet tags if it has any, a credit and the disclaimer. Filter by a cuisine and by vegetarian: new recipes appear. | **Duplicates:** Isabella runs the migration a second time. The count does not change, and there is still only one Banana Pancakes.                                                    |
| 2 | Nutrition (Bhavya)     | Isabella | Open a shared recipe: calories, protein, carbs and fat per serving appear. Create a recipe of my own: they appear after saving. Change the servings with the + button: the per-serving numbers stay the same. Edit an ingredient amount and save: the numbers change.                              | **An ingredient that cannot be counted:** add "salt" with no amount. The recipe saves, the other ingredients still count, and the page says "Information not found for: salt".  |
| 3 | Fridge photo (Austin)  | Karim    | On Single Dish, upload two photos (fridge and pantry). The detected ingredients join the list. Remove one, add one and search: the suggestions match the final list.                                                  | **No food or limit reached:** upload a photo with no food, then simulate a Gemini error. Each shows a clear message, the list already typed stays, and typing still works. |
| 4 | Hands-free (Karim)     | Austin   | In Chrome, open a recipe, start hands-free mode and allow the microphone. Step 1 is read aloud. "Next", "back", "repeat" and "stop" all work by voice.                                                | **No microphone:** deny permission. A message explains it, and the buttons still work.                                                                                     |
| 5 | Servings adjuster (Isabella) | Bhavya | Open a recipe from Single Dish and click + and −: all amounts change right away, with at most 2 digits after the point, and the steps show the original servings in parentheses. On a meal plan, click + on a recipe: the shopping list updates. Reload: the choice is still there. Open that recipe from the plan: it starts at the same servings. | **No errors:** the buttons stop at 1 and 100, and going up and back down shows exactly the original amounts. In the Edit form of my own recipe, changing the servings shows the warning, and I can still save. On a meal plan, going below the servings it needs shows a warning. |

**Every feature also needs:** an Issue, its own branch, a prompt log in `prompts/`, the member's test and the existing tests passing, the README updated, a check on a phone-sized screen, and a check on the live site after merging.
