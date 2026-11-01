// Turns supabase/seed/library.json into supabase/migrations/003_recipe_library.sql
// and 004_ingredient_order.sql.
// Run with: node scripts/build-library-sql.mjs
// The SQL is safe to run more than once: it skips recipes and ingredients
// that already exist.

import { readFileSync, writeFileSync } from "node:fs";

const recipes = JSON.parse(
  readFileSync(new URL("../supabase/seed/library.json", import.meta.url), "utf8"),
);

// Every shared ingredient with its category. Staples (spices, oils, butter,
// salt, water) are ignored when comparing a recipe with the user's fridge.
const STAPLES = new Set([
  "allspice", "baking powder", "baking soda", "black pepper", "butter",
  "cayenne pepper", "chili powder", "curry powder", "dried oregano",
  "dried thyme", "garam masala", "garlic powder", "ground cardamom",
  "ground cinnamon", "ground cloves", "ground coriander", "ground cumin",
  "ground nutmeg", "Italian seasoning", "Old Bay seasoning", "olive oil",
  "onion powder", "paprika", "red pepper flakes", "salt", "smoked paprika",
  "taco seasoning", "turmeric", "vegetable oil", "water", "white pepper",
]);

const CATEGORIES = {
  protein: [
    "bacon", "canned salmon", "chicken breast", "chicken thighs", "eggs",
    "extra-firm tofu", "ground beef", "ground turkey", "salmon fillet", "shrimp",
  ],
  dairy: [
    "almond milk", "cheddar cheese", "cotija cheese", "feta cheese",
    "Gruyère cheese", "heavy cream", "milk", "mozzarella cheese",
    "parmesan cheese", "plain yogurt", "shredded cheese", "sour cream",
  ],
  vegetable: [
    "avocado", "baby spinach", "bean sprouts", "bell pepper", "bok choy",
    "broccolini", "cabbage", "carrot", "celery", "cherry tomatoes", "corn",
    "cucumber", "eggplant", "garlic", "green beans", "green chilies",
    "green onions", "jalapeño", "Japanese eggplant", "kale", "mushrooms",
    "onion", "peas", "poblano pepper", "red onion", "romaine lettuce",
    "shallots", "snow peas", "sweet potatoes", "tomatoes", "zucchini",
  ],
  fruit: ["apple", "banana", "blueberries", "lemon", "lemon juice", "lime"],
  herb: [
    "bay leaves", "cilantro", "fresh basil", "fresh dill", "fresh ginger",
    "fresh mint", "fresh thyme", "kaffir lime leaves", "parsley", "Thai basil",
  ],
  legume: [
    "black beans", "brown lentils", "cannellini beans", "chickpeas",
    "dried chickpeas", "kidney beans", "pinto beans", "refried beans",
  ],
  grain: [
    "all-purpose flour", "basmati rice", "corn tortillas", "crusty bread",
    "ditalini pasta", "elbow macaroni", "flour tortillas", "jasmine rice",
    "linguine", "panko breadcrumbs", "pie crust", "pita bread",
    "ramen noodles", "rolled oats", "spaghetti", "white rice",
  ],
  pantry: [
    "black olives", "brown sugar", "canned diced tomatoes", "chia seeds",
    "chicken broth", "chipotle peppers in adobo", "coconut milk",
    "cornstarch", "crushed tomatoes", "Dijon mustard", "fish sauce",
    "green curry paste", "hummus", "kalamata olives", "maple syrup",
    "mayonnaise", "mirin", "oyster sauce", "pickled ginger",
    "red wine vinegar", "rice vinegar", "sake", "salsa", "sesame oil",
    "sesame seeds", "soy sauce", "sugar", "tomato paste", "tomato puree",
    "vanilla extract", "vegetable broth", "white wine",
  ],
};

