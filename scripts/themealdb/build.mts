// Step 4 of the TheMealDB import (TEAM-PLAN.md §3, feature 1).
// Joins the converted recipes (cache/drafts.json), the agent's estimates
// (estimates/*.json) and Isabella's review (review.json) into
//   - supabase/seed/themealdb.json: the 300 recipes, easy to read and check
//   - supabase/migrations/006_themealdb_recipes.sql: the migration
//   - notes/themealdb-review.md: what Isabella checks before it's run
// Flagged recipes are left out of the SQL until review.json has a decision.
// Run with: node scripts/themealdb/build.mts

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { ALLERGIES, ingredientInfo, tagsFor, type ConvertedIngredient, type ConvertedMeal } from "./convert.mts";

const here = (path: string) => new URL(path, import.meta.url);
const readJson = <T,>(path: URL): T => JSON.parse(readFileSync(path, "utf8"));

// What the agent adds to each recipe (TheMealDB doesn't have it).
type Estimate = {
  servings: number;
  prep: number;
  cook: number;
  cost: "$" | "$$" | "$$$";
  appliances: string[];
  steps: string[];
  // Amounts TheMealDB is missing or got wrong: name → [quantity, unit].
  amounts?: Record<string, [number | null, string | null]>;
  // Names the import got wrong for this recipe ("corn flour" in an arepa is
  // maize flour, not cornstarch): old name → new name.
  rename?: Record<string, string>;
  // Ingredients the steps use but TheMealDB's list leaves out (eggs to coat
  // something, mayonnaise in a sauce), so their allergens are tagged too.
  add?: ConvertedIngredient[];
};
// Isabella's decision on a flagged recipe.
// Also used for the spot-check: spot_checked marks a recipe she checked.
type Decision = { load: boolean; allergens?: string[]; diet_tags?: string[]; note?: string; spot_checked?: boolean };

const drafts = readJson<ConvertedMeal[]>(here("./cache/drafts.json"));
const estimates: Record<string, Estimate> = {};
for (const file of readdirSync(here("./estimates/")).filter((f) => f.endsWith(".json")).sort()) {
  Object.assign(estimates, readJson<Record<string, Estimate>>(here(`./estimates/${file}`)));
}
const review: Record<string, Decision> = existsSync(here("./review.json")) ? readJson(here("./review.json")) : {};

const APPLIANCES = ["Stove", "Oven", "Microwave", "Air fryer"];
const problems: string[] = [];

type SeedRecipe = {
  themealdb_id: string;
  title: string;
  cuisine: string;
  prep_minutes: number;
  cook_minutes: number;
  base_servings: number;
  cost_bracket: string;
  diet_tags: string[];
  allergens: string[];
  appliances: string[];
  source_url: string | null;
  image_url: string;
  ingredients: ConvertedIngredient[];
  steps: string[];
  flags: string[];
};

const recipes: SeedRecipe[] = [];
const waiting: ConvertedMeal[] = [];
const notEstimated: ConvertedMeal[] = [];
for (const d of drafts) {
  const e = estimates[d.themealdb_id];
  if (!e) {
    notEstimated.push(d);
    continue;
  }
  const where = `${d.themealdb_id} "${d.title}"`;

  // The agent's corrections, then the tags again from the final names.
  const ingredients = [
    ...d.ingredients.map(([q, u, name]): ConvertedIngredient => {
      const fix = e.amounts?.[name];
      return [fix ? fix[0] : q, fix ? fix[1] : u, e.rename?.[name] ?? name];
    }),
    ...(e.add ?? []),
  ];
  for (const name of [...Object.keys(e.amounts ?? {}), ...Object.keys(e.rename ?? {})]) {
    if (!d.ingredients.some((i) => i[2] === name)) problems.push(`${where}: correction for unknown "${name}"`);
  }
  const infos = ingredients.map(([, , name]) => ingredientInfo(name));
  if (infos.some((i) => !i)) {
    problems.push(`${where}: no category for ${ingredients.filter((_, i) => !infos[i]).map((x) => x[2]).join(", ")}`);
    continue;
  }
  if (new Set(ingredients.map((i) => i[2].toLowerCase())).size < ingredients.length) {
    problems.push(`${where}: an ingredient is listed twice after renaming`);
  }
  const tags = tagsFor(infos as NonNullable<(typeof infos)[number]>[]);
  d.allergens = tags.allergens;
  d.diet_tags = tags.diet_tags;
  d.flags = tags.flags;

  const decision = review[d.themealdb_id];
  if (d.flags.length && !decision) {
    waiting.push(d);
    continue;
  }
  if (decision && !decision.load) continue;
  const fixed = new Set(Object.keys(e.amounts ?? {}));
  for (const p of d.problems) {
    const name = p.match(/^"(.*)" has no amount$/)?.[1];
    if (!name || !fixed.has(name)) problems.push(`${where}: ${p}`);
  }
  if (!(e.servings >= 1 && e.servings <= 100)) problems.push(`${where}: servings ${e.servings}`);
  if (!(e.prep >= 0 && e.cook >= 0)) problems.push(`${where}: times`);
  if (!["$", "$$", "$$$"].includes(e.cost)) problems.push(`${where}: cost ${e.cost}`);
  for (const a of e.appliances) if (!APPLIANCES.includes(a)) problems.push(`${where}: appliance ${a}`);
  if (e.steps.length < 2 || e.steps.some((s) => !s.trim() || s.includes("\n"))) problems.push(`${where}: steps`);

  const allergens = decision?.allergens ?? d.allergens;
  for (const a of allergens) if (!(ALLERGIES as readonly string[]).includes(a)) problems.push(`${where}: allergen ${a}`);
  recipes.push({
    themealdb_id: d.themealdb_id,
    title: d.title,
    cuisine: d.cuisine!,
    prep_minutes: e.prep,
    cook_minutes: e.cook,
    base_servings: e.servings,
    cost_bracket: e.cost,
    diet_tags: decision?.diet_tags ?? d.diet_tags,
    allergens: ALLERGIES.filter((a) => allergens.includes(a)),
    appliances: e.appliances,
    source_url: d.source_url?.startsWith("http") ? d.source_url : null,
    image_url: d.image_url!,
    ingredients,
    steps: e.steps.map((s) => s.trim()),
    flags: d.flags,
  });
}
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}

