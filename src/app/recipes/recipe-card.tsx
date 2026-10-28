import Link from "next/link";
import type { RecipeSummary } from "@/lib/recipes";
import { RecipeImage } from "./recipe-image";

export function totalMinutes(recipe: Pick<RecipeSummary, "prep_minutes" | "cook_minutes">) {
  if (recipe.prep_minutes === null && recipe.cook_minutes === null) return null;
  return (recipe.prep_minutes ?? 0) + (recipe.cook_minutes ?? 0);
}

export function RecipeCard({ recipe }: { recipe: RecipeSummary }) {
  const minutes = totalMinutes(recipe);

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="group block overflow-hidden rounded-2xl border border-line bg-white transition hover:border-primary hover:shadow-sm"
    >
      <RecipeImage recipe={recipe} className="h-36" />
      <div className="p-4">
        <h2 className="mb-1 font-serif text-lg leading-snug group-hover:text-primary">
          {recipe.title}
        </h2>
        <p className="text-sm text-muted">
          {[
            recipe.cuisine,
            minutes !== null && `${minutes} min`,
            recipe.cost_bracket,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    </Link>
  );
}
