// Step 2 of the TheMealDB import (TEAM-PLAN.md §3, feature 1).
// Picks the 300 recipes from the download, converts them (convert.mts) and
// writes scripts/themealdb/cache/drafts.json for the agent to estimate what
// TheMealDB doesn't give us (servings, times, cost, appliances) and to reword
// the instructions.
// Run with: node scripts/themealdb/prepare.mts

import { readFileSync, writeFileSync } from "node:fs";
import { convertMeal, type ConvertedMeal, type MealDbMeal } from "./convert.mts";

const meals: MealDbMeal[] = JSON.parse(readFileSync(new URL("./cache/meals.json", import.meta.url), "utf8"));
const library: { title: string }[] = JSON.parse(
  readFileSync(new URL("../../supabase/seed/library.json", import.meta.url), "utf8"),
);

// Recipes we leave out, and why. Desserts are left out by category.
const SKIP: Record<string, string> = {};
function skip(reason: string, ids: string) {
  for (const id of ids.split(/\s+/).filter(Boolean)) SKIP[id] = reason;
}
skip("not a meal (bread, sauce, dip, pickle, jam or snack)",
  "53527 53525 53438 53403 53089 53097 53284 53529 53456 53460 53476 53310 53442 53513 53516 53523 " +
  "53556 53563 53564 53139 53272 53397 53552 53355 53286 53408 53560 53121 53500 53422 53471 53308 " +
  "53226 53448 53567 53429 53115 53307 53480 53426 53538 53433 53479 53353 53356 53472 53114 53450 " +
  "53033 53252 53559 52913 52779 53455 53499 53094 53269 53256 53254 53436 53259 53107 53150 53030");
skip("sweet, so it would be suggested as a meal by mistake",
  "52957 52967 53415 53165 53379 53118 53504 53363 53413 53331 52794");
skip("named after a restaurant brand", "53013 53016 52813 53014 52880");
skip("almost the same as another TheMealDB recipe we keep",
  "52835 53018 53063 52895 53142 53350 52926 53194 53233 52882 52964 53314 53266 53215 53219 53222 " +
  "52969 53352 53182 53167 53172 53306 53028");
skip("almost the same as a recipe already in our library",
  "52915 52814 52908"); // French Omelette, Thai Green Curry, Ratatouille
skip("frog legs: few users would cook them", "53465");
skip("its ingredient list leaves out the main ingredient", "53359"); // Beef Mandi has no beef
skip("a sweet bread, not a meal", "53434"); // Koulenje
skip("its ingredient list leaves out the fish and nori", "53065"); // Sushi

// The dashboard test stars these by name, so no new title may start with them.
const TEST_TITLES = ["lentil soup", "greek salad", "banana pancakes"];
const ourTitles = new Set(library.map((r) => r.title.toLowerCase()));

const VEG_TARGET = 120;
const TOTAL = 300;
// Meat and fish, split roughly like TheMealDB itself.
const MEAT_QUOTAS: Record<string, number> = {
  Chicken: 42, Beef: 40, Seafood: 42, Pork: 28, Lamb: 18, Goat: 2, Miscellaneous: 3, Breakfast: 3, Pasta: 2, Side: 0, Starter: 0,
};

const candidates: ConvertedMeal[] = [];
const left: Record<string, number> = {};
for (const meal of meals) {
  const why =
    meal.strCategory === "Dessert" ? "dessert"
    : SKIP[meal.idMeal]
    ?? (!meal.strMealThumb ? "no photo" : null)
    ?? ((meal.strInstructions ?? "").length < 200 ? "instructions too short" : null);
  const converted = convertMeal(meal);
  const title = converted.title.toLowerCase();
  const reason =
    why ?? (ourTitles.has(title) ? "same title as a library recipe" : null)
    ?? (TEST_TITLES.some((t) => title.startsWith(t)) ? "title used by a test" : null)
    ?? (!converted.cuisine ? "no cuisine" : null);
  if (reason) {
    left[reason] = (left[reason] ?? 0) + 1;
    continue;
  }
  candidates.push(converted);
}

const isVeg = (m: ConvertedMeal) =>
  m.diet_tags.includes("vegetarian") ||
  // Flagged only because an ingredient may not be vegetarian: counted as
  // vegetarian here, and loaded only after a person checks it.
  (m.diet_tags.length === 0 && m.flags.some((f) => f.endsWith("may contain meat")));

// Takes recipes one cuisine at a time, so no country fills the list.
function roundRobin(list: ConvertedMeal[], count: number): ConvertedMeal[] {
  const byCuisine = new Map<string, ConvertedMeal[]>();
  for (const m of [...list].sort((a, b) => Number(a.themealdb_id) - Number(b.themealdb_id))) {
    byCuisine.set(m.cuisine!, [...(byCuisine.get(m.cuisine!) ?? []), m]);
  }
  const picked: ConvertedMeal[] = [];
  while (picked.length < count && [...byCuisine.values()].some((l) => l.length)) {
    for (const l of byCuisine.values()) if (l.length && picked.length < count) picked.push(l.shift()!);
  }
  return picked;
}

const veg = roundRobin(candidates.filter(isVeg), VEG_TARGET);
const others = candidates.filter((m) => !isVeg(m));
const meat: ConvertedMeal[] = [];
for (const [category, quota] of Object.entries(MEAT_QUOTAS)) {
  meat.push(...roundRobin(others.filter((m) => m.category === category), quota));
}
// Fill up to 300 with whatever is left, still spread across cuisines.
const chosen = new Set([...veg, ...meat]);
meat.push(...roundRobin(others.filter((m) => !chosen.has(m)), TOTAL - veg.length - meat.length));
const selected = [...veg, ...meat].sort((a, b) => a.title.localeCompare(b.title));

// Summary.
const count = (f: (m: ConvertedMeal) => boolean) => selected.filter(f).length;
const cuisines = new Map<string, number>();
for (const m of selected) cuisines.set(m.cuisine!, (cuisines.get(m.cuisine!) ?? 0) + 1);
console.log(`Left out: ${JSON.stringify(left)}`);
console.log(`Selected ${selected.length}: ${count(isVeg)} vegetarian or vegan (${count((m) => m.diet_tags.includes("vegan"))} vegan), ` +
  `${count((m) => !isVeg(m))} with meat or fish (${count((m) => m.diet_tags.includes("pescatarian"))} pescatarian)`);
console.log(`${cuisines.size} cuisines: ${[...cuisines].sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} ${n}`).join(", ")}`);
console.log(`Flagged for review: ${count((m) => m.flags.length > 0)}; with problems: ${count((m) => m.problems.length > 0)}`);

writeFileSync(new URL("./cache/drafts.json", import.meta.url), JSON.stringify(selected, null, 1));
console.log("Wrote scripts/themealdb/cache/drafts.json");
