import "server-only";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Every function here starts from the logged-in user. Row Level Security in
// the database is the second safety net (see schema.md).

export const COST_BRACKETS = ["$", "$$", "$$$"] as const;
export const DIET_TAGS = ["vegan", "vegetarian", "pescatarian"] as const;

export type Option = { id: number; name: string };

export type RecipeSummary = {
  id: number;
  title: string;
  cuisine: string | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  base_servings: number;
  cost_bracket: string | null;
  diet_tags: string[];
  image_url: string | null;
  created_at: string;
};

export type RecipeIngredient = {
  name: string;
  quantity: number | null;
  unit: string | null;
};

export type Recipe = RecipeSummary & {
  instructions: string;
  source_type: string;
  source_url: string | null;
  image_credit: string | null;
  created_by_user_id: string | null;
  ingredients: RecipeIngredient[];
  allergens: Option[];
  appliances: Option[];
  isMine: boolean;
};

// What the recipe form sends to saveRecipe().
export type RecipeInput = {
  title: string;
  cuisine: string | null;
  instructions: string;
  prep_minutes: number | null;
  cook_minutes: number | null;
  base_servings: number;
  cost_bracket: string | null;
  diet_tags: string[];
  ingredients: RecipeIngredient[];
  allergenIds: number[];
  applianceIds: number[];
};

const SUMMARY_COLUMNS =
  "id, title, cuisine, prep_minutes, cook_minutes, base_servings, cost_bracket, diet_tags, image_url, created_at";

// "My Recipes": only recipes this user created, never the shared library.
export async function listMyRecipes(): Promise<RecipeSummary[]> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(SUMMARY_COLUMNS)
    .eq("created_by_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

// One recipe with its ingredients, allergens and appliances, or null if it
// doesn't exist or this user isn't allowed to see it.
export async function getRecipe(id: number): Promise<Recipe | null> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(
      `${SUMMARY_COLUMNS}, instructions, source_type, source_url, image_credit, created_by_user_id,
       recipe_ingredients (quantity, unit, ingredients (name)),
       recipe_allergen_tags (allergies (id, name)),
       recipe_appliances (appliances (id, name))`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  // Without generated database types, Supabase can't tell that each link
  // points to exactly one row, so the shape is spelled out here.
  const {
    recipe_ingredients,
    recipe_allergen_tags,
    recipe_appliances,
    ...recipe
  } = data as unknown as Omit<Recipe, "ingredients" | "allergens" | "appliances" | "isMine"> & {
    recipe_ingredients: { quantity: number | null; unit: string | null; ingredients: { name: string } }[];
    recipe_allergen_tags: { allergies: Option }[];
    recipe_appliances: { appliances: Option }[];
  };

  return {
    ...recipe,
    ingredients: recipe_ingredients.map((ri) => ({
      name: ri.ingredients.name,
      quantity: ri.quantity,
      unit: ri.unit,
    })),
    allergens: recipe_allergen_tags.map((t) => t.allergies),
    appliances: recipe_appliances.map((a) => a.appliances),
    isMine: recipe.created_by_user_id === user.id,
  };
}

export async function getFormOptions(): Promise<{
  allergies: Option[];
  appliances: Option[];
}> {
  const supabase = await createClient();
  const [allergies, appliances] = await Promise.all([
    supabase.from("allergies").select("id, name").order("id"),
    supabase.from("appliances").select("id, name").order("id"),
  ]);
  if (allergies.error) throw allergies.error;
  if (appliances.error) throw appliances.error;
  return { allergies: allergies.data, appliances: appliances.data };
}

// Creates a new recipe (no id) or updates one of the user's own recipes.
// Returns the recipe id.
export async function saveRecipe(
  input: RecipeInput,
  recipeId?: number,
): Promise<number> {
  const user = await requireUser();
  const supabase = await createClient();

  const row = {
    title: input.title,
    cuisine: input.cuisine,
    instructions: input.instructions,
    prep_minutes: input.prep_minutes,
    cook_minutes: input.cook_minutes,
    base_servings: input.base_servings,
    cost_bracket: input.cost_bracket,
    diet_tags: input.diet_tags,
  };

  let id: number;
  if (recipeId === undefined) {
    const { data, error } = await supabase
      .from("recipes")
      .insert({ ...row, source_type: "user", created_by_user_id: user.id })
      .select("id")
      .single();
    if (error) throw error;
    id = data.id;
  } else {
    const { data, error } = await supabase
      .from("recipes")
      .update(row)
      .eq("id", recipeId)
      .eq("created_by_user_id", user.id)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Recipe not found.");
    id = data.id;

    // Replace the recipe's links with the ones from the form.
    for (const table of [
      "recipe_ingredients",
      "recipe_allergen_tags",
      "recipe_appliances",
    ]) {
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .eq("recipe_id", id);
      if (deleteError) throw deleteError;
    }
  }

  const ingredientIds = await findOrCreateIngredients(
    input.ingredients.map((i) => i.name),
    user.id,
  );

  // The same ingredient can only be listed once per recipe: keep the first.
  const seen = new Set<number>();
  const ingredientRows = input.ingredients.flatMap((ingredient) => {
    const ingredientId = ingredientIds.get(ingredient.name.toLowerCase())!;
    if (seen.has(ingredientId)) return [];
    seen.add(ingredientId);
    return [
      {
        recipe_id: id,
        ingredient_id: ingredientId,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
      },
    ];
  });

  const inserts = [
    ingredientRows.length &&
      supabase.from("recipe_ingredients").insert(ingredientRows),
    input.allergenIds.length &&
      supabase
        .from("recipe_allergen_tags")
        .insert(input.allergenIds.map((allergy_id) => ({ recipe_id: id, allergy_id }))),
    input.applianceIds.length &&
      supabase
        .from("recipe_appliances")
        .insert(input.applianceIds.map((appliance_id) => ({ recipe_id: id, appliance_id }))),
  ];
  for (const result of await Promise.all(inserts)) {
    if (result && result.error) throw result.error;
  }

  return id;
}

// Maps each ingredient name (lowercased) to an ingredient id, reusing a
// shared or existing custom ingredient and creating custom ones for new names.
async function findOrCreateIngredients(
  names: string[],
  userId: string,
): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data: existing, error } = await supabase
    .from("ingredients")
    .select("id, name, created_by_user_id");
  if (error) throw error;

  const ids = new Map<string, number>();
  // Shared ingredients win over a user's custom one with the same name.
  for (const ingredient of [...existing].sort(
    (a, b) => Number(a.created_by_user_id !== null) - Number(b.created_by_user_id !== null),
  )) {
    const key = ingredient.name.toLowerCase();
    if (!ids.has(key)) ids.set(key, ingredient.id);
  }

  const missing = [
    ...new Map(
      names
        .filter((name) => !ids.has(name.toLowerCase()))
        .map((name) => [name.toLowerCase(), name]),
    ).values(),
  ];
  if (missing.length) {
    const { data: created, error: insertError } = await supabase
      .from("ingredients")
      .insert(
        missing.map((name) => ({
          name,
          is_custom: true,
          created_by_user_id: userId,
        })),
      )
      .select("id, name");
    if (insertError) throw insertError;
    for (const ingredient of created) {
      ids.set(ingredient.name.toLowerCase(), ingredient.id);
    }
  }

  return ids;
}

export async function deleteRecipe(recipeId: number): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("recipes")
    .delete()
    .eq("id", recipeId)
    .eq("created_by_user_id", user.id);
  if (error) throw error;
}
