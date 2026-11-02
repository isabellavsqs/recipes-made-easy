// The rule-based meal prep generator (PLAN.md feature 9). Kept free of
// database code so it can be tested on its own.
//
// "Cook once, eat well all week": the plan picks a few recipes that fit the
// user's profile, budget, appliances and cooking time, gives each one a block
// of days, and scales it to the portions needed.

import { COST_BRACKETS } from "@/lib/recipe-validation";
import { fitsProfile, totalTime, type Diet } from "@/lib/recipe-search";

export const LIMITS = {
  servings: [1, 10],
  days: [1, 7],
  minutes: [15, 600],
} as const;

export type PlanRequest = { servings: number; days: number; minutes: number; budget: string };

export type PlanRecipe = {
  id: number;
  title: string;
  cuisine: string | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  base_servings: number;
  cost_bracket: string | null;
  diet_tags: string[];
  allergenIds: number[];
  applianceIds: number[];
  ingredientNames: string[];
};

export type PlanProfile = {
  diet: Diet | "none";
  allergyIds: number[];
  // Empty means "not answered": appliances aren't checked then.
  applianceIds: number[];
  dislikes: string[];
  goals: string[];
};

export type PlannedRecipe<T extends PlanRecipe = PlanRecipe> = {
  recipe: T;
  days: number[];
  // Portions needed (days × servings per meal).
  portions: number;
  // How many times to make the recipe, rounded up to a half (2 = double it),
  // so there's always enough.
  scale: number;
  // Portions that scale makes (can be a little more than needed).
  makes: number;
  // Disliked ingredients this recipe has (only used when nothing else fits).
  dislikesFound: string[];
};

export type PlanResult<T extends PlanRecipe = PlanRecipe> =
  | { ok: true; items: PlannedRecipe<T>[]; totalMinutes: number }
  | { ok: false; reason: string };

// --- Checking the form ---------------------------------------------------

export type RequestResult = { ok: true; value: PlanRequest } | { ok: false; error: string };

function wholeNumber(text: string, [min, max]: readonly [number, number]) {
  const n = Number(text);
  return /^\d+$/.test(text.trim()) && n >= min && n <= max ? n : null;
}

export function validatePlanRequest(form: {
  servings: string;
  days: string;
  minutes: string;
  budget: string;
}): RequestResult {
  const servings = wholeNumber(form.servings, LIMITS.servings);
  if (servings === null) return { ok: false, error: "Servings per meal should be a whole number from 1 to 10." };
  const days = wholeNumber(form.days, LIMITS.days);
  if (days === null) return { ok: false, error: "Days should be a whole number from 1 to 7." };
  const minutes = wholeNumber(form.minutes, LIMITS.minutes);
  if (minutes === null) return { ok: false, error: "Cooking time should be between 15 and 600 minutes." };
  if (!(COST_BRACKETS as readonly string[]).includes(form.budget)) {
    return { ok: false, error: "Please choose a budget." };
  }
  return { ok: true, value: { servings, days, minutes, budget: form.budget } };
}

// --- The rules --------------------------------------------------------------

// 1–2 days: one recipe; 3–4: two; 5–7: three (variety without cooking all day).
export function recipeCount(days: number) {
  return days <= 2 ? 1 : days <= 4 ? 2 : 3;
}

const costRank = (cost: string | null) => {
  const rank = (COST_BRACKETS as readonly string[]).indexOf(cost ?? "");
  return rank === -1 ? 1 : rank; // unknown cost counts as $$
};

// How many times to make a recipe for the portions needed: rounded up to a
// half so there's always enough. Returns the scale and the portions it makes.
export function scaleFor(portions: number, baseServings: number) {
  const scale = Math.max(0.5, Math.ceil((portions / baseServings) * 2) / 2);
  return { scale, makes: Math.round(scale * baseServings * 10) / 10 };
}

export function dislikesIn(recipe: Pick<PlanRecipe, "ingredientNames">, dislikes: string[]) {
  const names = recipe.ingredientNames.map((n) => n.toLowerCase());
  return dislikes.filter((d) => names.some((name) => name.includes(d.toLowerCase())));
}

