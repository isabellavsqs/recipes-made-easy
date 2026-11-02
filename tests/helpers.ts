import { expect, type Page } from "@playwright/test";

export const PASSWORD = "testpass123";

// A new, unique address for every run, so each test starts from a clean user.
export function newEmail(label: string) {
  return `test-${label}-${Date.now()}-${Math.floor(Math.random() * 1000)}@example.com`;
}

// Creates an account through the real sign-up page and lands on /home.
export async function signUp(page: Page, email: string) {
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.locator("main").getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/home$/);
}

// Clicks a star button and waits until the server has saved it (the star
// fills in right away, before the save finishes).
export async function clickStar(page: Page, name: string | RegExp) {
  const saved = page.waitForResponse((r) => r.request().method() === "POST" && r.ok());
  await page.getByRole("button", { name }).click();
  await saved;
}
