import { expect, test } from "@playwright/test";
import { clickStar, newEmail, signUp } from "./helpers";

// Test 2 (PLAN.md §4): one dashboard stat calculates correctly.
//
// In plain English: this test creates a user, stars three recipes, opens the
// dashboard, and checks that the number of starred recipes shows 3.
test("the dashboard shows 3 starred recipes after starring 3", async ({ page }) => {
  await signUp(page, newEmail("stars"));

  // A brand-new user starts at 0.
  await page.goto("/dashboard");
  await expect(page.getByTestId("stat-starred")).toHaveText("0");

  // Star exactly three recipes from the shared library.
  await page.goto("/browse");
  const toStar = ["Lentil Soup", "Greek Salad", "Banana Pancakes"];
  for (const title of toStar) {
    await clickStar(page, `Star ${title}`);
  }

  await page.goto("/dashboard");
  await expect(page.getByTestId("stat-starred")).toHaveText("3");
});
