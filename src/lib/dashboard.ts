import "server-only";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { countByCuisine, type CuisineCount } from "@/lib/cuisine-count";

// Numbers for the dashboard (PLAN.md feature 7). Every count is filtered by
// the logged-in user, so nobody else's recipes, stars or plans are counted.
export type DashboardStats = {
  myRecipes: number;
  starred: number;
  mealPlans: number;
  byCuisine: CuisineCount[];
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const user = await requireUser();
  const supabase = await createClient();

  const [mine, stars, plans] = await Promise.all([
    supabase.from("recipes").select("id, cuisine").eq("created_by_user_id", user.id),
    supabase.from("stars").select("recipe_id, recipes (id, cuisine)").eq("user_id", user.id),
    supabase.from("meal_plans").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);
  if (mine.error) throw mine.error;
  if (stars.error) throw stars.error;
  if (plans.error) throw plans.error;

  // The chart covers "my cookbook": recipes I added plus recipes I starred,
  // each counted once (a starred recipe of my own isn't counted twice).
  const starredRecipes = (stars.data as unknown as { recipes: { id: number; cuisine: string | null } | null }[])
    .map((star) => star.recipes)
    .filter((recipe) => recipe !== null);
  const cookbook = new Map<number, string | null>();
  for (const recipe of [...mine.data, ...starredRecipes]) cookbook.set(recipe.id, recipe.cuisine);

  return {
    myRecipes: mine.data.length,
    starred: stars.data.length,
    mealPlans: plans.count ?? 0,
    byCuisine: countByCuisine([...cookbook.values()]),
  };
}
