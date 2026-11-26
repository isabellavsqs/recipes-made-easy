// Step 3 of the TheMealDB import (TEAM-PLAN.md §3, feature 1).
// TheMealDB has no servings or cooking times, so for each chosen recipe
// with a link to the original, this reads the servings and times the
// original page publishes for search engines (schema.org "Recipe" data).
// The agent uses them when it estimates; recipes without them are estimated
// from the ingredients and steps.
// Run with: node scripts/themealdb/sources.mts

import { readFileSync, writeFileSync } from "node:fs";

type Draft = { themealdb_id: string; source_url: string | null };
type Found = { servings?: string; prep?: string; cook?: string; total?: string; error?: string };

const drafts: Draft[] = JSON.parse(readFileSync(new URL("./cache/drafts.json", import.meta.url), "utf8"));

function findRecipe(node: unknown): Record<string, unknown> | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const r = findRecipe(n);
      if (r) return r;
    }
    return null;
  }
  const obj = node as Record<string, unknown>;
  const type = obj["@type"];
  if (type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"))) return obj;
  return findRecipe(obj["@graph"]);
}

async function read(url: string): Promise<Found> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
      headers: { "user-agent": "Mozilla/5.0 (compatible; recipes-made-easy class project)" },
    });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const html = await res.text();
    for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
      try {
        const recipe = findRecipe(JSON.parse(m[1]));
        if (!recipe) continue;
        const y = recipe.recipeYield;
        return {
          servings: Array.isArray(y) ? y.join(" / ") : y ? String(y) : undefined,
          prep: recipe.prepTime as string | undefined,
          cook: recipe.cookTime as string | undefined,
          total: recipe.totalTime as string | undefined,
        };
      } catch {
        // Some sites publish broken JSON; try the next block.
      }
    }
    return { error: "no recipe data on the page" };
  } catch (e) {
    return { error: (e as Error).name === "TimeoutError" ? "timeout" : (e as Error).message };
  }
}

const results: Record<string, Found> = {};
const queue = drafts.filter((d) => d.source_url?.startsWith("http"));
await Promise.all(
  Array.from({ length: 4 }, async () => {
    for (let d = queue.shift(); d; d = queue.shift()) results[d.themealdb_id] = await read(d.source_url!);
  }),
);
writeFileSync(new URL("./cache/sources.json", import.meta.url), JSON.stringify(results, null, 1));
const found = Object.values(results).filter((r) => r.servings || r.total || r.cook).length;
console.log(`${Object.keys(results).length} links checked, ${found} had servings or times.`);
