import "server-only";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SUMMARY_COLUMNS, type RecipeSummary } from "@/lib/recipes";

// Stars live in one table for everyone: each row means "this user starred
// this recipe". Every query filters by the logged-in user (and RLS checks
// it again in the database).

// The ids of every recipe this user has starred.
export async function getStarredIds(): Promise<Set<number>> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stars")
    .select("recipe_id")
    .eq("user_id", user.id);
  if (error) throw error;
  return new Set(data.map((star) => star.recipe_id));
}

export async function isStarred(recipeId: number): Promise<boolean> {
  const user = await requireUser();
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("stars")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("recipe_id", recipeId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

// The "Starred" view: recipes this user starred, most recently starred first.
export async function listStarredRecipes(): Promise<RecipeSummary[]> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stars")
    .select(`starred_at, recipes (${SUMMARY_COLUMNS})`)
    .eq("user_id", user.id)
    .order("starred_at", { ascending: false });
  if (error) throw error;

  // See getRecipe(): Supabase can't tell each star points to one recipe.
  return (data as unknown as { recipes: RecipeSummary | null }[])
    .map((star) => star.recipes)
    .filter((recipe): recipe is RecipeSummary => recipe !== null);
}

// Starring twice does nothing (the pair user + recipe is unique).
// Returns false if the recipe doesn't exist or this user can't see it.
export async function starRecipe(recipeId: number): Promise<boolean> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("stars")
    .upsert(
      { user_id: user.id, recipe_id: recipeId },
      { onConflict: "user_id,recipe_id", ignoreDuplicates: true },
    );
  if (!error) return true;
  // 42501: blocked by RLS, 23503: no such recipe.
  if (error.code === "42501" || error.code === "23503") return false;
  throw error;
}

export async function unstarRecipe(recipeId: number): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("stars")
    .delete()
    .eq("user_id", user.id)
    .eq("recipe_id", recipeId);
  if (error) throw error;
}
