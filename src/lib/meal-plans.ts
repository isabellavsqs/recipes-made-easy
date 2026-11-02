import "server-only";
import { requireUser } from "@/lib/auth";
import {
  buildShoppingList,
  dislikesIn,
  generatePlan,
  scaleFor,
  type PlanIngredient,
  type PlanRecipe,
  type PlanRequest,
} from "@/lib/meal-plan-generator";
import { getProfile, type Profile } from "@/lib/profile";
import type { Diet } from "@/lib/recipe-search";
import { createClient } from "@/lib/supabase/server";

// Meal prep plans (PLAN.md feature 9): generate, save, show, delete. Every
// query is filtered by the logged-in user, and RLS checks it again.

type CandidateRow = Omit<PlanRecipe, "allergenIds" | "applianceIds" | "ingredientNames"> & {
  recipe_allergen_tags: { allergy_id: number }[];
  recipe_appliances: { appliance_id: number }[];
  recipe_ingredients: { ingredients: { name: string } }[];
};

const CANDIDATE_COLUMNS = `id, title, cuisine, prep_minutes, cook_minutes, base_servings, cost_bracket, diet_tags,
  recipe_allergen_tags (allergy_id), recipe_appliances (appliance_id), recipe_ingredients (ingredients (name))`;

function planProfile(profile: Profile) {
  return {
    diet: profile.diet as Diet | "none",
    allergyIds: profile.allergies.map((a) => a.id),
    applianceIds: profile.appliances.map((a) => a.id),
    dislikes: profile.dislikes,
    goals: profile.goals.map((g) => g.name),
  };
}

// Generates a plan from the library plus the user's own recipes and saves
// it. Returns the new plan's id, or the reason no plan could be made.
export async function createMealPlan(
  request: PlanRequest,
  seed: number,
  avoidIds: number[] = [],
): Promise<{ id: number } | { error: string }> {
  const user = await requireUser();
  const supabase = await createClient();
  const [profile, candidates] = await Promise.all([
    getProfile(),
    // RLS returns exactly the library plus this user's own recipes.
    supabase.from("recipes").select(CANDIDATE_COLUMNS),
  ]);
  if (candidates.error) throw candidates.error;

  const recipes: PlanRecipe[] = (candidates.data as unknown as CandidateRow[]).map(
    ({ recipe_allergen_tags, recipe_appliances, recipe_ingredients, ...recipe }) => ({
      ...recipe,
      allergenIds: recipe_allergen_tags.map((t) => t.allergy_id),
      applianceIds: recipe_appliances.map((a) => a.appliance_id),
      ingredientNames: recipe_ingredients.map((ri) => ri.ingredients.name),
    }),
  );

  const plan = generatePlan(recipes, planProfile(profile), request, seed, avoidIds);
  if (!plan.ok) return { error: plan.reason };

  const { data: saved, error } = await supabase
    .from("meal_plans")
    .insert({
      user_id: user.id,
      servings_per_meal: request.servings,
      days: request.days,
      time_available_minutes: request.minutes,
      budget_bracket: request.budget,
    })
    .select("id")
    .single();
  if (error) throw error;

  const { error: itemsError } = await supabase.from("meal_plan_items").insert(
    plan.items.flatMap((item) =>
      item.days.map((day) => ({ meal_plan_id: saved.id, recipe_id: item.recipe.id, day_number: day })),
    ),
  );
  if (itemsError) {
    await supabase.from("meal_plans").delete().eq("id", saved.id);
    throw itemsError;
  }
  return { id: saved.id };
}

export type MealPlanSummary = {
  id: number;
  days: number;
  servings: number;
  createdAt: string;
  titles: string[];
};

