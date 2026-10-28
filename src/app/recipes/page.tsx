import type { Metadata } from "next";
import Link from "next/link";
import { listMyRecipes } from "@/lib/recipes";
import { RecipeCard } from "./recipe-card";

export const metadata: Metadata = { title: "My Recipes · Recipes Made Easy" };

export default async function MyRecipesPage() {
  const recipes = await listMyRecipes();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-3xl">My Recipes</h1>
        <Link
          href="/recipes/new"
          className="rounded-full bg-primary px-5 py-2.5 font-medium text-white transition hover:bg-primary-dark"
        >
          + Add recipe
        </Link>
      </div>

      {recipes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white px-6 py-16 text-center">
          <p className="mb-2 font-serif text-xl">No recipes yet</p>
          <p className="mb-6 text-muted">
            Add a recipe you love cooking and it will show up here.
          </p>
          <Link
            href="/recipes/new"
            className="rounded-full bg-primary px-5 py-2.5 font-medium text-white transition hover:bg-primary-dark"
          >
            Add your first recipe
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <li key={recipe.id}>
              <RecipeCard recipe={recipe} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