const ALLERGIES = ["Milk", "Eggs", "Fish", "Shellfish", "Tree nuts", "Peanuts", "Wheat", "Soy", "Sesame"];
const APPLIANCES = ["Stove", "Oven", "Microwave", "Air fryer"];
const COSTS = ["$", "$$", "$$$"];
const DIETS = ["vegan", "vegetarian", "pescatarian"];

const categoryOf = new Map();
for (const [category, names] of Object.entries(CATEGORIES)) {
  for (const name of names) categoryOf.set(name, category);
}
for (const name of STAPLES) categoryOf.set(name, "staple");

// Check the data before writing any SQL.
const problems = [];
const titles = new Set();
for (const r of recipes) {
  const where = `"${r.title}"`;
  if (titles.has(r.title)) problems.push(`${where} is listed twice`);
  titles.add(r.title);
  if (!r.source_url?.startsWith("https://")) problems.push(`${where} needs a source_url`);
  if (!COSTS.includes(r.cost_bracket)) problems.push(`${where} has cost ${r.cost_bracket}`);
  for (const d of r.diet_tags) if (!DIETS.includes(d)) problems.push(`${where} has diet ${d}`);
  for (const a of r.allergens) if (!ALLERGIES.includes(a)) problems.push(`${where} has allergen ${a}`);
  for (const a of r.appliances) if (!APPLIANCES.includes(a)) problems.push(`${where} has appliance ${a}`);
  if (!(r.base_servings > 0)) problems.push(`${where} needs servings`);
  if (r.steps.length === 0) problems.push(`${where} needs steps`);
  const seen = new Set();
  for (const [quantity, , name] of r.ingredients) {
    if (!categoryOf.has(name)) problems.push(`${where}: no category for "${name}"`);
    if (seen.has(name.toLowerCase())) problems.push(`${where}: "${name}" listed twice`);
    seen.add(name.toLowerCase());
    if (quantity !== null && !(quantity > 0)) problems.push(`${where}: bad amount for "${name}"`);
  }
}
for (const name of categoryOf.keys()) {
  if (!recipes.some((r) => r.ingredients.some((i) => i[2] === name))) {
    problems.push(`"${name}" isn't used by any recipe`);
  }
}
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}

const q = (value) =>
  value === null || value === undefined ? "null" : `'${String(value).replaceAll("'", "''")}'`;
const n = (value) => (value === null ? "null" : String(value));
const imageUrl = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

const ingredientRows = [...categoryOf.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([name, category]) => `  (${q(name)}, ${q(category)}, ${STAPLES.has(name)})`);

const recipeRows = recipes.map((r) => {
  const instructions = r.steps.map((step, i) => `${i + 1}. ${step}`).join("\n");
  const tags = `array[${r.diet_tags.map(q).join(", ")}]::text[]`;
  return `  (${[
    q(r.title), q(r.cuisine), q(instructions), n(r.prep_minutes), n(r.cook_minutes),
    n(r.base_servings), q(r.cost_bracket), tags, q(r.source_url),
    q(imageUrl(r.photo[0])), q(`Photo by ${r.photo[1]} on Unsplash`),
  ].join(", ")})`;
});

const linkRows = recipes.flatMap((r) =>
  r.ingredients.map(([quantity, unit, name]) => `  (${q(r.title)}, ${q(name)}, ${n(quantity)}, ${q(unit)})`),
);
const allergenRows = recipes.flatMap((r) => r.allergens.map((a) => `  (${q(r.title)}, ${q(a)})`));
const applianceRows = recipes.flatMap((r) => r.appliances.map((a) => `  (${q(r.title)}, ${q(a)})`));

