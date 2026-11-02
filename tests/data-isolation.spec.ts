import { expect, test } from "@playwright/test";
import { clickStar, newEmail, signUp } from "./helpers";

// Test 1 (PLAN.md §4): User B cannot see User A's data.
//
// In plain English: this test creates two users, adds and stars a recipe for
// User A, logs in as User B, and checks that User B's list, starred view and
// direct link to A's recipe show nothing.
test("User B can't see User A's recipe, star or recipe page", async ({ browser }) => {
  const title = `A's private recipe ${Date.now()}`;

  // --- User A: sign up, add a recipe, star it ---
  const contextA = await browser.newContext();
  const a = await contextA.newPage();
  await signUp(a, newEmail("a"));

  await a.goto("/recipes/new");
  await a.getByLabel("Title").fill(title);
  await a.getByLabel("Servings").fill("2");
  await a.getByLabel("Ingredient 1 name").fill("rice");
  await a.getByLabel("Instructions").fill("1. Cook the rice.");
  await a.locator("main").getByRole("button", { name: "Save recipe" }).click();
  await expect(a).toHaveURL(/\/recipes\/\d+$/);
  const recipeUrl = a.url();

  await clickStar(a, `Star ${title}`);
  // Sanity check: A really does see the recipe and the star.
  await a.goto("/recipes?view=starred");
  await expect(a.getByRole("heading", { name: title })).toBeVisible();

  // --- User B: a different browser session, a different account ---
  const contextB = await browser.newContext();
  const b = await contextB.newPage();
  await signUp(b, newEmail("b"));

  try {
    // 1. B's recipe list is empty.
    await b.goto("/recipes");
    await expect(b.getByText("No recipes yet")).toBeVisible();
    await expect(b.locator("main li")).toHaveCount(0);
    await expect(b.getByText(title)).toHaveCount(0);

    // 2. B's starred view is empty.
    await b.goto("/recipes?view=starred");
    await expect(b.getByText("No starred recipes yet")).toBeVisible();
    await expect(b.locator("main li")).toHaveCount(0);

    // 3. B opening A's recipe link gets "not found".
    const response = await b.goto(recipeUrl);
    expect(response?.status()).toBe(404);
    await expect(b.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await expect(b.getByText(title)).toHaveCount(0);
  } finally {
    // Clean up: A deletes the test recipe (its star goes with it). A failed
    // clean-up is only logged, so it can't hide the real test result.
    try {
      await a.goto(recipeUrl);
      await a.getByRole("button", { name: "Delete" }).click();
      await a.getByRole("button", { name: "Yes, delete" }).click();
      await expect(a).toHaveURL(/\/recipes$/);
    } catch (error) {
      console.warn("Clean-up failed:", error);
    }
    await contextA.close();
    await contextB.close();
  }
});
