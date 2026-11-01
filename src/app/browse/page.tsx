import type { Metadata } from "next";
import { listLibraryRecipes } from "@/lib/recipes";
import { getStarredIds } from "@/lib/stars";
import { setStarAction } from "../recipes/actions";
import { RecipeCard } from "../recipes/recipe-card";

export const metadata: Metadata = { title: "Browse · Recipes Made Easy" };

export default async function BrowsePage() {
  const [recipes, starredIds] = await Promise.all([listLibraryRecipes(), getStarredIds()]);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <div className="mb-8">
        <h1 className="mb-2 font-serif text-3xl">Browse recipes</h1>
        {recipes.length > 0 && (
          <p className="text-muted">
            {recipes.length} recipes to get you started. Star the ones you want to keep close.
          </p>
        )}
      </div>

      {recipes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white px-6 py-16 text-center">
          <p className="mb-2 font-serif text-xl">The recipe library is empty</p>
          <p className="text-muted">Recipes will show up here once they&apos;re added.</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <li key={recipe.id}>
              <RecipeCard
                recipe={recipe}
                starred={starredIds.has(recipe.id)}
                starAction={setStarAction.bind(null, recipe.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