const sql = `-- 003: the shared recipe library (${recipes.length} recipes collected from the internet).
-- GENERATED by scripts/build-library-sql.mjs from supabase/seed/library.json.
-- Don't edit by hand: change the JSON and run the script again.
--
-- Each recipe keeps its source link; the instructions are rewritten in our
-- own words. Photos are free Unsplash photos, credited on the recipe page.
-- Safe to run more than once: existing rows are skipped.

begin;

-- Shared ingredients (no owner, so every user can use them).
insert into public.ingredients (name, category, is_staple) values
${ingredientRows.join(",\n")}
on conflict ((lower(name))) where created_by_user_id is null do nothing;

-- Recipes. Seed recipes have no owner and are read-only for users.
insert into public.recipes
  (title, cuisine, instructions, prep_minutes, cook_minutes, base_servings,
   cost_bracket, diet_tags, source_url, image_url, image_credit, source_type)
select v.*, 'seed'
from (values
${recipeRows.join(",\n")}
) as v (title, cuisine, instructions, prep_minutes, cook_minutes, base_servings,
        cost_bracket, diet_tags, source_url, image_url, image_credit)
where not exists (
  select 1 from public.recipes r where r.source_type = 'seed' and r.title = v.title
);

-- Ingredients of each recipe.
insert into public.recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
select r.id, i.id, v.quantity, v.unit
from (values
${linkRows.join(",\n")}
) as v (title, ingredient, quantity, unit)
join public.recipes r on r.source_type = 'seed' and r.title = v.title
join public.ingredients i on i.created_by_user_id is null and lower(i.name) = lower(v.ingredient)
on conflict do nothing;

-- Allergens (a hard filter for users with allergies).
insert into public.recipe_allergen_tags (recipe_id, allergy_id)
select r.id, a.id
from (values
${allergenRows.join(",\n")}
) as v (title, allergy)
join public.recipes r on r.source_type = 'seed' and r.title = v.title
join public.allergies a on a.name = v.allergy
on conflict do nothing;

-- Appliances needed.
insert into public.recipe_appliances (recipe_id, appliance_id)
select r.id, a.id
from (values
${applianceRows.join(",\n")}
) as v (title, appliance)
join public.recipes r on r.source_type = 'seed' and r.title = v.title
join public.appliances a on a.name = v.appliance
on conflict do nothing;

commit;
`;

// 004 adds the order of ingredients (003 was already run when this was
// added, so the order lives in its own migration).
const positionRows = recipes.flatMap((r) =>
  r.ingredients.map(([, , name], i) => `  (${q(r.title)}, ${q(name)}, ${i + 1})`),
);

const orderSql = `-- 004: keep ingredients in the order they were written.
-- GENERATED by scripts/build-library-sql.mjs from supabase/seed/library.json.
-- Without this column, ingredients came back in database order (for the
-- library that was alphabetical, so "black pepper" came before "chicken").
-- Safe to run more than once.

begin;

alter table public.recipe_ingredients add column if not exists position int;

-- Library recipes: the order from the original recipe.
update public.recipe_ingredients ri
set position = v.position
from (values
${positionRows.join(",\n")}
) as v (title, ingredient, position)
join public.recipes r on r.source_type = 'seed' and r.title = v.title
join public.ingredients i on i.created_by_user_id is null and lower(i.name) = lower(v.ingredient)
where ri.recipe_id = r.id and ri.ingredient_id = i.id;

-- Recipes users already saved: best guess is the order the rows were added.
-- (Saving a recipe again stores the order from the form.)
update public.recipe_ingredients ri
set position = numbered.n
from (
  select recipe_id, ingredient_id,
         row_number() over (partition by recipe_id order by ctid) as n
  from public.recipe_ingredients
) as numbered
where ri.position is null
  and ri.recipe_id = numbered.recipe_id and ri.ingredient_id = numbered.ingredient_id;

commit;
`;

writeFileSync(new URL("../supabase/migrations/003_recipe_library.sql", import.meta.url), sql);
writeFileSync(new URL("../supabase/migrations/004_ingredient_order.sql", import.meta.url), orderSql);
console.log(
  `Wrote 003_recipe_library.sql: ${recipes.length} recipes, ${ingredientRows.length} ingredients, ${linkRows.length} recipe ingredients.`,
);
console.log(`Wrote 004_ingredient_order.sql: ${positionRows.length} positions.`);