// ---------------------------------------------------------------------------
// The seed file and the SQL.
// ---------------------------------------------------------------------------

// Short arrays (an ingredient, the tags) on one line, so the file is easy to read.
const seed = JSON.stringify(recipes.map((r) => ({ ...r, flags: undefined })), null, 1).replace(
  /\[\n\s+([^[\]{}]*?)\n\s+\]/g,
  (all, inner: string) => (inner.length < 80 ? `[${inner.replace(/,\n\s+/g, ", ")}]` : all),
);
writeFileSync(here("../../supabase/seed/themealdb.json"), seed + "\n");

const q = (v: unknown) => (v === null || v === undefined ? "null" : `'${String(v).replaceAll("'", "''")}'`);
const n = (v: number | null) => (v === null ? "null" : String(v));

const names = new Map<string, string>();
for (const r of recipes) for (const [, , name] of r.ingredients) names.set(name.toLowerCase(), name);
const ingredientRows = [...names.values()].sort((a, b) => a.localeCompare(b)).map((name) => {
  const info = ingredientInfo(name)!;
  return `  (${q(name)}, ${q(info.category)}, ${info.isStaple})`;
});
const recipeRows = recipes.map((r) => {
  const instructions = r.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
  return `  (${[
    q(r.themealdb_id), q(r.title), q(r.cuisine), q(instructions), n(r.prep_minutes), n(r.cook_minutes),
    n(r.base_servings), q(r.cost_bracket), `array[${r.diet_tags.map(q).join(", ")}]::text[]`,
    q(r.source_url), q(r.image_url), q("Photo from TheMealDB"),
  ].join(", ")})`;
});
const linkRows = recipes.flatMap((r) =>
  r.ingredients.map(([qty, unit, name], i) => `  (${q(r.themealdb_id)}, ${q(name)}, ${n(qty)}, ${q(unit)}, ${i + 1})`),
);
const allergenRows = recipes.flatMap((r) => r.allergens.map((a) => `  (${q(r.themealdb_id)}, ${q(a)})`));
const applianceRows = recipes.flatMap((r) => r.appliances.map((a) => `  (${q(r.themealdb_id)}, ${q(a)})`));
const values = (rows: string[]) => (rows.length ? rows.join(",\n") : "  (null)");

