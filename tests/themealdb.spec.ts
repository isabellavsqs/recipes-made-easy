import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { convertMeal, type MealDbMeal } from "../scripts/themealdb/convert.mts";
import { newEmail, signUp } from "./helpers";

// Test 1 (TEAM-PLAN.md §5, Isabella): 300 recipes from TheMealDB.
//
// Given TheMealDB gave us one recipe with parmesan and one with no dairy,
// and I have a Milk allergy in my profile, when I open Browse, then the
// parmesan recipe is hidden and the dairy-free one is shown.
//
// TheMealDB's answer is fixed inside the test (copied from its API for these
// two recipes), so the test checks what our import does with it, not
// TheMealDB. It needs migration 006, which loads the imported recipes.

// What TheMealDB's lookup.php?i=52770 and ?i=53282 returned on Nov 25, 2026.
const WITH_PARMESAN: MealDbMeal = {
  idMeal: "52770", strMeal: "Spaghetti Bolognese", strCategory: "Beef", strArea: "Italian", strCountry: "Italy",
  strInstructions: "(not used by this test)", strSource: null,
  strMealThumb: "https://www.themealdb.com/images/media/meals/sutysw1468247559.jpg",
  strIngredient1: "onions", strMeasure1: "2", strIngredient2: "olive oil", strMeasure2: "1tbsp",
  strIngredient3: "garlic", strMeasure3: "1 clove", strIngredient4: "lean minced beef", strMeasure4: "500g",
  strIngredient5: "mushrooms", strMeasure5: "90g", strIngredient6: "dried oregano", strMeasure6: "1tsp",
  strIngredient7: "tomatoes", strMeasure7: "400g can", strIngredient8: "hot beef stock", strMeasure8: "300ml",
  strIngredient9: "tomato puree", strMeasure9: "1tbsp", strIngredient10: "worcestershire sauce", strMeasure10: "1tbsp",
  strIngredient11: "spaghetti", strMeasure11: "350g", strIngredient12: "parmesan", strMeasure12: "Topping",
};
const DAIRY_FREE: MealDbMeal = {
  idMeal: "53282", strMeal: "Algerian Carrots", strCategory: "Side", strArea: "Algerian", strCountry: "Algeria",
  strInstructions: "(not used by this test)", strSource: "https://www.allrecipes.com/recipe/99244/algerian-carrots/",
  strMealThumb: "https://www.themealdb.com/images/media/meals/o2cd4r1764113576.jpg",
  strIngredient1: "Water", strMeasure1: "1 1/2 cup ", strIngredient2: "Carrots", strMeasure2: "2 Lbs",
  strIngredient3: "Olive Oil", strMeasure3: "5 tablespoons", strIngredient4: "Salt", strMeasure4: "1 tsp",
  strIngredient5: "Black Pepper", strMeasure5: "1/2 teaspoon", strIngredient6: "Ground Cinnamon", strMeasure6: "1/2 teaspoon",
  strIngredient7: "Ground Cumin", strMeasure7: "1/2 teaspoon", strIngredient8: "Garlic", strMeasure8: "3 Cloves Crushed",
  strIngredient9: "Thyme", strMeasure9: "1/2 teaspoon", strIngredient10: "Bay Leaf", strMeasure10: "1",
  strIngredient11: "Lemon Juice", strMeasure11: "1 tsp",
};

// The recipes the migration loads (generated from the same import code).
const seed: { themealdb_id: string; title: string; allergens: string[] }[] = JSON.parse(
  readFileSync(join(__dirname, "../supabase/seed/themealdb.json"), "utf8"),
);

test("A Milk allergy hides the TheMealDB recipe with parmesan, not the dairy-free one", async ({ page }) => {
  // 1. Our import tags the parmesan recipe with Milk, and the other with nothing.
  const withParmesan = convertMeal(WITH_PARMESAN);
  const dairyFree = convertMeal(DAIRY_FREE);
  expect(withParmesan.ingredients.map((i) => i[2])).toContain("parmesan cheese");
  expect(withParmesan.allergens).toContain("Milk");
  expect(dairyFree.allergens).toEqual([]);

  // 2. The migration loads the same recipes with the same allergens.
  for (const converted of [withParmesan, dairyFree]) {
    const loaded = seed.find((r) => r.themealdb_id === converted.themealdb_id);
    expect(loaded, `${converted.title} is in supabase/seed/themealdb.json`).toBeDefined();
    expect(loaded!.allergens).toEqual(converted.allergens);
  }

  // 3. A new user with a Milk allergy (questionnaire: goals, diet, allergies…).
  await signUp(page, newEmail("themealdb"));
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Any allergies?" })).toBeVisible();
  await page.getByText("Milk", { exact: true }).click();
  await expect(page.getByLabel("Milk")).toBeChecked();
  for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(page).toHaveURL(/\/profile/);

  // 4. Browse hides the parmesan recipe and shows the dairy-free one.
  await page.goto("/browse");
  const card = (title: string) => page.getByRole("heading", { level: 2, name: title, exact: true });
  await expect(card(dairyFree.title)).toBeVisible();
  await expect(card(withParmesan.title)).toHaveCount(0);
  await expect(page.getByText(/hidden because they don't fit your diet or allergies/)).toBeVisible();
});
