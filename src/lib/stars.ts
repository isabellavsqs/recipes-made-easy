import "server-only";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LIST_COLUMNS, listMyRecipes, toListItem, type RecipeListItem } from "@/lib/recipes";

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
export async function listStarredRecipes(): Promise<RecipeListItem[]> {
  return (await listStars()).map((star) => star.recipe);
}

// "All" in My Recipes: recipes I added plus recipes I starred, each once.
// Newest first: my own by when I added them, the others by when I starred them.
export async function listMyCookbook(): Promise<RecipeListItem[]> {
  const [mine, stars] = await Promise.all([listMyRecipes(), listStars()]);
  const added = new Map<number, { recipe: RecipeListItem; at: string }>();
  for (const star of stars) added.set(star.recipe.id, { recipe: star.recipe, at: star.starredAt });
  for (const recipe of mine) added.set(recipe.id, { recipe, at: recipe.created_at });
  return [...added.values()]
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .map((entry) => entry.recipe);
}

async function listStars(): Promise<{ starredAt: string; recipe: RecipeListItem }[]> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stars")
    .select(`starred_at, recipes (${LIST_COLUMNS})`)
    .eq("user_id", user.id)
    .order("starred_at", { ascending: false });
  if (error) throw error;

  // See getRecipe(): Supabase can't tell each star points to one recipe.
  return (data as unknown as { starred_at: string; recipes: unknown }[])
    .filter((star) => star.recipes !== null)
    .map((star) => ({ starredAt: star.starred_at, recipe: toListItem(star.recipes) }));
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