const sql = `-- 006: ${recipes.length} shared recipes from TheMealDB (TEAM-PLAN.md §3, feature 1).
-- GENERATED by scripts/themealdb/build.mts from supabase/seed/themealdb.json.
-- Don't edit by hand: change the data and run the scripts again (see README).
--
-- TheMealDB's terms allow copying and changing what its API returns. The
-- instructions are reworded; servings, times, costs, appliances, diet tags
-- and allergens are estimates, and the website says so.
-- Safe to run more than once: themealdb_id stops a recipe being added twice.

begin;

alter table public.recipes add column if not exists themealdb_id text;
create unique index if not exists recipes_themealdb_id on public.recipes (themealdb_id);

-- Shared ingredients (no owner, so every user can use them).
insert into public.ingredients (name, category, is_staple) values
${values(ingredientRows)}
on conflict ((lower(name))) where created_by_user_id is null do nothing;

-- Recipes. Like the library, they have no owner and are read-only for users.
insert into public.recipes
  (themealdb_id, title, cuisine, instructions, prep_minutes, cook_minutes, base_servings,
   cost_bracket, diet_tags, source_url, image_url, image_credit, source_type)
select v.*, 'seed'
from (values
${values(recipeRows)}
) as v (themealdb_id, title, cuisine, instructions, prep_minutes, cook_minutes, base_servings,
        cost_bracket, diet_tags, source_url, image_url, image_credit)
where not exists (
  select 1 from public.recipes r where r.source_type = 'seed' and lower(r.title) = lower(v.title)
)
on conflict (themealdb_id) do nothing;

-- Ingredients of each recipe, in the order TheMealDB lists them.
insert into public.recipe_ingredients (recipe_id, ingredient_id, quantity, unit, position)
select r.id, i.id, v.quantity, v.unit, v.position
from (values
${values(linkRows)}
) as v (themealdb_id, ingredient, quantity, unit, position)
join public.recipes r on r.themealdb_id = v.themealdb_id
join public.ingredients i on i.created_by_user_id is null and lower(i.name) = lower(v.ingredient)
on conflict do nothing;

-- Allergens (a hard filter for users with allergies).
insert into public.recipe_allergen_tags (recipe_id, allergy_id)
select r.id, a.id
from (values
${values(allergenRows)}
) as v (themealdb_id, allergy)
join public.recipes r on r.themealdb_id = v.themealdb_id
join public.allergies a on a.name = v.allergy
on conflict do nothing;

-- Appliances needed.
insert into public.recipe_appliances (recipe_id, appliance_id)
select r.id, a.id
from (values
${values(applianceRows)}
) as v (themealdb_id, appliance)
join public.recipes r on r.themealdb_id = v.themealdb_id
join public.appliances a on a.name = v.appliance
on conflict do nothing;

commit;
`;
writeFileSync(here("../../supabase/migrations/006_themealdb_recipes.sql"), sql);

// ---------------------------------------------------------------------------
// The review page for Isabella (TEAM-PLAN.md §3: flagged recipes, and a
// spot-check of at least 20 recipes that weren't flagged).
// ---------------------------------------------------------------------------

const line = (r: { themealdb_id: string; title: string }) =>
  `[${r.title}](https://www.themealdb.com/meal/${r.themealdb_id}) (${r.themealdb_id})`;
const ingredientList = (list: ConvertedIngredient[]) => list.map(([, , name]) => name).join(", ");
const flagged = drafts.filter((d) => d.flags.length);
// Every 13th unflagged recipe: spread across the alphabet, the same each run.
const spotCheck = recipes.filter((r) => !r.flags.length).filter((_, i) => i % 13 === 0).slice(0, 22);

const md = `# TheMealDB import: review before loading

GENERATED by \`scripts/themealdb/build.mts\`. TEAM-PLAN.md §3 (feature 1) asks Isabella to review every
flagged recipe and to spot-check the allergens of at least 20 recipes that weren't flagged, before the
migration is run. Tags marked "may contain" were added on the safe side.

## 1. Flagged recipes (${flagged.length})

A flagged recipe isn't in the migration until \`scripts/themealdb/review.json\` has a decision for it.
${flagged.map((d) => {
  const decision = review[d.themealdb_id];
  return `
### ${line(d)}

- **Why:** ${d.flags.join("; ")}
- **Tagged now (safe side):** allergens ${d.allergens.join(", ") || "none"}; diet ${d.diet_tags.join(", ") || "none"}
- **Ingredients:** ${ingredientList(d.ingredients)}
- **Agent's recommendation:** load it with the safe-side tags above${d.flags.some((f) => f.endsWith("may contain meat")) ? " (no diet tag, because the curry paste may have shrimp paste)" : ""}. Too many tags only hide it from some users; too few could hurt someone.
- **Decision:** ${decision ? `${decision.load ? "load" : "leave out"}${decision.allergens ? `; allergens ${decision.allergens.join(", ") || "none"}` : ""}${decision.diet_tags ? `; diet ${decision.diet_tags.join(", ") || "none"}` : ""}${decision.note ? ` (${decision.note})` : ""}` : "**waiting for review**"}`;
}).join("\n")}

## 2. Spot-check (${spotCheck.length} recipes that weren't flagged)

Check that each allergen list is right for the ingredients. Mark each line when done.

${spotCheck.map((r) => {
  const decision = review[r.themealdb_id];
  return `- [${decision?.spot_checked ? "x" : " "}] ${line(r)}: **${r.allergens.join(", ") || "no allergens"}**. Ingredients: ${ingredientList(r.ingredients)}${decision?.note ? ` (${decision.note})` : ""}`;
}).join("\n")}
`;
writeFileSync(here("../../notes/themealdb-review.md"), md);

// Summary.
const veg = recipes.filter((r) => r.diet_tags.includes("vegetarian")).length;
const cuisines = new Set(recipes.map((r) => r.cuisine)).size;
console.log(
  `Wrote 006_themealdb_recipes.sql and supabase/seed/themealdb.json: ${recipes.length} recipes ` +
    `(${veg} vegetarian or vegan, ${recipes.length - veg} with meat or fish, ${cuisines} cuisines), ` +
    `${ingredientRows.length} ingredients, ${linkRows.length} recipe ingredients.`,
);
console.log(`Waiting for review: ${waiting.length}. Not estimated yet: ${notEstimated.length}.`);
console.log("Wrote notes/themealdb-review.md");