export async function listMealPlans(): Promise<MealPlanSummary[]> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meal_plans")
    .select("id, days, servings_per_meal, created_at, meal_plan_items (day_number, recipes (title))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;

  type Row = {
    id: number;
    days: number;
    servings_per_meal: number;
    created_at: string;
    meal_plan_items: { day_number: number; recipes: { title: string } | null }[];
  };
  return (data as unknown as Row[]).map((row) => ({
    id: row.id,
    days: row.days,
    servings: row.servings_per_meal,
    createdAt: row.created_at,
    titles: [
      ...new Set(
        [...row.meal_plan_items]
          .sort((a, b) => a.day_number - b.day_number)
          .map((item) => item.recipes?.title ?? "A deleted recipe"),
      ),
    ],
  }));
}

export type MealPlanRecipe = {
  id: number;
  title: string;
  image_url: string | null;
  cuisine: string | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  base_servings: number;
  cost_bracket: string | null;
  days: number[];
  portions: number;
  scale: number;
  makes: number;
  dislikesFound: string[];
  ingredients: PlanIngredient[];
};

export type MealPlan = {
  id: number;
  days: number;
  servings: number;
  minutes: number | null;
  budget: string | null;
  createdAt: string;
  recipes: MealPlanRecipe[];
  shopping: ReturnType<typeof buildShoppingList>;
};

// One saved plan with its recipes, amounts and shopping list, or null if it
// doesn't exist or isn't this user's.
export async function getMealPlan(id: number): Promise<MealPlan | null> {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data, error }, profile] = await Promise.all([
    supabase
      .from("meal_plans")
      .select(
        `id, days, servings_per_meal, time_available_minutes, budget_bracket, created_at,
         meal_plan_items (day_number, recipes (id, title, image_url, cuisine, prep_minutes, cook_minutes,
           base_servings, cost_bracket, recipe_ingredients (quantity, unit, position, ingredients (name, is_staple))))`,
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    getProfile(),
  ]);
  if (error) throw error;
  if (!data) return null;

  type RecipeRow = Omit<MealPlanRecipe, "days" | "portions" | "scale" | "makes" | "dislikesFound" | "ingredients"> & {
    recipe_ingredients: {
      quantity: number | null;
      unit: string | null;
      position: number | null;
      ingredients: { name: string; is_staple: boolean };
    }[];
  };
  const row = data as unknown as {
    id: number;
    days: number;
    servings_per_meal: number;
    time_available_minutes: number | null;
    budget_bracket: string | null;
    created_at: string;
    meal_plan_items: { day_number: number; recipes: RecipeRow | null }[];
  };

  // Group the days by recipe, in day order. (A recipe deleted since then has
  // no row any more and is left out.)
  const byRecipe = new Map<number, { recipe: RecipeRow; days: number[] }>();
  for (const item of [...row.meal_plan_items].sort((a, b) => a.day_number - b.day_number)) {
    if (!item.recipes) continue;
    const group = byRecipe.get(item.recipes.id) ?? { recipe: item.recipes, days: [] };
    group.days.push(item.day_number);
    byRecipe.set(item.recipes.id, group);
  }

  const recipes = [...byRecipe.values()].map(({ recipe, days }) => {
    const { recipe_ingredients, ...rest } = recipe;
    const portions = days.length * row.servings_per_meal;
    const ingredients = [...recipe_ingredients]
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((ri) => ({
        name: ri.ingredients.name,
        quantity: ri.quantity,
        unit: ri.unit,
        isStaple: ri.ingredients.is_staple,
      }));
    return {
      ...rest,
      days,
      portions,
      ...scaleFor(portions, recipe.base_servings),
      dislikesFound: dislikesIn({ ingredientNames: ingredients.map((i) => i.name) }, profile.dislikes),
      ingredients,
    };
  });

  return {
    id: row.id,
    days: row.days,
    servings: row.servings_per_meal,
    minutes: row.time_available_minutes,
    budget: row.budget_bracket,
    createdAt: row.created_at,
    recipes,
    shopping: buildShoppingList(recipes),
  };
}

export async function deleteMealPlan(id: number): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("meal_plans").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;
}
