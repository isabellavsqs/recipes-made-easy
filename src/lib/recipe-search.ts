// Search, filters and sorting for recipe lists (PLAN.md feature 6).
// Kept free of database code so it can be tested on its own. The lists are
// small (the library plus a user's own recipes), so filtering happens here
// after one query instead of building a different query per filter.

import { COST_BRACKETS, DIET_TAGS } from "@/lib/recipe-validation";

export type SearchableRecipe = {
  title: string;
  cuisine: string | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  cost_bracket: string | null;
  diet_tags: string[];
  ingredientNames: string[];
};

export const TIME_LIMITS = [15, 30, 60] as const;
export const SORTS = ["default", "time", "cost"] as const;

export type Diet = (typeof DIET_TAGS)[number];
export type Sort = (typeof SORTS)[number];

export type RecipeQuery = {
  q: string;
  cuisine: string;
  diet: Diet | "";
  cost: string;
  maxMinutes: number | null;
  sort: Sort;
};

export const EMPTY_QUERY: RecipeQuery = {
  q: "",
  cuisine: "",
  diet: "",
  cost: "",
  maxMinutes: null,
  sort: "default",
};

type Params = Record<string, string | string[] | undefined>;

function one(params: Params, key: string): string {
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

// Reads the URL's search params. Anything unknown is ignored, so a
// hand-edited URL can't break the page.
export function parseRecipeQuery(params: Params): RecipeQuery {
  const diet = one(params, "diet");
  const cost = one(params, "cost");
  const time = Number(one(params, "time"));
  const sort = one(params, "sort");
  return {
    q: one(params, "q").slice(0, 100),
    cuisine: one(params, "cuisine"),
    diet: (DIET_TAGS as readonly string[]).includes(diet) ? (diet as Diet) : "",
    cost: (COST_BRACKETS as readonly string[]).includes(cost) ? cost : "",
    maxMinutes: (TIME_LIMITS as readonly number[]).includes(time) ? time : null,
    sort: (SORTS as readonly string[]).includes(sort) ? (sort as Sort) : "default",
  };
}

export function isFiltered(query: RecipeQuery) {
  return Boolean(query.q || query.cuisine || query.diet || query.cost || query.maxMinutes);
}

export function totalTime(recipe: Pick<SearchableRecipe, "prep_minutes" | "cook_minutes">) {
  if (recipe.prep_minutes === null && recipe.cook_minutes === null) return null;
  return (recipe.prep_minutes ?? 0) + (recipe.cook_minutes ?? 0);
}

// "Suitable for": a vegetarian can eat vegan recipes, and a pescatarian can
// eat vegetarian ones too.
export function fitsDiet(tags: string[], diet: Diet): boolean {
  if (diet === "vegan") return tags.includes("vegan");
  if (diet === "vegetarian") return tags.includes("vegetarian") || tags.includes("vegan");
  return tags.some((tag) => (DIET_TAGS as readonly string[]).includes(tag));
}

// Every word of the search has to appear in the title or in an ingredient,
// so "chicken rice" finds recipes with both.
function matchesSearch(recipe: SearchableRecipe, q: string) {
  const haystack = [recipe.title, ...recipe.ingredientNames].map((s) => s.toLowerCase());
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.some((text) => text.includes(word)));
}

const costRank = (cost: string | null) => {
  const rank = (COST_BRACKETS as readonly string[]).indexOf(cost ?? "");
  return rank === -1 ? Infinity : rank;
};

// Filters, then sorts. "default" keeps the list's own order (newest first
// for My Recipes, A to Z for Browse). Recipes missing a time or cost go last.
export function findRecipes<T extends SearchableRecipe>(recipes: T[], query: RecipeQuery): T[] {
  const found = recipes.filter((recipe) => {
    if (query.q && !matchesSearch(recipe, query.q)) return false;
    if (query.cuisine && recipe.cuisine?.toLowerCase() !== query.cuisine.toLowerCase()) return false;
    if (query.diet && !fitsDiet(recipe.diet_tags, query.diet)) return false;
    if (query.cost && recipe.cost_bracket !== query.cost) return false;
    if (query.maxMinutes !== null) {
      const minutes = totalTime(recipe);
      if (minutes === null || minutes > query.maxMinutes) return false;
    }
    return true;
  });

  if (query.sort === "default") return found;

  // Array.prototype.sort is stable, so ties keep the list's own order.
  const key =
    query.sort === "time"
      ? (r: T) => totalTime(r) ?? Infinity
      : (r: T) => costRank(r.cost_bracket);
  return [...found].sort((a, b) => {
    const [ka, kb] = [key(a), key(b)];
    return ka === kb ? 0 : ka - kb;
  });
}

// The cuisines in a list, for the cuisine dropdown ("italian" and "Italian"
// count as one).
export function cuisinesOf(recipes: SearchableRecipe[]): string[] {
  const byKey = new Map<string, string>();
  for (const recipe of recipes) {
    const cuisine = recipe.cuisine?.trim();
    if (!cuisine) continue;
    const seen = byKey.get(cuisine.toLowerCase());
    // Prefer the capitalized spelling.
    if (!seen || (seen[0] === seen[0].toLowerCase() && cuisine[0] !== cuisine[0].toLowerCase())) {
      byKey.set(cuisine.toLowerCase(), cuisine);
    }
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b));
}

// PLAN.md rules: allergies and diet are hard filters, so a recipe that
// contains one of the user's allergens, or doesn't fit their diet, is never
// shown. (Dislikes are soft and only affect suggestions.)
export function fitsProfile(
  recipe: Pick<SearchableRecipe, "diet_tags"> & { allergenIds: number[] },
  profile: { diet: Diet | "none"; allergyIds: number[] },
): boolean {
  if (profile.diet !== "none" && !fitsDiet(recipe.diet_tags, profile.diet)) return false;
  return !recipe.allergenIds.some((id) => profile.allergyIds.includes(id));
}