// A small seeded random generator, so "Make another plan" gives a different
// but repeatable plan.
function random(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Goals shape the order, not what's allowed (PLAN.md rules).
function score(recipe: PlanRecipe, minutes: number, goals: string[], jitter: number) {
  let s = jitter;
  if (goals.includes("Save money")) s += (2 - costRank(recipe.cost_bracket)) * 1.5;
  if (goals.includes("Save time")) s += (60 - Math.min(minutes, 120)) / 30;
  if (goals.includes("Eat healthier") && recipe.diet_tags.some((t) => t === "vegetarian" || t === "vegan")) s += 1.5;
  if (goals.includes("Improve cooking skills")) s += Math.min(minutes, 120) / 40;
  if (recipe.base_servings >= 4) s += 0.5; // batch-friendly
  return s;
}

export function generatePlan<T extends PlanRecipe>(
  recipes: T[],
  profile: PlanProfile,
  request: PlanRequest,
  seed = 1,
  // Recipes from the previous plan: "Make another plan" tries other ones first.
  avoidIds: number[] = [],
): PlanResult<T> {
  // Hard rules, one at a time, so the message can say which one left nothing.
  const steps: [string, (r: T) => boolean][] = [
    // A dish for one (like an omelette) isn't something to batch-cook.
    ["are made for batch cooking", (r) => r.base_servings > 1],
    ["fit your diet and allergies", (r) => fitsProfile(r, profile)],
    [`fit a ${request.budget} budget`, (r) => costRank(r.cost_bracket) <= costRank(request.budget)],
    [
      "can be made with your appliances",
      (r) => profile.applianceIds.length === 0 || r.applianceIds.every((id) => profile.applianceIds.includes(id)),
    ],
    [`take ${request.minutes} minutes or less`, (r) => (totalTime(r) ?? Infinity) <= request.minutes],
  ];
  let pool = recipes;
  const passed: string[] = [];
  for (const [label, rule] of steps) {
    pool = pool.filter(rule);
    if (pool.length === 0) {
      const before = passed.length ? ` that ${passed.join(", ")} and` : " that";
      return {
        ok: false,
        reason: `No recipes${before} ${label}. Try more time, a higher budget, or fewer restrictions in your Profile.`,
      };
    }
    passed.push(label);
  }

  const rand = random(seed);
  const ranked = pool
    .map((recipe) => ({ recipe, minutes: totalTime(recipe)!, s: 0 }))
    .map((c) => ({
      ...c,
      s: score(c.recipe, c.minutes, profile.goals, rand() * 1.5) - (avoidIds.includes(c.recipe.id) ? 5 : 0),
    }))
    .sort((a, b) => b.s - a.s);

  const wanted = recipeCount(request.days);
  const picked: typeof ranked = [];
  let used = 0;
  const tryAdd = (c: (typeof ranked)[number], newCuisineOnly: boolean) => {
    if (picked.length >= wanted || picked.includes(c) || used + c.minutes > request.minutes) return;
    const cuisine = c.recipe.cuisine?.toLowerCase();
    if (newCuisineOnly && cuisine && picked.some((p) => p.recipe.cuisine?.toLowerCase() === cuisine)) return;
    picked.push(c);
    used += c.minutes;
  };
  // Prefer recipes without dislikes and from different cuisines, then relax.
  const clean = ranked.filter((c) => dislikesIn(c.recipe, profile.dislikes).length === 0);
  for (const c of clean) tryAdd(c, true);
  for (const c of clean) tryAdd(c, false);
  for (const c of ranked) tryAdd(c, false);

  // Split the days into blocks: 5 days with 3 recipes -> days 1–2, 3–4, 5.
  const base = Math.floor(request.days / picked.length);
  const extra = request.days % picked.length;
  let day = 1;
  const items = picked.map((c, i) => {
    const count = base + (i < extra ? 1 : 0);
    const days = Array.from({ length: count }, () => day++);
    const portions = count * request.servings;
    return {
      recipe: c.recipe,
      days,
      portions,
      ...scaleFor(portions, c.recipe.base_servings),
      dislikesFound: dislikesIn(c.recipe, profile.dislikes),
    };
  });

  return { ok: true, items, totalMinutes: used };
}

// --- Shopping list -----------------------------------------------------------

export type PlanIngredient = { name: string; quantity: number | null; unit: string | null; isStaple: boolean };
export type ShoppingItem = { name: string; quantity: number | null; unit: string | null };

// Adds up the scaled ingredients of every recipe in the plan. Same name and
// unit are combined; staples (spices, oils, salt…) go in a separate list.
export function buildShoppingList(recipes: { scale: number; ingredients: PlanIngredient[] }[]) {
  const toBuy = new Map<string, ShoppingItem>();
  const staples = new Map<string, string>();
  for (const { scale, ingredients } of recipes) {
    for (const ing of ingredients) {
      if (ing.isStaple) {
        staples.set(ing.name.toLowerCase(), ing.name);
        continue;
      }
      const key = `${ing.name.toLowerCase()}|${ing.unit ?? ""}`;
      const item = toBuy.get(key) ?? { name: ing.name, quantity: null, unit: ing.unit };
      if (ing.quantity !== null) {
        item.quantity = Math.round(((item.quantity ?? 0) + ing.quantity * scale) * 100) / 100;
      }
      toBuy.set(key, item);
    }
  }
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
  return {
    toBuy: [...toBuy.values()].sort(byName),
    staples: [...staples.values()].sort((a, b) => a.localeCompare(b)),
  };
}
