import "server-only";
import { requireUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import type { Diet } from "@/lib/recipe-search";
import { createClient } from "@/lib/supabase/server";
import { suggestRecipes, type SuggestRecipe } from "@/lib/suggestion";

// Feature 10 on the server: loads the recipes the user may see (the library
// plus their own, via RLS) with ingredients, and runs the suggestion rules.
// The fridge list itself is never saved (PLAN.md §3 design note).

export type SuggestCard = SuggestRecipe & { image_url: string | null };

type Row = Omit<SuggestCard, "allergenIds" | "applianceIds" | "ingredients"> & {
  recipe_allergen_tags: { allergy_id: number }[];
  recipe_appliances: { appliance_id: number }[];
  recipe_ingredients: {
    quantity: number | null;
    ingredients: { name: string; is_staple: boolean; category: string | null };
  }[];
};

export async function getSuggestions(fridge: string[], canShop: boolean) {
  await requireUser();
  const supabase = await createClient();
  const [profile, { data, error }] = await Promise.all([
    getProfile(),
    supabase
      .from("recipes")
      .select(
        `id, title, cuisine, prep_minutes, cook_minutes, cost_bracket, diet_tags, image_url,
         recipe_allergen_tags (allergy_id), recipe_appliances (appliance_id),
         recipe_ingredients (quantity, ingredients (name, is_staple, category))`,
      )
      // Lists follow the recipe's own order.
      .order("position", { referencedTable: "recipe_ingredients" }),
  ]);
  if (error) throw error;

  // See getRecipe(): Supabase can't tell each link points to one row.
  const recipes: SuggestCard[] = (data as unknown as Row[]).map(
    ({ recipe_allergen_tags, recipe_appliances, recipe_ingredients, ...recipe }) => ({
      ...recipe,
      allergenIds: recipe_allergen_tags.map((t) => t.allergy_id),
      applianceIds: recipe_appliances.map((a) => a.appliance_id),
      ingredients: recipe_ingredients.map((ri) => ({
        name: ri.ingredients.name,
        quantity: ri.quantity,
        isStaple: ri.ingredients.is_staple,
        category: ri.ingredients.category,
      })),
    }),
  );

  return suggestRecipes(
    recipes,
    fridge,
    {
      diet: profile.diet as Diet | "none",
      allergyIds: profile.allergies.map((a) => a.id),
      applianceIds: profile.appliances.map((a) => a.id),
      dislikes: profile.dislikes,
      goals: profile.goals.map((g) => g.name),
    },
    canShop,
  );
}
