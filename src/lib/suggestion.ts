// "What can I cook with what's in my fridge?" (PLAN.md feature 10). Kept
// free of database code so it can be tested on its own.
//
// Staples (spices, oils, butter, salt…) never count: everyone is assumed to
// have them. Ingredients without an amount ("parmesan, to serve") are
// treated as optional.

import { dislikesIn } from "@/lib/meal-plan-generator";
import { fitsProfile, totalTime, type Diet } from "@/lib/recipe-search";

export const MAX_FRIDGE_ITEMS = 30;

export type SuggestIngredient = {
  name: string;
  quantity: number | null;
  isStaple: boolean;
  // "protein" ingredients (meat, fish, tofu, eggs) are usually what a meal
  // is built around, so using one from the fridge counts extra.
  category: string | null;
};

export type SuggestRecipe = {
  id: number;
  title: string;
  cuisine: string | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  cost_bracket: string | null;
  diet_tags: string[];
  allergenIds: number[];
  applianceIds: number[];
  ingredients: SuggestIngredient[];
};

export type SuggestProfile = {
  diet: Diet | "none";
  allergyIds: number[];
  applianceIds: number[];
  dislikes: string[];
  goals: string[];
};

export type Suggestion<T extends SuggestRecipe = SuggestRecipe> = {
  recipe: T;
  // Recipe ingredients covered by the fridge.
  using: string[];
  // Needed ingredients that aren't in the fridge (the shopping list).
  toBuy: string[];
  // Optional ingredients that aren't in the fridge.
  optional: string[];
  dislikesFound: string[];
};

export type SuggestResult<T extends SuggestRecipe = SuggestRecipe> = {
  ready: Suggestion<T>[];
  needShopping: Suggestion<T>[];
};

// "Tomatoes" → "tomato", "Green Onions" → "green onion".
function singular(word: string) {
  const w = word.trim().toLowerCase().replace(/\s+/g, " ");
  if (w.endsWith("oes")) return w.slice(0, -2);
  if (w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

// Ingredients ending in one of these are a different product: "rice" isn't
// "rice vinegar" and "tomato" isn't "tomato paste".
const PRODUCT_WORDS = ["vinegar", "paste", "powder", "sauce", "broth", "oil", "seasoning", "extract", "flake", "seed"];

// Other names people type for the same thing.
const ALSO_CALLED: Record<string, string[]> = {
  pasta: ["spaghetti", "linguine", "macaroni"],
  noodle: ["ramen"],
  scallion: ["green onion"],
  capsicum: ["bell pepper"],
  prawn: ["shrimp"],
  coriander: ["cilantro"],
  aubergine: ["eggplant"],
  courgette: ["zucchini"],
};

// The fridge item matches when its words appear in the ingredient's name, so
// "chicken" covers "chicken thighs" and "tomato" covers "cherry tomatoes".
// (It's loose on purpose: "onion" also covers "green onions".)
export function matches(fridgeItem: string, ingredientName: string): boolean {
  const item = singular(fridgeItem);
  if (ALSO_CALLED[item]?.some((other) => matches(other, ingredientName))) return true;
  const wanted = item.split(" ");
  const have = singular(ingredientName).split(" ").map(singular);
  const last = have[have.length - 1];
  if (PRODUCT_WORDS.includes(last) && !wanted.includes(last)) return false;
  return wanted.length > 0 && wanted.every((w) => have.includes(w));
}

// Cleans the typed list: trims, drops blanks and repeats, keeps the first 30.
export function cleanFridge(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const item = raw.trim().replace(/\s+/g, " ").slice(0, 50);
    if (!item || seen.has(singular(item))) continue;
    seen.add(singular(item));
    out.push(item);
  }
  return out.slice(0, MAX_FRIDGE_ITEMS);
}

const COST = ["$", "$$", "$$$"];

export function suggestRecipes<T extends SuggestRecipe>(
  recipes: T[],
  fridge: string[],
  profile: SuggestProfile,
  canShop: boolean,
): SuggestResult<T> {
  const allowed = recipes.filter(
    (r) =>
      fitsProfile(r, profile) &&
      (profile.applianceIds.length === 0 || r.applianceIds.every((id) => profile.applianceIds.includes(id))),
  );

  const scored = allowed.map((recipe) => {
    const using: string[] = [];
    const toBuy: string[] = [];
    const optional: string[] = [];
    let usesProtein = false;
    for (const ing of recipe.ingredients) {
      if (ing.isStaple) continue;
      const covered = fridge.some((item) => matches(item, ing.name));
      if (covered) {
        using.push(ing.name);
        if (ing.category === "protein") usesProtein = true;
      } else if (ing.quantity === null) optional.push(ing.name);
      else toBuy.push(ing.name);
    }
    // How well it uses the fridge (less waste), especially the main ingredient.
    const fit = using.length * 2 + (usesProtein ? 3 : 0) - toBuy.length;
    return {
      recipe,
      using,
      toBuy,
      optional,
      fit,
      usesProtein,
      dislikesFound: dislikesIn({ ingredientNames: recipe.ingredients.map((i) => i.name) }, profile.dislikes),
    };
  });

  // Then no dislikes, then the user's goals (quicker for "Save time",
  // cheaper for "Save money").
  const goalKey = (s: (typeof scored)[number]) =>
    (profile.goals.includes("Save time") ? (totalTime(s.recipe) ?? 999) : 0) +
    (profile.goals.includes("Save money") ? COST.indexOf(s.recipe.cost_bracket ?? "$$") * 30 : 0);
  // Can shop: best use of the fridge first. Can't shop: fewest things to
  // buy first. (Either way the missing items are listed, as PLAN.md asks.)
  const order = (a: (typeof scored)[number], b: (typeof scored)[number]) =>
    (canShop ? b.fit - a.fit : a.toBuy.length - b.toBuy.length || b.fit - a.fit) ||
    a.dislikesFound.length - b.dislikesFound.length ||
    goalKey(a) - goalKey(b) ||
    a.recipe.title.localeCompare(b.recipe.title);

  // Only recipes that really use the fridge: its main ingredient, or at
  // least 2 of its items (so garlic alone isn't enough).
  const useful = scored
    .filter((s) => s.usesProtein || s.using.length >= Math.min(2, fridge.length))
    .sort(order);
  const ready = useful.filter((s) => s.toBuy.length === 0);
  const needShopping = useful.filter((s) => s.toBuy.length > 0);

  return { ready: ready.slice(0, 6), needShopping: needShopping.slice(0, 6) };
}
