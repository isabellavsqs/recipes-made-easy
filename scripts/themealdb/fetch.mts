// Step 1 of the TheMealDB import (TEAM-PLAN.md §3, feature 1).
// Downloads every recipe, letter by letter, into scripts/themealdb/cache/
// (ignored by git). Users never call TheMealDB: this runs once, by hand.
// Run with: node scripts/themealdb/fetch.ts

import { mkdirSync, writeFileSync } from "node:fs";

// "1" is TheMealDB's public test key, meant for development and education.
const API = "https://www.themealdb.com/api/json/v1/1";

const meals: Record<string, unknown>[] = [];
let requests = 0;
for (const letter of "abcdefghijklmnopqrstuvwxyz") {
  const res = await fetch(`${API}/search.php?f=${letter}`);
  requests++;
  if (!res.ok) throw new Error(`TheMealDB answered ${res.status} for letter ${letter}`);
  const body = (await res.json()) as { meals: Record<string, unknown>[] | null };
  meals.push(...(body.meals ?? []));
  await new Promise((r) => setTimeout(r, 300)); // be gentle with a free service
}

const cache = new URL("./cache/", import.meta.url);
mkdirSync(cache, { recursive: true });
writeFileSync(new URL("meals.json", cache), JSON.stringify(meals, null, 1));
console.log(`${requests} requests, ${meals.length} recipes saved to scripts/themealdb/cache/meals.json`);
