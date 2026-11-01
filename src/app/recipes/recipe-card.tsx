import Link from "next/link";
import type { RecipeSummary } from "@/lib/recipes";
import { RecipeImage } from "./recipe-image";
import { StarButton } from "./star-button";

export function totalMinutes(recipe: Pick<RecipeSummary, "prep_minutes" | "cook_minutes">) {
  if (recipe.prep_minutes === null && recipe.cook_minutes === null) return null;
  return (recipe.prep_minutes ?? 0) + (recipe.cook_minutes ?? 0);
}

export function RecipeCard({
  recipe,
  starred,
  starAction,
}: {
  recipe: RecipeSummary;
  starred: boolean;
  starAction: (star: boolean) => Promise<void>;
}) {
  const minutes = totalMinutes(recipe);

  // The star sits on top of the photo, outside the link, so clicking it
  // doesn't open the recipe.
  return (
    <div className="relative h-full">
      <Link
        href={`/recipes/${recipe.id}`}
        className="group block h-full overflow-hidden rounded-2xl border border-line bg-white transition hover:border-primary hover:shadow-sm"
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
      <div className="absolute right-3 top-3">
        <StarButton title={recipe.title} starred={starred} action={starAction} size="sm" />
      </div>
    </div>
  );
}
