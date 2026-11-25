import { expect, test } from "@playwright/test";
import { newEmail, signUp } from "./helpers";

// Test 3 (TEAM-PLAN.md §5, Austin): fridge photo recognition.
//
// Given "onion" is already in my list and Gemini reads my photo as "onion",
// "chicken thighs" and "rice", when I remove "rice" and search, then the
// search uses onion and chicken thighs once each, and no suggestion lists
// rice as something I have.
//
// Gemini's answer is fixed inside the test: the browser's request to our
// photo endpoint is answered by the test, so no photo goes to Google and the
// free limit isn't used.

// The smallest valid PNG (1×1 pixel), standing in for a fridge photo.
const PHOTO = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

test("Foods read from a photo join the list, and a removed one isn't searched", async ({ page }) => {
  await signUp(page, newEmail("fridge"));

  let photosSent = 0;
  await page.route("**/api/fridge-photo", async (route) => {
    photosSent++;
    await route.fulfill({ json: { foods: ["onion", "chicken thighs", "rice"] } });
  });

  // "onion" is already in the list.
  await page.goto("/suggest?have=onion");
  const list = page.getByRole("list", { name: "In your fridge" });
  await expect(list.getByRole("listitem")).toHaveText(["onion"]);

  // The privacy notice is shown before uploading.
  await expect(page.getByText("Your photo is sent to Google")).toBeVisible();

  await page.getByLabel("Upload up to 3 fridge or pantry photos").setInputFiles({
    name: "fridge.png",
    mimeType: "image/png",
    buffer: PHOTO,
  });

  // onion isn't repeated; the two new foods join it.
  await expect(list.getByRole("listitem")).toHaveText(["onion", "chicken thighs", "rice"]);
  expect(photosSent).toBe(1);

  // The user fixes the list, then searches.
  await page.getByRole("button", { name: "Remove rice" }).click();
  await expect(list.getByRole("listitem")).toHaveText(["onion", "chicken thighs"]);
  await page.getByRole("button", { name: "Find a recipe" }).click();

  // The search used onion and chicken thighs once each, and not rice.
  await expect(page).toHaveURL(/\/suggest\?/);
  const searched = new URL(page.url()).searchParams.getAll("have").filter((h) => h.trim());
  expect(searched).toEqual(["onion", "chicken thighs"]);
  await expect(list.getByRole("listitem")).toHaveText(["onion", "chicken thighs"]);

  // No suggestion lists rice as something I have.
  const usesWhatYouHave = page.locator("main p").filter({ hasText: "Uses what you have:" });
  for (const line of await usesWhatYouHave.allInnerTexts()) {
    expect(line.toLowerCase()).not.toContain("rice");
  }
});
